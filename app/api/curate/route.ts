import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getCounselingTaggingPrompt, type CounselingContext } from '@/lib/counseling-scenarios'

export async function POST(request: Request) {
  // Auth check: support both cookie-based and Bearer token auth
  let user = null
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '')
    const svc = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data, error } = await svc.auth.getUser(token)
    if (!error) user = data.user
  }
  if (!user) {
    const supabase = await createClient()
    const { data, error: authError } = await supabase.auth.getUser()
    if (authError || !data.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    user = data.user
  }

  const body = await request.json()
  const { action, batch_size = 50, offset = 0 } = body

  if (action !== 'tag_counseling') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch chunks without counseling metadata
  const { data: chunks, error: fetchError } = await serviceClient
    .from('scripture_chunks')
    .select('id, text_ko, text_en, traditions_en, theme')
    .or('metadata.is.null,metadata->counseling_context.is.null')
    .range(offset, offset + batch_size - 1)

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (!chunks || chunks.length === 0) {
    return NextResponse.json({ message: 'No chunks to process', tagged: 0 })
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  let tagged = 0
  let errors = 0

  for (const chunk of chunks) {
    try {
      const text = chunk.text_en || chunk.text_ko
      const source = (chunk.traditions_en || []).join(', ') || chunk.theme

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 500,
          messages: [{
            role: 'user',
            content: getCounselingTaggingPrompt(text, source),
          }],
        }),
      })

      if (!response.ok) {
        errors++
        continue
      }

      const result = await response.json()
      const content = result.content[0].text
      const match = content.match(/\{[\s\S]*\}/)

      if (match) {
        const counselingContext: CounselingContext = JSON.parse(match[0])

        // Update the chunk with metadata
        const { error: updateError } = await serviceClient
          .from('scripture_chunks')
          .update({
            metadata: { counseling_context: counselingContext }
          })
          .eq('id', chunk.id)

        if (!updateError) tagged++
        else errors++
      } else {
        errors++
      }

      // Rate limit: 100ms between API calls
      await new Promise(r => setTimeout(r, 100))
    } catch {
      errors++
    }
  }

  return NextResponse.json({
    status: 'completed',
    total: chunks.length,
    tagged,
    errors,
    next_offset: offset + batch_size,
  })
}
