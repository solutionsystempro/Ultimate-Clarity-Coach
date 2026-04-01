import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clerkUser = await currentUser()
  const supabase = createServiceClient()

  // Upsert user into our DB
  const { data } = await supabase
    .from('users')
    .upsert(
      {
        id: userId,
        email: clerkUser?.emailAddresses[0]?.emailAddress || '',
        full_name: `${clerkUser?.firstName || ''} ${clerkUser?.lastName || ''}`.trim(),
      },
      { onConflict: 'id' }
    )
    .select()
    .single()

  return NextResponse.json(data)
}
