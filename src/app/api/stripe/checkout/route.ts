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
