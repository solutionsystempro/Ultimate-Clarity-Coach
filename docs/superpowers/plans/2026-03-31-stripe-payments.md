# Stripe Payments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up Stripe checkout and webhooks so users can upgrade to Premium ($97/mo), with plan status enforced in the chat API.

**Architecture:** Stripe Checkout hosted page handles payment. A webhook at `/api/webhook/stripe` listens for subscription events and updates the `users` table in Supabase. The chat API already checks `user.plan === 'free'` for rate limiting — once the webhook sets `plan = 'premium'`, unlimited access is unlocked automatically.

**Tech Stack:** Stripe Node SDK (`stripe`), Next.js App Router API routes, Supabase service role client, Clerk auth, existing `users` table.

---

## Files

| File | Action | Responsibility |
|------|--------|----------------|
| `src/app/api/stripe/checkout/route.ts` | Create | Create Stripe Checkout session, return URL |
| `src/app/api/webhook/stripe/route.ts` | Create | Handle Stripe webhook events, update user plan |
| `src/lib/stripe.ts` | Create | Stripe client singleton |
| `src/app/coach/page.tsx` | Modify | Add upgrade banner when free user hits limit |
| `.env.local` | Modify | Confirm all Stripe keys are present |

---

### Task 1: Verify Stripe keys in .env.local

**Files:**
- Modify: `.env.local`

- [ ] **Step 1: Confirm these four keys exist in `.env.local`**

```
STRIPE_SECRET_KEY=sk_test_51Nq2G9...
STRIPE_WEBHOOK_SECRET=whsec_...        ← needs real value from Stripe dashboard
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51Nq2G9...
STRIPE_PREMIUM_PRICE_ID=price_1TH88t...
```

`STRIPE_WEBHOOK_SECRET` is currently `your_stripe_webhook_secret` — this must be replaced before webhooks work. Get it from: Stripe Dashboard → Developers → Webhooks → Add endpoint → copy the signing secret.

For local testing use Stripe CLI:
```bash
stripe listen --forward-to localhost:3000/api/webhook/stripe
```
The CLI prints the webhook secret — paste it into `.env.local` as `STRIPE_WEBHOOK_SECRET`.

- [ ] **Step 2: Install Stripe SDK if not present**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && cd "/c/Users/ensan/Dev/Ultimate Business Clarity Coach" && npm list stripe
```

If not listed, install:
```bash
npm install stripe
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add stripe dependency"
```

---

### Task 2: Create Stripe client singleton

**Files:**
- Create: `src/lib/stripe.ts`

- [ ] **Step 1: Create the file**

```typescript
import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})
```

- [ ] **Step 2: Verify it compiles**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && cd "/c/Users/ensan/Dev/Ultimate Business Clarity Coach" && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors referencing `src/lib/stripe.ts`

- [ ] **Step 3: Commit**

```bash
git add src/lib/stripe.ts
git commit -m "feat: add stripe client singleton"
```

---

### Task 3: Create Stripe Checkout session API route

**Files:**
- Create: `src/app/api/stripe/checkout/route.ts`

- [ ] **Step 1: Create the route**

```typescript
import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { stripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clerkUser = await currentUser()
  const email = clerkUser?.emailAddresses[0]?.emailAddress || ''

  const supabase = createServiceClient()
  const { data: user } = await supabase
    .from('users')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single()

  // Reuse existing Stripe customer or create new one
  let customerId = user?.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({ email, metadata: { clerk_user_id: userId } })
    customerId = customer.id
    await supabase.from('users').update({ stripe_customer_id: customerId }).eq('id', userId)
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: process.env.STRIPE_PREMIUM_PRICE_ID!, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/coach?upgraded=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/coach`,
    subscription_data: { metadata: { clerk_user_id: userId } },
  })

  return NextResponse.json({ url: session.url })
}
```

- [ ] **Step 2: Verify it compiles**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && cd "/c/Users/ensan/Dev/Ultimate Business Clarity Coach" && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/app/api/stripe/checkout/route.ts
git commit -m "feat: add stripe checkout session endpoint"
```

---

### Task 4: Create Stripe webhook handler

**Files:**
- Create: `src/app/api/webhook/stripe/route.ts`

- [ ] **Step 1: Create the route**

```typescript
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
    const subscription = event.data.object as { status: string; metadata: { clerk_user_id?: string }; customer: string; id: string }
    const clerkUserId = subscription.metadata?.clerk_user_id

    if (clerkUserId) {
      await supabase.from('users').update({
        plan: subscription.status === 'active' ? 'premium' : 'free',
        stripe_subscription_id: subscription.id,
        subscription_status: subscription.status,
      }).eq('id', clerkUserId)
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as { metadata: { clerk_user_id?: string }; id: string }
    const clerkUserId = subscription.metadata?.clerk_user_id

    if (clerkUserId) {
      await supabase.from('users').update({
        plan: 'free',
        subscription_status: 'canceled',
        stripe_subscription_id: null,
      }).eq('id', clerkUserId)
    }
  }

  return NextResponse.json({ received: true })
}
```

- [ ] **Step 2: Disable body parsing for this route (required for Stripe signature verification)**

Create `src/app/api/webhook/stripe/route.ts` already uses `req.text()` which reads the raw body — Next.js App Router handles this correctly by default. No additional config needed.

- [ ] **Step 3: Verify it compiles**

```bash
export PATH="/c/Program Files/nodejs:$PATH" && cd "/c/Users/ensan/Dev/Ultimate Business Clarity Coach" && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/app/api/webhook/stripe/route.ts
git commit -m "feat: add stripe webhook handler"
```

---

### Task 5: Add upgrade button to coach page

**Files:**
- Modify: `src/app/coach/page.tsx`

- [ ] **Step 1: Add upgrade handler function** — inside `CoachPage()`, after the existing state declarations:

```typescript
async function handleUpgrade() {
  const res = await fetch('/api/stripe/checkout', { method: 'POST' })
  const { url } = await res.json()
  if (url) window.location.href = url
}
```

- [ ] **Step 2: Add upgrade toast when 429 is returned** — replace the existing 429 handler in `sendMessage`:

```typescript
if (res.status === 429) {
  toast.error('Daily limit reached — upgrade to unlock unlimited coaching.')
  setMessages(prev => prev.slice(0, -1))
  setIsStreaming(false)
  handleUpgrade()  // send them straight to checkout
  return
}
```

- [ ] **Step 3: Add upgraded success toast** — add this `useEffect` after existing useEffects:

```typescript
useEffect(() => {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search)
    if (params.get('upgraded') === 'true') {
      toast.success('Welcome to Premium! Unlimited coaching unlocked.')
      window.history.replaceState({}, '', '/coach')
    }
  }
}, [])
```

- [ ] **Step 4: Commit**

```bash
git add src/app/coach/page.tsx
git commit -m "feat: wire upgrade button to stripe checkout"
```

---

### Task 6: Test end-to-end locally

- [ ] **Step 1: Start Stripe CLI webhook listener**

```bash
stripe listen --forward-to localhost:3000/api/webhook/stripe
```

Copy the printed `whsec_...` secret into `.env.local` as `STRIPE_WEBHOOK_SECRET`, then restart dev server.

- [ ] **Step 2: Test checkout flow**

1. Sign in as a free user
2. Hit the 5-message daily limit (or manually call `POST /api/stripe/checkout`)
3. Should redirect to Stripe hosted checkout page
4. Use test card `4242 4242 4242 4242`, any future expiry, any CVC
5. Should redirect to `/coach?upgraded=true`
6. Toast should show "Welcome to Premium!"

- [ ] **Step 3: Verify user plan updated in Supabase**

Go to Supabase dashboard → Table Editor → `users` → confirm `plan = 'premium'` for the test user.

- [ ] **Step 4: Test that free limit no longer applies**

Send more than 5 messages — should not get a 429 error.

---

### Task 7: Deploy to Vercel

- [ ] **Step 1: Add all env vars to Vercel**

In Vercel dashboard → Project → Settings → Environment Variables, add:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
KNOWLEDGE_BASE_SUPABASE_URL
KNOWLEDGE_BASE_SUPABASE_ANON_KEY
ANTHROPIC_API_KEY
OPENAI_API_KEY
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
NEXT_PUBLIC_CLERK_SIGN_IN_URL
NEXT_PUBLIC_CLERK_SIGN_UP_URL
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET   ← use the LIVE whsec from Stripe dashboard (not CLI)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_PREMIUM_PRICE_ID
NEXT_PUBLIC_APP_URL     ← your Vercel production URL e.g. https://your-app.vercel.app
```

- [ ] **Step 2: Push to GitHub and deploy**

```bash
git push origin master
```

Connect repo to Vercel if not already done. Vercel auto-deploys on push.

- [ ] **Step 3: Add live webhook in Stripe dashboard**

Stripe Dashboard → Developers → Webhooks → Add endpoint:
- URL: `https://your-app.vercel.app/api/webhook/stripe`
- Events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
- Copy the signing secret → paste into Vercel env vars as `STRIPE_WEBHOOK_SECRET`

- [ ] **Step 4: Redeploy after adding webhook secret**

In Vercel dashboard → Deployments → Redeploy latest.
