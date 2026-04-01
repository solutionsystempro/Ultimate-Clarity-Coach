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
