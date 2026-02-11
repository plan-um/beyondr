// supabase/functions/crawl/index.ts
// Periodic crawling of wisdom sources
// Triggered by: pg_cron (weekly) or manual invocation
//
// Pipeline:
// 1. Fetch active crawl_sources
// 2. For each source, collect new content via adapter
// 3. SHA-256 hash for dedup
// 4. AI quality filter (relevance >= 0.6, quality >= 0.5)
// 5. Passed items -> refinement queue
//
// Adapters:
// - Bible API (bible-api.com)
// - Quran Cloud API (api.alquran.cloud)
// - Bhagavad Gita (curated / vedicscriptures.github.io fallback)
// - Sacred Texts Collection (Taoism, Buddhism, Stoicism, Sufism)

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// ============================================================================
// TYPES
// ============================================================================

interface CrawlRequest {
  source_id?: string  // Optional: crawl specific source only
  force_recrawl?: boolean  // Optional: ignore last_crawl_at
}

interface CrawlResult {
  sources_processed: number
  items_collected: number
  items_deduped: number
  items_passed: number
  items_failed: number
  errors: string[]
}

interface BibleVerse {
  reference: string
  text: string
  translation_name: string
}

interface CrawledItem {
  reference: string
  text: string
  original_language: string
  author: string
  source_url: string | null
  copyright_status: string
}

// ============================================================================
// CURATED PASSAGE LISTS
// ============================================================================

// Bible wisdom passages
const BIBLE_WISDOM_PASSAGES = [
  "proverbs+3:5-6",
  "proverbs+16:9",
  "proverbs+22:6",
  "ecclesiastes+3:1-8",
  "ecclesiastes+12:13",
  "psalm+23:1-6",
  "psalm+46:1",
  "psalm+91:1-2",
  "matthew+5:3-12",
  "matthew+6:33",
  "matthew+7:7",
  "john+3:16",
  "john+14:6",
  "romans+8:28",
  "romans+12:2",
  "philippians+4:6-7",
  "philippians+4:13",
  "james+1:2-4",
  "1corinthians+13:4-8",
  "colossians+3:23",
]

// Quran wisdom passages (surah:ayah format)
const QURAN_WISDOM_PASSAGES = [
  "2:255",    // Ayat al-Kursi (Throne Verse)
  "2:286",    // Allah does not burden a soul beyond its capacity
  "3:139",    // Do not weaken and do not grieve
  "5:32",     // Whoever saves a life, saves all of humanity
  "13:28",    // In the remembrance of Allah do hearts find rest
  "16:90",    // Allah commands justice and good conduct
  "21:87",    // There is no deity except You; exalted are You
  "24:35",    // Allah is the Light of the heavens and earth (Light Verse)
  "31:17",    // Luqman's advice (part 1)
  "31:18",    // Luqman's advice (part 2)
  "39:53",    // Do not despair of the mercy of Allah
  "49:13",    // Created you into nations and tribes to know one another
  "55:1",     // The Most Merciful (Ar-Rahman start)
  "55:2",     // Taught the Quran
  "55:3",     // Created man
  "55:4",     // Taught him eloquence
  "93:1",     // Surah Ad-Duha verse 1
  "93:2",     // Surah Ad-Duha verse 2
  "93:3",     // Surah Ad-Duha verse 3
  "93:4",     // Surah Ad-Duha verse 4
  "93:5",     // Surah Ad-Duha verse 5
  "93:6",     // Surah Ad-Duha verse 6
  "93:7",     // Surah Ad-Duha verse 7
  "93:8",     // Surah Ad-Duha verse 8
  "94:5",     // With hardship comes ease (1)
  "94:6",     // With hardship comes ease (2)
  "112:1",    // Surah Al-Ikhlas verse 1
  "112:2",    // Surah Al-Ikhlas verse 2
  "112:3",    // Surah Al-Ikhlas verse 3
  "112:4",    // Surah Al-Ikhlas verse 4
]

// Bhagavad Gita curated wisdom (public domain translations)
const GITA_WISDOM: CrawledItem[] = [
  {
    reference: "Bhagavad Gita 2:47",
    text: "You have a right to perform your prescribed duties, but you are not entitled to the fruits of your actions.",
    original_language: "sa",
    author: "Bhagavad Gita (translation)",
    source_url: null,
    copyright_status: "public_domain",
  },
  {
    reference: "Bhagavad Gita 2:14",
    text: "The contacts of the senses with their objects, which give rise to the feelings of heat and cold, pleasure and pain, are transient. Bear them patiently.",
    original_language: "sa",
    author: "Bhagavad Gita (translation)",
    source_url: null,
    copyright_status: "public_domain",
  },
  {
    reference: "Bhagavad Gita 2:22",
    text: "As a person puts on new garments, giving up old ones, the soul similarly accepts new material bodies, giving up the old and useless ones.",
    original_language: "sa",
    author: "Bhagavad Gita (translation)",
    source_url: null,
    copyright_status: "public_domain",
  },
  {
    reference: "Bhagavad Gita 4:7",
    text: "Whenever there is a decline in righteousness and an increase in unrighteousness, at that time I manifest myself.",
    original_language: "sa",
    author: "Bhagavad Gita (translation)",
    source_url: null,
    copyright_status: "public_domain",
  },
  {
    reference: "Bhagavad Gita 6:5",
    text: "Elevate yourself through the power of your mind, and not degrade yourself, for the mind can be the friend and also the enemy of the self.",
    original_language: "sa",
    author: "Bhagavad Gita (translation)",
    source_url: null,
    copyright_status: "public_domain",
  },
  {
    reference: "Bhagavad Gita 9:22",
    text: "To those who worship Me alone, thinking of no other, I secure what they lack and preserve what they have.",
    original_language: "sa",
    author: "Bhagavad Gita (translation)",
    source_url: null,
    copyright_status: "public_domain",
  },
  {
    reference: "Bhagavad Gita 11:32",
    text: "I am mighty Time, the source of destruction that comes forth to annihilate the worlds.",
    original_language: "sa",
    author: "Bhagavad Gita (translation)",
    source_url: null,
    copyright_status: "public_domain",
  },
  {
    reference: "Bhagavad Gita 18:66",
    text: "Abandon all varieties of dharma and simply surrender unto me alone. I shall liberate you from all sinful reactions; do not fear.",
    original_language: "sa",
    author: "Bhagavad Gita (translation)",
    source_url: null,
    copyright_status: "public_domain",
  },
]

// Sacred Texts Collection: Taoism, Buddhism, Stoicism, Sufism
const SACRED_WISDOM: CrawledItem[] = [
  // Tao Te Ching (Lao Tzu) — original ~6th century BCE, public domain
  {
    reference: "Tao Te Ching, Chapter 1",
    text: "The Tao that can be told is not the eternal Tao. The name that can be named is not the eternal name.",
    original_language: "zh",
    author: "Lao Tzu",
    source_url: null,
    copyright_status: "public_domain",
  },
  {
    reference: "Tao Te Ching, Chapter 8",
    text: "The supreme good is like water, which nourishes all things without trying to. It is content with the low places that people disdain.",
    original_language: "zh",
    author: "Lao Tzu",
    source_url: null,
    copyright_status: "public_domain",
  },
  {
    reference: "Tao Te Ching, Chapter 33",
    text: "Knowing others is intelligence; knowing yourself is true wisdom. Mastering others is strength; mastering yourself is true power.",
    original_language: "zh",
    author: "Lao Tzu",
    source_url: null,
    copyright_status: "public_domain",
  },
  {
    reference: "Tao Te Ching, Chapter 76",
    text: "The stiff and unbending is the disciple of death. The soft and yielding is the disciple of life.",
    original_language: "zh",
    author: "Lao Tzu",
    source_url: null,
    copyright_status: "public_domain",
  },
  // Dhammapada (Buddhism) — ~3rd century BCE, public domain
  {
    reference: "Dhammapada, Verse 1",
    text: "All that we are is the result of what we have thought. The mind is everything. What we think we become.",
    original_language: "pi",
    author: "Dhammapada",
    source_url: null,
    copyright_status: "public_domain",
  },
  {
    reference: "Dhammapada, Verse 183",
    text: "To avoid all evil, to cultivate good, and to purify one's mind — this is the teaching of the Buddhas.",
    original_language: "pi",
    author: "Dhammapada",
    source_url: null,
    copyright_status: "public_domain",
  },
  {
    reference: "Dhammapada, Verse 223",
    text: "Overcome anger by love, overcome evil by good. Overcome the miser by generosity, the liar by truth.",
    original_language: "pi",
    author: "Dhammapada",
    source_url: null,
    copyright_status: "public_domain",
  },
  // Marcus Aurelius — Meditations (~180 CE), public domain
  {
    reference: "Meditations, Book IV, 3",
    text: "Everything we hear is an opinion, not a fact. Everything we see is a perspective, not the truth.",
    original_language: "grc",
    author: "Marcus Aurelius",
    source_url: null,
    copyright_status: "public_domain",
  },
  {
    reference: "Meditations, Book II, 1",
    text: "When you arise in the morning, think of what a precious privilege it is to be alive — to breathe, to think, to enjoy, to love.",
    original_language: "grc",
    author: "Marcus Aurelius",
    source_url: null,
    copyright_status: "public_domain",
  },
  // Epictetus — Enchiridion (~135 CE), public domain
  {
    reference: "Enchiridion, Chapter 1",
    text: "Some things are in our control and others not. Things in our control are opinion, pursuit, desire, aversion.",
    original_language: "grc",
    author: "Epictetus",
    source_url: null,
    copyright_status: "public_domain",
  },
  // Rumi (Sufism) — 13th century, public domain
  {
    reference: "Rumi, Selected Verse 1",
    text: "The wound is the place where the Light enters you.",
    original_language: "fa",
    author: "Rumi",
    source_url: null,
    copyright_status: "public_domain",
  },
  {
    reference: "Rumi, Selected Verse 2",
    text: "What you seek is seeking you.",
    original_language: "fa",
    author: "Rumi",
    source_url: null,
    copyright_status: "public_domain",
  },
  {
    reference: "Rumi, Selected Verse 3",
    text: "Yesterday I was clever, so I wanted to change the world. Today I am wise, so I am changing myself.",
    original_language: "fa",
    author: "Rumi",
    source_url: null,
    copyright_status: "public_domain",
  },
]

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

async function computeHash(text: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("")
}

/**
 * Generate and store an embedding for a crawled_content row using Voyage-3.5.
 * Fire-and-forget style: logs errors but does not throw.
 */
async function generateEmbedding(
  text: string,
  rowId: string,
  reference: string,
  supabase: ReturnType<typeof createClient>,
): Promise<void> {
  const voyageKey = Deno.env.get("VOYAGE_API_KEY")
  if (!voyageKey) return

  try {
    const embRes = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${voyageKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "voyage-3.5",
        input: [text],
        input_type: "document",
      }),
    })

    if (embRes.ok) {
      const embData = await embRes.json()
      const embedding = embData.data?.[0]?.embedding
      if (embedding) {
        const { error: embUpdateErr } = await supabase
          .from("crawled_content")
          .update({ embedding: JSON.stringify(embedding) })
          .eq("id", rowId)

        if (embUpdateErr) {
          console.error(`Embedding update failed for ${reference}:`, embUpdateErr.message)
        }
      }
    } else {
      const errText = await embRes.text()
      console.error(`Voyage API error for ${reference}: ${embRes.status} ${errText}`)
    }
  } catch (embErr) {
    console.error(`Embedding generation failed for ${reference}:`, embErr)
  }
}

// ============================================================================
// SOURCE ADAPTERS
// ============================================================================

// --- Bible API adapter ---
async function fetchBibleVerse(reference: string): Promise<BibleVerse | null> {
  try {
    const response = await fetch(`https://bible-api.com/${reference}`)
    if (!response.ok) return null
    const data = await response.json()
    return {
      reference: data.reference,
      text: data.text,
      translation_name: data.translation_name || "KJV",
    }
  } catch (error) {
    console.error(`Failed to fetch Bible ${reference}:`, error)
    return null
  }
}

// --- Quran Cloud API adapter ---
async function fetchQuranAyah(reference: string): Promise<CrawledItem | null> {
  try {
    const url = `https://api.alquran.cloud/v1/ayah/${reference}/en.sahih`
    const response = await fetch(url)
    if (!response.ok) {
      console.error(`Quran API returned ${response.status} for ${reference}`)
      return null
    }
    const data = await response.json()
    if (data.code !== 200 || !data.data) {
      console.error(`Quran API unexpected response for ${reference}:`, data)
      return null
    }
    const ayah = data.data
    const surahName = ayah.surah?.englishName || ""
    return {
      reference: `Quran ${surahName} ${reference}`,
      text: ayah.text,
      original_language: "ar",
      author: "Sahih International",
      source_url: url,
      copyright_status: "public_domain",
    }
  } catch (error) {
    console.error(`Failed to fetch Quran ${reference}:`, error)
    return null
  }
}

// --- Bhagavad Gita adapter ---
// Attempts the Vedic Scriptures API first; falls back to inline curated data.
async function fetchGitaVerse(chapter: number, verse: number): Promise<CrawledItem | null> {
  try {
    const url = `https://vedicscriptures.github.io/slpiversion/chapter/${chapter}/sloka/${verse}`
    const response = await fetch(url)
    if (!response.ok) return null
    const data = await response.json()
    const text = data.translation || data.transliteration || null
    if (!text) return null
    return {
      reference: `Bhagavad Gita ${chapter}:${verse}`,
      text,
      original_language: "sa",
      author: "Bhagavad Gita (translation)",
      source_url: url,
      copyright_status: "public_domain",
    }
  } catch {
    return null
  }
}

// ============================================================================
// AI QUALITY FILTER
// ============================================================================

async function evaluateQuality(text: string, anthropicKey: string): Promise<{
  relevance_score: number
  quality_score: number
}> {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 500,
        messages: [{
          role: "user",
          content: `Evaluate this spiritual/philosophical text for wisdom content quality.

Text: "${text}"

Rate on a scale of 0-1:
1. Relevance: Does it contain meaningful spiritual/moral wisdom?
2. Quality: Is it well-written, clear, and profound?

Respond with ONLY a JSON object:
{"relevance_score": 0.0, "quality_score": 0.0}`,
        }],
      }),
    })

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`)
    }

    const result = await response.json()
    const content = result.content[0].text
    const match = content.match(/\{[^}]+\}/)
    if (!match) {
      return { relevance_score: 0.5, quality_score: 0.5 }
    }

    const scores = JSON.parse(match[0])
    return {
      relevance_score: Math.max(0, Math.min(1, scores.relevance_score || 0.5)),
      quality_score: Math.max(0, Math.min(1, scores.quality_score || 0.5)),
    }
  } catch (error) {
    console.error("Quality evaluation failed:", error)
    return { relevance_score: 0.5, quality_score: 0.5 }
  }
}

// ============================================================================
// GENERIC ITEM PROCESSOR: dedup -> quality filter -> insert -> embed
// ============================================================================

async function processItem(
  item: CrawledItem,
  sourceId: string,
  result: CrawlResult,
  supabase: ReturnType<typeof createClient>,
  anthropicKey: string,
): Promise<void> {
  result.items_collected++

  // SHA-256 dedup
  const contentHash = await computeHash(item.text)

  const { data: existing } = await supabase
    .from("crawled_content")
    .select("id")
    .eq("content_hash", contentHash)
    .single()

  if (existing) {
    result.items_deduped++
    return
  }

  // AI quality filter
  const { relevance_score, quality_score } = await evaluateQuality(item.text, anthropicKey)

  const passed = relevance_score >= 0.6 && quality_score >= 0.5
  const status = passed ? "passed" : "rejected"

  if (passed) {
    result.items_passed++
  } else {
    result.items_failed++
  }

  // Insert
  const { data: insertedRow, error: insertError } = await supabase
    .from("crawled_content")
    .insert({
      source_id: sourceId,
      content_hash: contentHash,
      raw_text: item.text,
      original_language: item.original_language,
      author: item.author,
      source_url: item.source_url,
      copyright_status: item.copyright_status,
      relevance_score,
      quality_score,
      status,
    })
    .select("id")
    .single()

  if (insertError) {
    result.errors.push(`Failed to insert ${item.reference}: ${insertError.message}`)
    return
  }

  // Generate embedding (non-blocking, logs its own errors)
  if (insertedRow) {
    await generateEmbedding(item.text, insertedRow.id, item.reference, supabase)
  }
}

// ============================================================================
// SOURCE ADAPTER DISPATCH
// ============================================================================

/**
 * Determine which adapter to use based on source name/type and run it.
 * Returns true if an adapter was found and executed, false otherwise.
 */
async function runAdapter(
  source: Record<string, unknown>,
  result: CrawlResult,
  supabase: ReturnType<typeof createClient>,
  anthropicKey: string,
): Promise<boolean> {
  const name = (source.name as string) || ""
  const sourceId = source.id as string

  // --- Bible API ---
  if (name.includes("Bible")) {
    console.log(`[crawl] Running Bible adapter for "${name}"`)
    for (const passage of BIBLE_WISDOM_PASSAGES) {
      const verse = await fetchBibleVerse(passage)
      if (!verse) {
        result.errors.push(`Failed to fetch Bible ${passage}`)
        continue
      }
      await processItem(
        {
          reference: verse.reference,
          text: verse.text,
          original_language: "en",
          author: verse.translation_name,
          source_url: `https://bible-api.com/${passage}`,
          copyright_status: (source.copyright_status as string) || "public_domain",
        },
        sourceId,
        result,
        supabase,
        anthropicKey,
      )
    }
    return true
  }

  // --- Quran Cloud API ---
  if (name.includes("Quran")) {
    console.log(`[crawl] Running Quran adapter for "${name}"`)
    for (const ref of QURAN_WISDOM_PASSAGES) {
      const ayah = await fetchQuranAyah(ref)
      if (!ayah) {
        result.errors.push(`Failed to fetch Quran ${ref}`)
        continue
      }
      await processItem(ayah, sourceId, result, supabase, anthropicKey)
    }
    return true
  }

  // --- Bhagavad Gita ---
  if (name.includes("Gita")) {
    console.log(`[crawl] Running Bhagavad Gita adapter for "${name}"`)

    // Try the Vedic Scriptures API for each curated verse; fall back to inline text
    for (const curatedVerse of GITA_WISDOM) {
      // Parse chapter:verse from the reference (e.g. "Bhagavad Gita 2:47")
      const match = curatedVerse.reference.match(/(\d+):(\d+)/)
      let item: CrawledItem = curatedVerse

      if (match) {
        const ch = parseInt(match[1], 10)
        const vs = parseInt(match[2], 10)
        const apiResult = await fetchGitaVerse(ch, vs)
        if (apiResult) {
          item = apiResult
        }
      }

      await processItem(item, sourceId, result, supabase, anthropicKey)
    }
    return true
  }

  // --- Sacred Texts Collection (Taoism, Buddhism, Stoicism, Sufism) ---
  if (name.includes("Sacred") || name.includes("Tao") || name.includes("Philosophy")) {
    console.log(`[crawl] Running Sacred Texts adapter for "${name}"`)
    for (const wisdom of SACRED_WISDOM) {
      await processItem(wisdom, sourceId, result, supabase, anthropicKey)
    }
    return true
  }

  return false
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    )

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY") ?? ""
    if (!anthropicKey) {
      throw new Error("ANTHROPIC_API_KEY not configured")
    }

    const { source_id, force_recrawl }: CrawlRequest = await req.json().catch(() => ({}))

    const result: CrawlResult = {
      sources_processed: 0,
      items_collected: 0,
      items_deduped: 0,
      items_passed: 0,
      items_failed: 0,
      errors: [],
    }

    // Step 1: Fetch active sources
    let query = supabase
      .from("crawl_sources")
      .select("*")
      .eq("is_active", true)

    if (source_id) {
      query = query.eq("id", source_id)
    }

    if (!force_recrawl) {
      query = query.or(
        "last_crawled_at.is.null,last_crawled_at.lt." +
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      )
    }

    const { data: sources, error: sourcesError } = await query

    if (sourcesError) {
      throw new Error(`Failed to fetch sources: ${sourcesError.message}`)
    }

    if (!sources || sources.length === 0) {
      return new Response(
        JSON.stringify({ message: "No sources to crawl", result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      )
    }

    // Step 2: Process each source via its adapter
    for (const source of sources) {
      try {
        result.sources_processed++

        const handled = await runAdapter(source, result, supabase, anthropicKey)

        if (!handled) {
          console.log(`[crawl] Adapter not yet implemented for source: ${source.name} (${source.source_type})`)
          result.errors.push(`Adapter not implemented: ${source.name}`)
        }

        // Update last_crawled_at regardless of adapter outcome
        await supabase
          .from("crawl_sources")
          .update({ last_crawled_at: new Date().toISOString() })
          .eq("id", source.id)

      } catch (sourceError) {
        const msg = sourceError instanceof Error ? sourceError.message : String(sourceError)
        result.errors.push(`Source ${source.name} failed: ${msg}`)
      }
    }

    // Step 3: Audit log (fire-and-forget)
    fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/audit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({
        event_type: "crawl_completed",
        actor_type: "system",
        details: {
          sources_processed: result.sources_processed,
          items_collected: result.items_collected,
          items_passed: result.items_passed,
          items_failed: result.items_failed,
          errors: result.errors,
        },
      }),
    }).catch(err => console.error("Audit log failed:", err))

    return new Response(
      JSON.stringify({ message: "Crawl completed", status: "success", result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    )
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    )
  }
})
