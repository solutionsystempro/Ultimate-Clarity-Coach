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
