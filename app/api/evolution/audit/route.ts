import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // Auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl

  const limit = Math.min(Number(searchParams.get('limit') || 20), 100)
  const offset = Number(searchParams.get('offset') || 0)
  const eventType = searchParams.get('event_type')
  const actorType = searchParams.get('actor_type')

  let query = supabase
    .from('audit_logs')
    .select('id, event_type, actor_type, actor_id, subject_type, subject_id, details, created_at')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (eventType) {
    query = query.eq('event_type', eventType)
  }
  if (actorType) {
    query = query.eq('actor_type', actorType)
  }

  const { data: logs, error } = await query

  if (error) {
    console.error('[audit] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  return NextResponse.json({ logs: logs ?? [] })
}
