import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title } = await req.json()
  const supabase = createServiceClient()

  // Ensure user exists
  await supabase
    .from('users')
    .upsert({ id: userId, email: '' }, { onConflict: 'id', ignoreDuplicates: true })

  const { data } = await supabase
    .from('conversations')
    .insert({ user_id: userId, title: title || 'New Conversation' })
    .select()
    .single()

  return NextResponse.json(data)
}
