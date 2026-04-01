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
