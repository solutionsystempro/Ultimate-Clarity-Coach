import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// Pinged daily by the Vercel cron in vercel.json. Free-tier Supabase
// projects pause after ~7 days without database activity, which takes
// auth (and the whole app) down with a DNS error — this query keeps
// the project active.
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createServiceClient()
    const { error } = await supabase.from('users').select('id').limit(1)
    if (error) throw new Error(error.message)
    return NextResponse.json({ ok: true, pinged_at: new Date().toISOString() })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'unknown' },
      { status: 500 }
    )
  }
}
