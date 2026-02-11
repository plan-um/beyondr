import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { scriptureVerses } from '@/lib/scripture-verses'
import { checkRateLimit } from '@/lib/rate-limit'
import { generateEmbedding } from '@/lib/voyage'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const PERSONA_KEYS = ['integrated_guide', 'zen_master', 'sufi_poet', 'stoic_philosopher'] as const

type PersonaKey = (typeof PERSONA_KEYS)[number]

function getSystemPrompt(persona: PersonaKey, scriptureContext: string, lang: 'ko' | 'en'): string {
  const scriptureSection = scriptureContext
    ? lang === 'ko'
      ? `\n\n---\n참고 경전:\n${scriptureContext}\n---\n`
      : `\n\n---\nReference Scripture:\n${scriptureContext}\n---\n`
    : ''

  const langInstruction =
    lang === 'ko'
      ? '반드시 한국어로 답변하세요. 해요체를 사용하고, 따뜻하고 친근한 톤으로 말하세요.'
      : 'Respond in English. Use a warm and conversational tone.'

  const prompts: Record<PersonaKey, string> = {
    integrated_guide: `You are Beyondr's "Transcendent Guide" (통합 안내자) — a warm, inclusive spiritual companion who weaves together wisdom from all traditions.

Your voice: Warm, open, inviting. You see connections between Buddhism, Christianity, Islam, Hinduism, Taoism, Stoicism, Sufism, and more. You speak from a place that transcends any single tradition while honoring them all.

Your approach:
- Draw connections across traditions when relevant
- Be personally warm — speak as a wise friend, not a lecturer
- Ask reflective questions that open doors
- Honor doubt and questioning as part of the spiritual path
- Never proselytize or favor one tradition over others
- When scripture references include counseling context (after —), use those notes to guide your response style and approach
${scriptureSection}
${langInstruction}

Keep responses concise (2-4 paragraphs). If the referenced scriptures are relevant to the user's question, weave them naturally into your response.`,

    zen_master: `You are Beyondr's "Sage" (스승) — a Zen-inspired spiritual guide who speaks with the directness and paradox of the Chan/Zen tradition.

Your voice: Direct yet gentle. You use koans, paradoxes, and nature metaphors. You point rather than explain. Short sentences. Profound simplicity.

Your approach:
- Use paradox and koan-like statements to shake habitual thinking
- Draw from Zen/Chan Buddhism, but also Taoism's naturalism
- Favor metaphors from nature: mountains, rivers, the moon, flowers
- Sometimes answer a question with a question
- Be economical with words — less is more
- When scripture references include counseling context (after —), use those notes to guide your response style and approach
${scriptureSection}
${langInstruction}

Keep responses brief and piercing (1-3 paragraphs). Let silence and space do the work. If referencing scriptures, do so with the simplicity of a pointing finger.`,

    sufi_poet: `You are Beyondr's "Guide" (안내자) — a Sufi-inspired spiritual companion who speaks with the poetic heart of the mystical tradition.

Your voice: Poetic, passionate, tender. You use love and wine as metaphors for divine connection. You speak from the tradition of Rumi, Hafiz, and the great Sufi poets.

Your approach:
- Use poetic language and metaphor — the Beloved, the wine, the garden
- See every human experience as a doorway to the divine
- Celebrate the heart's longing as a sign of spiritual awakening
- Transform ordinary moments into sacred poetry
- Be emotionally present and deeply compassionate
- When scripture references include counseling context (after —), use those notes to guide your response style and approach
${scriptureSection}
${langInstruction}

Keep responses lyrical but accessible (2-4 paragraphs). Weave scripture naturally, as a poet weaves golden threads.`,

    stoic_philosopher: `You are Beyondr's "Philosopher" (철학자) — a Stoic-inspired guide who brings clarity, logic, and practical wisdom.

Your voice: Calm, measured, rational. You focus on what we can control. You draw from Marcus Aurelius, Epictetus, and Seneca, but also engage with other philosophical traditions.

Your approach:
- Be logical and clear — name what can and cannot be controlled
- Offer practical, actionable frameworks for thinking
- Use Stoic principles: amor fati, memento mori, the dichotomy of control
- Draw parallels with Buddhist detachment and Taoist non-resistance
- Be direct and honest, but never cold
- When scripture references include counseling context (after —), use those notes to guide your response style and approach
${scriptureSection}
${langInstruction}

Keep responses clear and structured (2-4 paragraphs). If referencing scriptures, connect them to practical wisdom the user can apply today.`,
  }

  return prompts[persona]
}

function searchScripturesInline(query: string, lang: 'ko' | 'en'): string {
  const q = query.toLowerCase()
  const results: string[] = []

  for (const chapter of scriptureVerses.chapters) {
    for (const verse of chapter.verses) {
      const textKo = verse.ko.toLowerCase()
      const textEn = verse.en.toLowerCase()
      const traditions = [...verse.traditions, ...verse.traditions_en].join(' ').toLowerCase()

      if (textKo.includes(q) || textEn.includes(q) || traditions.includes(q)) {
        results.push(
          lang === 'ko'
            ? `[${verse.num}] ${verse.ko} (${verse.traditions.join(', ')})`
            : `[${verse.num}] ${verse.en} (${verse.traditions_en.join(', ')})`
        )
      }
      if (results.length >= 5) break
    }
    if (results.length >= 5) break
  }

  return results.join('\n')
}

function getRandomVerses(lang: 'ko' | 'en', count: number): string {
  const allVerses = scriptureVerses.chapters.flatMap((ch) => ch.verses)
  const shuffled = [...allVerses].sort(() => Math.random() - 0.5).slice(0, count)

  return shuffled
    .map((v) =>
      lang === 'ko'
        ? `[${v.num}] ${v.ko} (${v.traditions.join(', ')})`
        : `[${v.num}] ${v.en} (${v.traditions_en.join(', ')})`
    )
    .join('\n')
}

async function findRelevantScripture(query: string, lang: 'ko' | 'en', supabase: Awaited<ReturnType<typeof createClient>>): Promise<string> {
  // --- Strategy 1: Semantic search via Voyage-3.5 embeddings ---
  if (process.env.VOYAGE_API_KEY) {
    try {
      const queryEmbedding = await generateEmbedding(query.trim().slice(0, 1000), 'query')

      if (queryEmbedding) {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (url && key) {
          const serviceClient = createServiceClient(url, key)
          const embeddingStr = `[${queryEmbedding.join(',')}]`

          const { data, error } = await serviceClient.rpc('match_scripture_chunks', {
            query_embedding: embeddingStr,
            match_threshold: 0.4,
            match_count: 5,
          })

          if (!error && data && data.length > 0) {
            return data
              .map((row: { id: string; text_ko: string; text_en: string; traditions: string[]; traditions_en: string[]; metadata?: { counseling_context?: { scenarios?: string[]; emotional_tone?: string; when_to_use?: string } }; similarity: number }) => {
                const text = lang === 'ko' ? row.text_ko : row.text_en
                const traditions = lang === 'ko'
                  ? (row.traditions ?? []).join(', ')
                  : (row.traditions_en ?? []).join(', ')
                const counseling = row.metadata?.counseling_context
                const contextNote = counseling?.when_to_use ? ` — ${counseling.when_to_use}` : ''
                return `[${row.id}] ${text} (${traditions})${contextNote}`
              })
              .join('\n')
          }
        }
      }
    } catch (err) {
      console.warn('Semantic search failed, falling back to keyword search:', err)
    }
  }

  // --- Strategy 2: Keyword ilike search (fallback) ---
  const sanitized = query.replace(/[%_,().]/g, '').trim().slice(0, 100)

  if (sanitized) {
    try {
      const { data, error } = await supabase
        .from('scripture_chunks')
        .select('id, text_ko, text_en, traditions, traditions_en')
        .or(`text_ko.ilike.%${sanitized}%,text_en.ilike.%${sanitized}%`)
        .limit(5)

      if (!error && data && data.length > 0) {
        return data
          .map((row: { id: string; text_ko: string; text_en: string; traditions: string[]; traditions_en: string[] }) => {
            const text = lang === 'ko' ? row.text_ko : row.text_en
            const traditions = lang === 'ko'
              ? (row.traditions ?? []).join(', ')
              : (row.traditions_en ?? []).join(', ')
            return `[${row.id}] ${text} (${traditions})`
          })
          .join('\n')
      }
    } catch {
      // Supabase not available or table doesn't exist — use inline fallback
    }
  }

  // --- Strategy 3: Inline scripture data fallback ---
  const inlineResult = searchScripturesInline(query, lang)
  if (inlineResult) return inlineResult

  // No matches at all: return random verses for context
  return getRandomVerses(lang, 3)
}

export async function POST(request: Request) {
  try {
    // Auth check
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limit: 5 req/min per user
    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown'
    if (!checkRateLimit(`chat:${user.id}:${ip}`, 5, 60000)) {
      return Response.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = await request.json()
    const { messages, persona: personaIndex, lang = 'en' } = body as {
      messages: { role: string; content: string }[]
      persona?: number
      lang?: 'ko' | 'en'
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: 'Messages required' }, { status: 400 })
    }

    // Input validation
    if (messages.length > 50) {
      return Response.json({ error: 'Too many messages' }, { status: 400 })
    }
    for (const msg of messages) {
      if (msg.content && msg.content.length > 10000) {
        return Response.json({ error: 'Message too long' }, { status: 400 })
      }
      if (msg.role !== 'user' && msg.role !== 'assistant') {
        return Response.json({ error: 'Invalid message role' }, { status: 400 })
      }
    }

    const personaKey = PERSONA_KEYS[personaIndex ?? 0] ?? 'integrated_guide'

    // Extract the last user message for scripture context search
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')
    const query = lastUserMsg?.content ?? ''

    // Find relevant scripture for context
    const scriptureContext = await findRelevantScripture(query, lang, supabase)

    const systemPrompt = getSystemPrompt(personaKey, scriptureContext, lang)

    // Convert messages to Anthropic format
    const anthropicMessages = messages.map((m) => ({
      role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.content,
    }))

    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      temperature: 0.7,
      system: systemPrompt,
      messages: anthropicMessages,
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              controller.enqueue(encoder.encode(event.delta.text))
            }
          }
          controller.close()
        } catch (err) {
          controller.error(err)
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    })
  } catch (err) {
    console.error('Chat API error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
