// supabase/functions/crawl/index.ts
// Periodic crawling of wisdom sources
// Triggered by: pg_cron (weekly) or manual invocation
//
// Pipeline:
// 1. Fetch active crawl_sources
// 2. For each source, collect new content
// 3. SHA-256 hash for dedup
// 4. AI quality filter (relevance >= 0.6, quality >= 0.5)
// 5. Passed items → refinement queue

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

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

// Curated list of wisdom passages for MVP
const WISDOM_PASSAGES = [
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
  "colossians+3:23"
]

async function computeHash(text: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("")
}

async function fetchBibleVerse(reference: string): Promise<BibleVerse | null> {
  try {
    const response = await fetch(`https://bible-api.com/${reference}`)
    if (!response.ok) {
      return null
    }
    const data = await response.json()
    return {
      reference: data.reference,
      text: data.text,
      translation_name: data.translation_name || "KJV"
    }
  } catch (error) {
    console.error(`Failed to fetch ${reference}:`, error)
    return null
  }
}

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
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 500,
        messages: [{
          role: "user",
          content: `Evaluate this religious text for wisdom content quality.

Text: "${text}"

Rate on a scale of 0-1:
1. Relevance: Does it contain meaningful spiritual/moral wisdom?
2. Quality: Is it well-written, clear, and profound?

Respond with ONLY a JSON object:
{"relevance_score": 0.0, "quality_score": 0.0}`
        }]
      })
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
      quality_score: Math.max(0, Math.min(1, scores.quality_score || 0.5))
    }
  } catch (error) {
    console.error("Quality evaluation failed:", error)
    return { relevance_score: 0.5, quality_score: 0.5 }
  }
}

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
      errors: []
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
      query = query.or("last_crawled_at.is.null,last_crawled_at.lt." + new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    }

    const { data: sources, error: sourcesError } = await query

    if (sourcesError) {
      throw new Error(`Failed to fetch sources: ${sourcesError.message}`)
    }

    if (!sources || sources.length === 0) {
      return new Response(
        JSON.stringify({
          message: "No sources to crawl",
          result
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      )
    }

    // Step 2: Process each source
    for (const source of sources) {
      try {
        result.sources_processed++

        // Only implement Bible API adapter for MVP
        if (source.name === "Bible API" && source.source_type === "religious_api") {
          // Fetch wisdom passages
          for (const passage of WISDOM_PASSAGES) {
            const verse = await fetchBibleVerse(passage)
            if (!verse) {
              result.errors.push(`Failed to fetch ${passage}`)
              continue
            }

            result.items_collected++

            // Step 3: Compute SHA-256 hash
            const contentHash = await computeHash(verse.text)

            // Check if already exists
            const { data: existing } = await supabase
              .from("crawled_content")
              .select("id")
              .eq("content_hash", contentHash)
              .single()

            if (existing) {
              result.items_deduped++
              continue
            }

            // Step 4: AI quality filter
            const { relevance_score, quality_score } = await evaluateQuality(verse.text, anthropicKey)

            const passed = relevance_score >= 0.6 && quality_score >= 0.5
            const status = passed ? "passed" : "rejected"

            if (passed) {
              result.items_passed++
            } else {
              result.items_failed++
            }

            // Step 5: Insert into crawled_content
            // TODO: Add embedding generation using Voyage-3.5
            const { error: insertError } = await supabase
              .from("crawled_content")
              .insert({
                source_id: source.id,
                content_hash: contentHash,
                raw_text: verse.text,
                original_language: "en",
                author: verse.translation_name,
                source_url: `https://bible-api.com/${passage}`,
                copyright_status: source.copyright_status || "public_domain",
                relevance_score,
                quality_score,
                status
              })

            if (insertError) {
              result.errors.push(`Failed to insert ${passage}: ${insertError.message}`)
            }
          }
        } else {
          // TODO: Implement adapters for other sources
          // - Quran Cloud API
          // - Bhagavad Gita API
          // - Sacred Texts scraper
          // - Generic RSS/Atom feeds
          console.log(`Adapter not yet implemented for source: ${source.name} (${source.source_type})`)
          result.errors.push(`Adapter not implemented: ${source.name}`)
        }

        // Step 6: Update crawl_sources
        await supabase
          .from("crawl_sources")
          .update({ last_crawled_at: new Date().toISOString() })
          .eq("id", source.id)

      } catch (sourceError) {
        result.errors.push(`Source ${source.name} failed: ${sourceError.message}`)
      }
    }

    // Step 7: Audit log (fire-and-forget)
    fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/audit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
      },
      body: JSON.stringify({
        event_type: "crawl_completed",
        actor_type: "system",
        details: {
          sources_processed: result.sources_processed,
          items_collected: result.items_collected,
          items_passed: result.items_passed,
          items_failed: result.items_failed,
          errors: result.errors
        }
      })
    }).catch(err => console.error("Audit log failed:", err))

    return new Response(
      JSON.stringify({
        message: "Crawl completed",
        status: "success",
        result
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    )
  }
})
