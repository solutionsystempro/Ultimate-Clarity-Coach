# Clerk → Supabase Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Clerk authentication with Supabase Auth (Google OAuth + email/password) across the entire app.

**Architecture:** Supabase SSR middleware validates sessions via cookies on every request. API routes use a new `createAuthClient(req)` helper to extract the authenticated user. A custom tabbed auth page (matching DM Framework style) replaces the Clerk `<SignIn>` / `<SignUp>` components.

**Tech Stack:** `@supabase/ssr` (already installed), `@supabase/supabase-js` (already installed), Next.js App Router, TypeScript.

> **Node.js PATH note:** All `npm` commands must be prefixed with `export PATH="/c/Program Files/nodejs:$PATH" &&`

---

## File Map

| File | Action |
|------|--------|
| `src/lib/supabase/server.ts` | Add `createAuthClient(req)` helper |
| `src/app/auth/callback/route.ts` | **Create** — OAuth code exchange handler |
| `src/proxy.ts` | Replace Clerk middleware → Supabase SSR middleware |
| `src/app/layout.tsx` | Remove `<ClerkProvider>` |
| `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx` | Replace `<SignIn>` → custom tabbed auth form |
| `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx` | Replace `<SignUp>` → redirect to sign-in |
| `src/app/coach/page.tsx` | Replace `useUser`/`useClerk` → Supabase browser client |
| `src/app/api/user/route.ts` | Replace Clerk auth |
| `src/app/api/chat/route.ts` | Replace Clerk auth |
| `src/app/api/conversations/route.ts` | Replace Clerk auth |
| `src/app/api/conversations/[id]/route.ts` | Replace Clerk auth |
| `src/app/api/profile/route.ts` | Replace Clerk auth |
| `src/app/api/admin/route.ts` | Replace Clerk auth |
| `src/app/api/stripe/checkout/route.ts` | Replace Clerk auth + rename metadata key |
| `src/app/api/webhook/stripe/route.ts` | Rename `clerk_user_id` → `supabase_user_id` |
| `supabase/schema.sql` | Update comment only |
| `.env.local` | Remove Clerk vars |

---

## Task 1: Add `createAuthClient` helper

**Files:**
- Modify: `src/lib/supabase/server.ts`

This helper creates a Supabase anon client from a `NextRequest`'s cookies. All API routes use it to call `getUser()` and verify the session. The existing `createServiceClient()` is unchanged (still used for DB operations).

- [ ] **Step 1: Add the helper function**

Open `src/lib/supabase/server.ts` and add this import and export at the end of the file (after the existing exports):

```ts
import { NextRequest } from 'next/server'
```

Add to end of file:

```ts
export function createAuthClient(request: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll() {
          // Session refresh is handled by middleware; API routes are read-only
        },
      },
    }
  )
}
```

Final file should look like:

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

export function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}

export function createKnowledgeBaseClient() {
  return createServerClient(
    process.env.KNOWLEDGE_BASE_SUPABASE_URL!,
    process.env.KNOWLEDGE_BASE_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}

export function createAuthClient(request: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll() {
          // Session refresh is handled by middleware; API routes are read-only
        },
      },
    }
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd "c:/Users/ensan/Dev/Ultimate Business Clarity Coach" && git add src/lib/supabase/server.ts && git commit -m "feat: add createAuthClient helper for API route auth"
```

---

## Task 2: Create OAuth callback route

**Files:**
- Create: `src/app/auth/callback/route.ts`

Google OAuth redirects back to this route after authentication. It exchanges the one-time `code` for a Supabase session, sets the session cookie, then redirects to `/coach`.

- [ ] **Step 1: Create the callback route**

Create `src/app/auth/callback/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/coach'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/sign-in?error=oauth_failed`)
}
```

- [ ] **Step 2: Commit**

```bash
cd "c:/Users/ensan/Dev/Ultimate Business Clarity Coach" && git add src/app/auth/callback/route.ts && git commit -m "feat: add Supabase OAuth callback route"
```

---

## Task 3: Replace middleware

**Files:**
- Modify: `src/proxy.ts`

Replace Clerk middleware with Supabase SSR middleware. It refreshes the session token on every request (critical for keeping sessions alive) and redirects unauthenticated users away from protected routes.

- [ ] **Step 1: Replace proxy.ts entirely**

```ts
import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

const protectedRoutes = [
  '/coach',
  '/profile',
  '/api/chat',
  '/api/conversations',
  '/api/profile',
  '/api/user',
]

export default async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — must be called before any redirects
  const { data: { user } } = await supabase.auth.getUser()

  const isProtected = protectedRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  )

  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/sign-in'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
```

- [ ] **Step 2: Commit**

```bash
cd "c:/Users/ensan/Dev/Ultimate Business Clarity Coach" && git add src/proxy.ts && git commit -m "feat: replace Clerk middleware with Supabase SSR session middleware"
```

---

## Task 4: Remove ClerkProvider from layout

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Update layout.tsx**

```tsx
import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' })

export const metadata: Metadata = {
  title: 'Ultimate Business Clarity Coach',
  description: 'Elite AI business coaching powered by $30,000 worth of proven frameworks. Get clear, get focused, get paid.',
  openGraph: {
    title: 'Ultimate Business Clarity Coach',
    description: 'Elite AI business coaching — get the clarity that took others $30,000 to find.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased bg-[#08080B] text-[#EFEFEF]">
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#0F0F14',
              color: '#EFEFEF',
              border: '1px solid #1F1F28',
              fontSize: '13px'
            },
          }}
        />
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd "c:/Users/ensan/Dev/Ultimate Business Clarity Coach" && git add src/app/layout.tsx && git commit -m "feat: remove ClerkProvider from layout"
```

---

## Task 5: Replace sign-in page

**Files:**
- Modify: `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx`

Custom tabbed auth form matching DM Framework style: Google OAuth button → `or` divider → email/password form with "Create Account" / "Sign In" tabs.

- [ ] **Step 1: Replace sign-in page entirely**

```tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AuthPage({ searchParams }: { searchParams: { tab?: string; error?: string } }) {
  const [tab, setTab] = useState<'signup' | 'signin'>(
    searchParams?.tab === 'signin' ? 'signin' : 'signup'
  )
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(searchParams?.error === 'oauth_failed' ? 'OAuth sign-in failed. Please try again.' : '')
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  async function handleGoogle() {
    setError('')
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  async function handleEmailAuth() {
    setError('')
    setLoading(true)
    if (tab === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
      } else {
        setError('')
        // Show confirmation message
        setError('Check your email to confirm your account, then sign in.')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
      } else {
        window.location.href = '/coach'
      }
    }
    setLoading(false)
  }

  const heading = tab === 'signup' ? 'Create your free account' : 'Welcome back'
  const subheading = tab === 'signup'
    ? 'Your coach will remember your business, your goals, and every session.'
    : 'Your coach remembers everything. Pick up right where you left off.'

  return (
    <div style={{ minHeight: '100vh', background: '#08080B', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center top, rgba(0,200,83,0.10) 0%, transparent 60%)', pointerEvents: 'none' }} />
      <div style={{ width: '100%', maxWidth: 440, position: 'relative' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#00C853', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#000', fontWeight: 900, fontSize: 14 }}>B</span>
            </div>
            <span style={{ fontWeight: 700, fontSize: 16, color: '#EFEFEF', letterSpacing: '-.02em' }}>Business Clarity Coach</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-.03em', color: '#EFEFEF', margin: '0 0 8px' }}>{heading}</h1>
          <p style={{ color: '#7A7A8C', fontSize: 14, margin: 0, lineHeight: 1.6 }}>{subheading}</p>
        </div>

        {/* Card */}
        <div style={{ background: '#0F0F14', border: '1px solid #1F1F28', borderRadius: 20, padding: '28px 28px 24px', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>

          {/* Tabs */}
          <div style={{ display: 'flex', marginBottom: 24, border: '1px solid #1F1F28', borderRadius: 10, overflow: 'hidden' }}>
            <button
              onClick={() => { setTab('signup'); setError('') }}
              style={{ flex: 1, padding: '11px', background: tab === 'signup' ? '#00C853' : 'transparent', border: 'none', color: tab === 'signup' ? '#000' : '#7A7A8C', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}
            >
              Create Account
            </button>
            <button
              onClick={() => { setTab('signin'); setError('') }}
              style={{ flex: 1, padding: '11px', background: tab === 'signin' ? '#00C853' : 'transparent', border: 'none', color: tab === 'signin' ? '#000' : '#7A7A8C', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s' }}
            >
              Sign In
            </button>
          </div>

          {/* Google */}
          <button
            onClick={handleGoogle}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '12px', background: '#16161E', border: '1px solid #1F1F28', borderRadius: 10, color: '#EFEFEF', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 16, transition: 'border-color .15s' }}
            onMouseOver={e => (e.currentTarget.style.borderColor = 'rgba(0,200,83,0.4)')}
            onMouseOut={e => (e.currentTarget.style.borderColor = '#1F1F28')}
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.962L3.964 6.294C4.672 4.169 6.656 3.58 9 3.58z"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, color: '#7A7A8C', fontSize: 13 }}>
            <div style={{ flex: 1, height: 1, background: '#1F1F28' }} />
            or
            <div style={{ flex: 1, height: 1, background: '#1F1F28' }} />
          </div>

          {/* Email + Password */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              style={{ width: '100%', padding: '12px 14px', background: '#08080B', border: '1px solid #1F1F28', borderRadius: 10, color: '#EFEFEF', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', transition: 'border-color .15s' }}
              onFocus={e => (e.target.style.borderColor = 'rgba(0,200,83,0.5)')}
              onBlur={e => (e.target.style.borderColor = '#1F1F28')}
            />
            <input
              type="password"
              placeholder={tab === 'signup' ? 'Password (min 6 characters)' : 'Password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
              onKeyDown={e => e.key === 'Enter' && handleEmailAuth()}
              style={{ width: '100%', padding: '12px 14px', background: '#08080B', border: '1px solid #1F1F28', borderRadius: 10, color: '#EFEFEF', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', transition: 'border-color .15s' }}
              onFocus={e => (e.target.style.borderColor = 'rgba(0,200,83,0.5)')}
              onBlur={e => (e.target.style.borderColor = '#1F1F28')}
            />

            {error && (
              <p style={{ fontSize: 13, color: error.includes('Check your email') ? '#00C853' : '#FF3B30', margin: 0 }}>{error}</p>
            )}

            <button
              onClick={handleEmailAuth}
              disabled={loading}
              style={{ width: '100%', padding: '13px', background: '#00C853', border: 'none', borderRadius: 10, color: '#000', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: loading ? 0.7 : 1, transition: 'opacity .15s' }}
            >
              {loading ? 'Please wait...' : tab === 'signup' ? 'Create Account →' : 'Sign In →'}
            </button>
          </div>

          <p style={{ fontSize: 12, color: '#7A7A8C', marginTop: 16, marginBottom: 0, textAlign: 'center' }}>
            No spam. Your data stays private.
          </p>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd "c:/Users/ensan/Dev/Ultimate Business Clarity Coach" && git add "src/app/(auth)/sign-in/[[...sign-in]]/page.tsx" && git commit -m "feat: replace Clerk SignIn with custom Supabase auth form"
```

---

## Task 6: Replace sign-up page

**Files:**
- Modify: `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx`

Sign-up redirects to the sign-in page with the "Create Account" tab active. The tabbed auth form handles both flows.

- [ ] **Step 1: Replace sign-up page**

```tsx
import { redirect } from 'next/navigation'

export default function SignUpPage() {
  redirect('/sign-in')
}
```

- [ ] **Step 2: Commit**

```bash
cd "c:/Users/ensan/Dev/Ultimate Business Clarity Coach" && git add "src/app/(auth)/sign-up/[[...sign-up]]/page.tsx" && git commit -m "feat: redirect sign-up to unified auth page"
```

---

## Task 7: Update API routes — auth pattern

**Files:**
- Modify: `src/app/api/user/route.ts`
- Modify: `src/app/api/chat/route.ts`
- Modify: `src/app/api/conversations/route.ts`
- Modify: `src/app/api/conversations/[id]/route.ts`
- Modify: `src/app/api/profile/route.ts`
- Modify: `src/app/api/admin/route.ts`

Replace `import { auth } from '@clerk/nextjs/server'` + `const { userId } = await auth()` with `createAuthClient(req)` + `getUser()` in all 6 files.

- [ ] **Step 1: Update `src/app/api/user/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createAuthClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabaseAuth = createAuthClient(req)
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()

  const { data } = await supabase
    .from('users')
    .upsert(
      {
        id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.full_name || '',
      },
      { onConflict: 'id' }
    )
    .select()
    .single()

  return NextResponse.json(data)
}
```

- [ ] **Step 2: Update `src/app/api/chat/route.ts`**

Replace lines 1-3 (the Clerk import and auth() call pattern):

```ts
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createAuthClient, createServiceClient } from '@/lib/supabase/server'
import { retrieveContext, buildSystemPrompt } from '@/lib/rag'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const FREE_DAILY_LIMIT = 5

export async function POST(req: NextRequest) {
  try {
    const supabaseAuth = createAuthClient(req)
    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = user.id
```

Then keep the rest of the file unchanged from `const { messages, conversationId, mentor } = await req.json()` onwards, replacing all `userId` references (they already use `userId` as the variable name so no further changes needed in the body).

Full updated file:

```ts
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createAuthClient, createServiceClient } from '@/lib/supabase/server'
import { retrieveContext, buildSystemPrompt } from '@/lib/rag'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const FREE_DAILY_LIMIT = 5

export async function POST(req: NextRequest) {
  try {
    const supabaseAuth = createAuthClient(req)
    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = user.id

    const { messages, conversationId, mentor } = await req.json()
    const supabase = createServiceClient()

    // Get or create user record
    let { data: dbUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (!dbUser) {
      const { data: newUser } = await supabase
        .from('users')
        .insert({ id: userId, email: user.email || '' })
        .select()
        .single()
      dbUser = newUser
    }

    // Check daily message limit for free users
    if (dbUser?.plan === 'free') {
      const today = new Date().toDateString()
      const resetDate = new Date(dbUser.messages_reset_at).toDateString()

      if (today !== resetDate) {
        await supabase
          .from('users')
          .update({ messages_used_today: 0, messages_reset_at: new Date().toISOString() })
          .eq('id', userId)
        dbUser.messages_used_today = 0
      }

      if (dbUser.messages_used_today >= FREE_DAILY_LIMIT) {
        return NextResponse.json(
          { error: 'Daily limit reached. Upgrade to Premium for unlimited coaching.' },
          { status: 429 }
        )
      }
    }

    const lastUserMessage = messages[messages.length - 1]?.content || ''

    // Get business profile for personalized coaching
    const { data: profile } = await supabase
      .from('business_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    // RAG: retrieve relevant knowledge base chunks
    const context = await retrieveContext(lastUserMessage)
    const systemPrompt = buildSystemPrompt(context, mentor || 'standard', profile || undefined)

    // Stream response from Claude
    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: systemPrompt,
      messages: messages.slice(-20),
    })

    // Save user message to DB
    if (conversationId) {
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content: lastUserMessage,
        sources: context.map(c => ({ id: c.id, source_file: c.source_file, similarity: c.similarity })),
      })
    }

    // Increment usage counter for free users
    if (dbUser?.plan === 'free') {
      await supabase
        .from('users')
        .update({ messages_used_today: (dbUser.messages_used_today || 0) + 1 })
        .eq('id', userId)
    }

    // Return streaming response
    const textStream = new ReadableStream({
      async start(controller) {
        let fullResponse = ''
        for await (const chunk of stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            const text = chunk.delta.text
            fullResponse += text
            controller.enqueue(new TextEncoder().encode(text))
          }
        }

        // Save assistant message to DB
        if (conversationId) {
          await supabase.from('messages').insert({
            conversation_id: conversationId,
            role: 'assistant',
            content: fullResponse,
          })
        }

        controller.close()
      },
    })

    return new Response(textStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 3: Update `src/app/api/conversations/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createAuthClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabaseAuth = createAuthClient(req)
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = user.id

  const supabase = createServiceClient()
  const { data } = await supabase
    .from('conversations')
    .select('*, messages(count)')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(50)

  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  const supabaseAuth = createAuthClient(req)
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = user.id

  const { title } = await req.json()
  const supabase = createServiceClient()

  // Ensure user exists
  await supabase
    .from('users')
    .upsert({ id: userId, email: user.email || '' }, { onConflict: 'id', ignoreDuplicates: true })

  const { data } = await supabase
    .from('conversations')
    .insert({ user_id: userId, title: title || 'New Conversation' })
    .select()
    .single()

  return NextResponse.json(data)
}
```

- [ ] **Step 4: Update `src/app/api/conversations/[id]/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createAuthClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabaseAuth = createAuthClient(req)
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const supabase = createServiceClient()

  const { data } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })

  return NextResponse.json(data || [])
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabaseAuth = createAuthClient(req)
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = user.id

  const { id } = await params
  const supabase = createServiceClient()

  await supabase
    .from('conversations')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 5: Update `src/app/api/profile/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createAuthClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabaseAuth = createAuthClient(req)
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const { data } = await supabase
    .from('business_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return NextResponse.json(data || null)
}

export async function POST(req: NextRequest) {
  const supabaseAuth = createAuthClient(req)
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const supabase = createServiceClient()

  const { data } = await supabase
    .from('business_profiles')
    .upsert({ ...body, user_id: user.id, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    .select()
    .single()

  return NextResponse.json(data)
}
```

- [ ] **Step 6: Update `src/app/api/admin/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createAuthClient, createServiceClient } from '@/lib/supabase/server'

const ADMIN_USER_ID = process.env.ADMIN_USER_ID

export async function GET(req: NextRequest) {
  const supabaseAuth = createAuthClient(req)
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (ADMIN_USER_ID && user.id !== ADMIN_USER_ID) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = createServiceClient()

  const { count: totalUsers } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })

  const { count: totalConversations } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })

  const { count: totalMessages } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })

  const { data: recentConversations } = await supabase
    .from('conversations')
    .select(`id, title, created_at, updated_at, user_id, messages(count)`)
    .order('updated_at', { ascending: false })
    .limit(50)

  const { data: recentMessages } = await supabase
    .from('messages')
    .select(`id, content, role, created_at, conversation_id`)
    .eq('role', 'user')
    .order('created_at', { ascending: false })
    .limit(100)

  const { data: profiles } = await supabase
    .from('business_profiles')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(50)

  const { data: users } = await supabase
    .from('users')
    .select('id, email, full_name, plan, created_at, messages_used_today')
    .order('created_at', { ascending: false })
    .limit(50)

  return NextResponse.json({
    stats: {
      totalUsers: totalUsers || 0,
      totalConversations: totalConversations || 0,
      totalMessages: totalMessages || 0,
    },
    recentConversations: recentConversations || [],
    recentMessages: recentMessages || [],
    profiles: profiles || [],
    users: users || [],
  })
}
```

- [ ] **Step 7: Commit all API route changes**

```bash
cd "c:/Users/ensan/Dev/Ultimate Business Clarity Coach" && git add src/app/api/user/route.ts src/app/api/chat/route.ts src/app/api/conversations/route.ts "src/app/api/conversations/[id]/route.ts" src/app/api/profile/route.ts src/app/api/admin/route.ts && git commit -m "feat: replace Clerk auth with Supabase auth in all API routes"
```

---

## Task 8: Update Stripe routes

**Files:**
- Modify: `src/app/api/stripe/checkout/route.ts`
- Modify: `src/app/api/webhook/stripe/route.ts`

Replace Clerk auth and rename the metadata key from `clerk_user_id` to `supabase_user_id`.

- [ ] **Step 1: Update `src/app/api/stripe/checkout/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createAuthClient, createServiceClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  const supabaseAuth = createAuthClient(req)
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const email = user.email || ''
  const supabase = createServiceClient()

  const { data: dbUser } = await supabase
    .from('users')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()

  let customerId = dbUser?.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({ email, metadata: { supabase_user_id: user.id } })
    customerId = customer.id
    await supabase.from('users').update({ stripe_customer_id: customerId }).eq('id', user.id)
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: process.env.STRIPE_PREMIUM_PRICE_ID!, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/coach?upgraded=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/coach`,
    subscription_data: { metadata: { supabase_user_id: user.id } },
  })

  return NextResponse.json({ url: session.url })
}
```

- [ ] **Step 2: Update `src/app/api/webhook/stripe/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createServiceClient()

  if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as { status: string; metadata: { supabase_user_id?: string }; customer: string; id: string }
    const userId = subscription.metadata?.supabase_user_id

    if (userId) {
      await supabase.from('users').update({
        plan: subscription.status === 'active' ? 'premium' : 'free',
        stripe_subscription_id: subscription.id,
        subscription_status: subscription.status,
      }).eq('id', userId)
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as { metadata: { supabase_user_id?: string }; id: string }
    const userId = subscription.metadata?.supabase_user_id

    if (userId) {
      await supabase.from('users').update({
        plan: 'free',
        subscription_status: 'canceled',
        stripe_subscription_id: null,
      }).eq('id', userId)
    }
  }

  return NextResponse.json({ received: true })
}
```

- [ ] **Step 3: Commit**

```bash
cd "c:/Users/ensan/Dev/Ultimate Business Clarity Coach" && git add src/app/api/stripe/checkout/route.ts src/app/api/webhook/stripe/route.ts && git commit -m "feat: replace Clerk auth in Stripe routes, rename clerk_user_id to supabase_user_id"
```

---

## Task 9: Update coach page client auth

**Files:**
- Modify: `src/app/coach/page.tsx`

Replace `useUser` and `useClerk` from `@clerk/nextjs` with Supabase browser client. The `user` object shape changes: `user.firstName` → `user.user_metadata?.full_name`, `user.emailAddresses[0].emailAddress` → `user.email`.

- [ ] **Step 1: Remove Clerk imports (lines 4 and 14)**

Remove:
```ts
import { useUser } from '@clerk/nextjs'
import { useClerk } from '@clerk/nextjs'
```

Add at top of file (after existing imports):
```ts
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
```

- [ ] **Step 2: Replace hook declarations (lines 166-167)**

Remove:
```ts
const { user } = useUser()
const { signOut } = useClerk()
```

Replace with:
```ts
const [user, setUser] = useState<User | null>(null)
const supabase = createClient()

useEffect(() => {
  supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
}, [])

async function handleSignOut() {
  await supabase.auth.signOut()
  window.location.href = '/sign-in'
}
```

- [ ] **Step 3: Fix user display (line 416)**

Remove:
```tsx
<span className="text-xs truncate flex-1">{user?.firstName || user?.emailAddresses[0]?.emailAddress}</span>
<button onClick={() => signOut()} title="Sign out">
```

Replace with:
```tsx
<span className="text-xs truncate flex-1">{user?.user_metadata?.full_name || user?.email}</span>
<button onClick={handleSignOut} title="Sign out">
```

- [ ] **Step 4: Commit**

```bash
cd "c:/Users/ensan/Dev/Ultimate Business Clarity Coach" && git add src/app/coach/page.tsx && git commit -m "feat: replace Clerk hooks with Supabase auth in coach page"
```

---

## Task 10: Update schema comment and env vars

**Files:**
- Modify: `supabase/schema.sql`
- Modify: `.env.local`

- [ ] **Step 1: Update schema.sql comment**

In `supabase/schema.sql` line 43, change:
```sql
  id text primary key, -- Clerk user ID
```
to:
```sql
  id text primary key, -- Supabase Auth user ID
```

- [ ] **Step 2: Remove Clerk vars from .env.local**

Remove these 6 lines from `.env.local`:
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/coach
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/coach
```

The file should now only contain Supabase, Anthropic, OpenAI, Stripe, and App vars.

- [ ] **Step 3: Commit**

```bash
cd "c:/Users/ensan/Dev/Ultimate Business Clarity Coach" && git add supabase/schema.sql .env.local && git commit -m "chore: remove Clerk env vars, update schema comment"
```

---

## Task 11: Uninstall Clerk

**Files:**
- Modify: `package.json` (via npm)

- [ ] **Step 1: Uninstall @clerk/nextjs**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && cd "c:/Users/ensan/Dev/Ultimate Business Clarity Coach" && npm uninstall @clerk/nextjs
```

Expected: package removed from `node_modules` and `package.json`.

- [ ] **Step 2: Commit**

```bash
cd "c:/Users/ensan/Dev/Ultimate Business Clarity Coach" && git add package.json package-lock.json && git commit -m "chore: uninstall @clerk/nextjs"
```

---

## Task 12: Verify the build

- [ ] **Step 1: Run the dev server**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && cd "c:/Users/ensan/Dev/Ultimate Business Clarity Coach" && npm run dev
```

Expected: Server starts on `http://localhost:3000` with no TypeScript errors.

- [ ] **Step 2: Test auth flow manually**

1. Open `http://localhost:3000` — landing page loads
2. Click sign-in / go to `/coach` — redirects to `/sign-in`
3. Click "Continue with Google" — redirects to Google OAuth
4. After Google auth — redirects to `/coach` and user is logged in
5. Test email signup: enter email + password → "Check your email" message appears
6. Test email sign-in: enter credentials → redirects to `/coach`
7. Test sign-out: click logout button → redirects to `/sign-in`

- [ ] **Step 3: Push to GitHub**

```bash
cd "c:/Users/ensan/Dev/Ultimate Business Clarity Coach" && git push
```

---

## Post-Deploy Note

After deploying to Vercel, you'll need to add the OAuth callback URL to your Supabase project:

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add to **Redirect URLs**: `https://your-app.vercel.app/auth/callback`
3. Also add `http://localhost:3000/auth/callback` for local dev

The `ADMIN_USER_ID` env var will need to be set to your Supabase Auth UUID (find it in Supabase Dashboard → Authentication → Users after you first sign in).
