import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'

// Your admin user ID — set ADMIN_USER_ID in .env.local to restrict access
const ADMIN_USER_ID = process.env.ADMIN_USER_ID

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (ADMIN_USER_ID && userId !== ADMIN_USER_ID) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = createServiceClient()

  // Total users
  const { count: totalUsers } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })

  // Total conversations
  const { count: totalConversations } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })

  // Total messages
  const { count: totalMessages } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })

  // Recent conversations with user info and message count
  const { data: recentConversations } = await supabase
    .from('conversations')
    .select(`
      id,
      title,
      created_at,
      updated_at,
      user_id,
      messages(count)
    `)
    .order('updated_at', { ascending: false })
    .limit(50)

  // Recent user messages (questions asked)
  const { data: recentMessages } = await supabase
    .from('messages')
    .select(`
      id,
      content,
      role,
      created_at,
      conversation_id
    `)
    .eq('role', 'user')
    .order('created_at', { ascending: false })
    .limit(100)

  // Business profiles
  const { data: profiles } = await supabase
    .from('business_profiles')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(50)

  // Users with plan info
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
