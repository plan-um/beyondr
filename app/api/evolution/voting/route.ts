import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'

export async function GET() {
  const supabase = await createClient()

  const { data: sessions, error } = await supabase
    .from('voting_sessions')
    .select('id, title, description, approval_threshold, human_votes_for, human_votes_against, ai_votes_for, ai_votes_against, status, starts_at, ends_at')
    .eq('status', 'active')
    .order('ends_at', { ascending: true })

  if (error) {
    console.error('[voting] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  const sessionsWithRate = (sessions ?? []).map(s => {
    const totalFor = (s.human_votes_for ?? 0) + (s.ai_votes_for ?? 0)
    const totalAgainst = (s.human_votes_against ?? 0) + (s.ai_votes_against ?? 0)
    const total = totalFor + totalAgainst
    return {
      ...s,
      approval_rate: total > 0 ? totalFor / total : 0,
    }
  })

  return NextResponse.json({ sessions: sessionsWithRate })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limit: 20 req/min per user
  const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown'
  if (!checkRateLimit(`voting:${user.id}:${ip}`, 20, 60000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const body = await request.json()
  const { session_id, vote, reason } = body

  if (!session_id || !vote || !['for', 'against', 'abstain'].includes(vote)) {
    return NextResponse.json({ error: 'Invalid vote data' }, { status: 400 })
  }

  // Check if user already voted in this session
  const { data: existing } = await supabase
    .from('votes')
    .select('id')
    .eq('session_id', session_id)
    .eq('voter_id', user.id)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Already voted' }, { status: 409 })
  }

  const { data: voteRecord, error } = await supabase
    .from('votes')
    .insert({
      session_id,
      voter_type: 'human',
      voter_id: user.id,
      vote,
      reason: reason || null,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[voting] POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  return NextResponse.json({ id: voteRecord.id }, { status: 201 })
}
