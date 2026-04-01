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
