import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'

const VALID_SUBMISSION_TYPES = ['wisdom', 'story', 'reflection', 'teaching', 'prayer', 'poem'] as const

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

  const { data: submissions, error, count } = await supabase
    .from('submissions')
    .select('id, title, type, status, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('[submissions] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  const { count: approvedCount } = await supabase
    .from('submissions')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'approved')

  const { count: activeVoteCount } = await supabase
    .from('voting_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')

  return NextResponse.json({
    submissions: submissions ?? [],
    total: count ?? 0,
    approved: approvedCount ?? 0,
    active_votes: activeVoteCount ?? 0,
  })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limit: 10 req/min per user
  const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown'
  if (!checkRateLimit(`submissions:${user.id}:${ip}`, 10, 60000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const body = await request.json()
  const { type, title, raw_text, categories, status } = body

  if (!type || !title || !raw_text) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Input validation
  if (!VALID_SUBMISSION_TYPES.includes(type)) {
    return NextResponse.json({ error: 'Invalid submission type' }, { status: 400 })
  }
  if (title.length > 200) {
    return NextResponse.json({ error: 'Title too long' }, { status: 400 })
  }
  if (raw_text.length > 5000) {
    return NextResponse.json({ error: 'Content too long' }, { status: 400 })
  }

  const { data: submission, error } = await supabase
    .from('submissions')
    .insert({
      user_id: user.id,
      type,
      title,
      raw_text,
      language: 'ko',
      status: status === 'draft' ? 'draft' : 'submitted',
    })
    .select('id')
    .single()

  if (error) {
    console.error('[submissions] POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  // Insert category associations if provided
  if (categories && Array.isArray(categories) && categories.length > 0) {
    const categoryRows = categories.map((cat: string) => ({
      content_type: 'submission' as const,
      content_id: submission.id,
      category_id: cat,
      assigned_by: 'manual' as const,
    }))
    await supabase.from('content_categories').insert(categoryRows)
  }

  // Trigger AI screening if submitted (not draft)
  if (status !== 'draft') {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/screening`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ submission_id: submission.id }),
      })
    } catch {
      // Screening will be retried by background job
    }
  }

  return NextResponse.json({ id: submission.id }, { status: 201 })
}
