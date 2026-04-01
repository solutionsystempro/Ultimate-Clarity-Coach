# Design: Replace Clerk with Supabase Auth

**Date:** 2026-03-31  
**Status:** Approved

## Summary

Replace Clerk authentication with Supabase Auth across the entire app. The user already has Supabase configured with Google OAuth and is familiar with Supabase Auth from other projects. This eliminates a second paid service, removes production complexity, and consolidates auth + database into one platform.

## Auth Pages

Both `/sign-in` and `/sign-up` render a single custom auth component styled to match the DM Framework Lead Magnet design:

- Tabbed UI: **"Create Account"** (default) | **"Sign In"**
- Google OAuth button at top: `supabase.auth.signInWithOAuth({ provider: 'google' })`
- `or` divider
- Email + password fields
- Inline error display
- Dark theme: `#08080B` bg, `#00C853` accent, `#0F0F14` card surface

The `/sign-up` route renders the same component with the "Create Account" tab pre-selected. The `/sign-in` route renders it with "Sign In" pre-selected.

## Auth Flow

1. User hits a protected route
2. Middleware checks for a valid Supabase session cookie
3. No session → redirect to `/sign-in`
4. User authenticates (Google OAuth or email/password)
5. Supabase sets a session cookie
6. User is redirected to `/coach`
7. All subsequent API requests extract `user.id` from the session cookie

## Dependencies

- **Add:** `@supabase/ssr` — Next.js App Router SSR helpers (server clients, middleware utilities)
- **Remove:** `@clerk/nextjs` — uninstalled after migration
- **Existing:** `@supabase/supabase-js` — already installed, no version change

## Middleware (`src/proxy.ts`)

Replace Clerk middleware with Supabase SSR middleware:
- Creates a Supabase server client from request/response cookies
- Calls `supabase.auth.getUser()` to validate the session
- Refreshes the session token on every request (handles token expiry automatically)
- Redirects unauthenticated requests to `/sign-in` for protected routes
- Protected routes: `/coach`, `/profile`, `/api/chat`, `/api/conversations`, `/api/profile`, `/api/user`

## Layout (`src/app/layout.tsx`)

Remove `<ClerkProvider>` wrapper. No replacement provider needed — Supabase Auth is stateless via cookies on the server; browser clients are created per-component.

## API Routes

All 6 API route files that currently call `auth()` from `@clerk/nextjs/server` will be updated to:

```ts
// New pattern for all API routes
const supabase = createAuthClient(req)  // new helper
const { data: { user } } = await supabase.auth.getUser()
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
const userId = user.id
```

`createAuthClient(req)` is a new helper in `src/lib/supabase/server.ts` that creates a Supabase client reading cookies from the incoming `NextRequest`.

Files updated: `api/chat`, `api/user`, `api/conversations`, `api/profile`, `api/admin`, `api/stripe/checkout`

## Stripe Integration

Two changes in the Stripe files:

1. **`api/stripe/checkout/route.ts`**: Replace `currentUser()` (Clerk) with `user.email` from Supabase session. Replace `clerk_user_id` metadata key with `supabase_user_id`.

2. **`api/webhook/stripe/route.ts`**: Read `supabase_user_id` from subscription metadata instead of `clerk_user_id`. Logic is otherwise identical.

## Client Components (`src/app/coach/page.tsx`)

Replace `useUser()` and `useClerk()` from `@clerk/nextjs` with a Supabase browser client:
- `supabase.auth.getUser()` for current user data
- `supabase.auth.signOut()` for logout
- `supabase.auth.onAuthStateChange()` for reactive session state

## `src/lib/supabase/server.ts`

Add a new exported function `createAuthClient(req: NextRequest)` that creates a Supabase server client reading the session from request cookies. Existing `createServiceClient()` and `createKnowledgeBaseClient()` are unchanged.

## Schema

No SQL migration required. `users.id text primary key` already accepts UUID strings (Supabase Auth user IDs are UUIDs serialized as strings). Update the inline comment in `supabase/schema.sql` from `-- Clerk user ID` to `-- Supabase Auth user ID`.

## Files Changed

| File | Change |
|------|--------|
| `src/proxy.ts` | Replace Clerk middleware → Supabase SSR session middleware |
| `src/app/layout.tsx` | Remove `<ClerkProvider>` |
| `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx` | Replace `<SignIn>` → custom tabbed auth form |
| `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx` | Redirect to `/sign-in` or render same form with signup tab |
| `src/app/coach/page.tsx` | Replace `useUser`/`useClerk` → Supabase browser client |
| `src/app/api/chat/route.ts` | Replace `auth()` → `createAuthClient(req).auth.getUser()` |
| `src/app/api/user/route.ts` | Replace `auth()`/`currentUser()` → Supabase session |
| `src/app/api/conversations/route.ts` | Replace `auth()` → Supabase session |
| `src/app/api/profile/route.ts` | Replace `auth()` → Supabase session |
| `src/app/api/admin/route.ts` | Replace `auth()` → Supabase session |
| `src/app/api/stripe/checkout/route.ts` | Replace Clerk auth + rename metadata key |
| `src/app/api/webhook/stripe/route.ts` | Rename `clerk_user_id` → `supabase_user_id` |
| `src/lib/supabase/server.ts` | Add `createAuthClient(req)` helper |
| `supabase/schema.sql` | Update comment only |

## Out of Scope

- RLS policy updates (service role bypasses RLS; existing policies remain but are not enforced server-side)
- Email verification flow (Supabase default behavior handles this)
- Password reset flow (Supabase handles this via magic link by default)
