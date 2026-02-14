import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('user_preferences')
    .select('language, theme, font_size')
    .eq('user_id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? { language: 'en', theme: 'dark', font_size: 2 })
}

export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { language, theme, font_size } = body

  // Validate
  if (language && !['en', 'ko'].includes(language)) {
    return NextResponse.json({ error: 'Invalid language' }, { status: 400 })
  }
  if (theme && !['dark', 'light', 'system'].includes(theme)) {
    return NextResponse.json({ error: 'Invalid theme' }, { status: 400 })
  }
  if (font_size !== undefined && (font_size < 0 || font_size > 4)) {
    return NextResponse.json({ error: 'Invalid font_size' }, { status: 400 })
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (language) update.language = language
  if (theme) update.theme = theme
  if (font_size !== undefined) update.font_size = font_size

  const { data, error } = await supabase
    .from('user_preferences')
    .upsert({ user_id: user.id, ...update }, { onConflict: 'user_id' })
    .select('language, theme, font_size')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
