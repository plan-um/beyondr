// supabase/functions/placement/index.ts
// Place approved content into scripture
// Triggered by: Voting approval
//
// Process:
// 1. Validate submission (status='approved')
// 2. Get canonical text from refinement_history
// 3. Determine chapter placement using Claude Sonnet
// 4. Assign verse number
// 5. Create scripture_chunk entry
// 6. Create initial scripture_version
// 7. Update submission status to 'registered'
// 8. Log audit trail

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface PlacementRequest {
  submission_id: string
  force_chapter?: number  // Optional: manually specify chapter
  force_position?: number // Optional: manually specify verse position
}

interface PlacementResult {
  scripture_chunk_id: string
  chapter: number
  verse: number
  position_reasoning: string
  similar_verses: Array<{
    id: string
    chapter: number
    verse: number
    similarity_score?: number
    content_preview: string
  }>
  theme: string
}

// ---------------------------------------------------------------------------
// Claude Sonnet API helper
// ---------------------------------------------------------------------------

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
const CLAUDE_MODEL = "claude-sonnet-4-5-20250929"

interface ClaudeMessage {
  role: "user" | "assistant"
  content: string
}

async function callClaude(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 1024,
  temperature = 0.3,
): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY")
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured")

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }] as ClaudeMessage[],
    }),
  })

  if (!response.ok) {
    const errBody = await response.text()
    throw new Error(`Claude API error ${response.status}: ${errBody}`)
  }

  const data = await response.json()
  const textBlock = data.content?.find((b: { type: string }) => b.type === "text")
  return textBlock?.text ?? ""
}

function parseJsonResponse<T>(raw: string): T {
  const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim()
  return JSON.parse(cleaned)
}

// ---------------------------------------------------------------------------
// Chapter placement determination
// ---------------------------------------------------------------------------

interface ChapterInfo {
  chapter: number
  theme: string
  verse_count: number
}

interface PlacementAnalysis {
  chapter: number
  theme: string
  reasoning: string
  suggested_traditions: string[]
  suggested_traditions_en: string[]
  reflection_ko: string
  reflection_en: string
}

async function determineChapterPlacement(
  textKo: string,
  textEn: string,
  existingChapters: ChapterInfo[],
): Promise<PlacementAnalysis> {
  const systemPrompt =
    "당신은 경전 편집자입니다. 새 구절의 최적 위치를 결정하세요. " +
    "기존 장들의 주제를 고려하여 가장 어울리는 장을 선택하거나, 새 장을 제안하세요. " +
    "응답은 반드시 JSON 형식으로만 작성하세요."

  const chaptersInfo = existingChapters.length > 0
    ? existingChapters.map(c => `${c.chapter}장: ${c.theme} (${c.verse_count}절)`).join("\n")
    : "아직 경전에 장이 없습니다. 첫 장을 만들어야 합니다."

  const userMessage =
    `새 구절:\n` +
    `한글: ${textKo}\n` +
    `영문: ${textEn}\n\n` +
    `기존 장 목록:\n${chaptersInfo}\n\n` +
    `다음 정보를 JSON 형식으로 제공하세요:\n` +
    `{\n` +
    `  "chapter": <어느 장에 배치할지 숫자, 새 장이면 다음 번호>,\n` +
    `  "theme": "<주제 이름>",\n` +
    `  "reasoning": "<배치 이유를 한글로 2-3문장>",\n` +
    `  "suggested_traditions": ["<관련 전통1>", "<관련 전통2>"],\n` +
    `  "suggested_traditions_en": ["<tradition1>", "<tradition2>"],\n` +
    `  "reflection_ko": "<이 구절에 대한 짧은 성찰, 50-100자>",\n` +
    `  "reflection_en": "<short reflection on this verse, 50-100 chars>"\n` +
    `}`

  try {
    const raw = await callClaude(systemPrompt, userMessage)
    const parsed = parseJsonResponse<PlacementAnalysis>(raw)

    // Validate chapter number
    if (!Number.isInteger(parsed.chapter) || parsed.chapter < 1) {
      throw new Error("Invalid chapter number in Claude response")
    }

    return parsed
  } catch (error) {
    console.error("Chapter placement analysis failed:", error)

    // Fallback: place in existing largest chapter or create chapter 1
    const fallbackChapter = existingChapters.length > 0
      ? existingChapters.reduce((max, c) => c.verse_count > max.verse_count ? c : max).chapter
      : 1

    return {
      chapter: fallbackChapter,
      theme: existingChapters.find(c => c.chapter === fallbackChapter)?.theme || "지혜",
      reasoning: `AI 분석 실패로 인한 자동 배치: ${error.message}`,
      suggested_traditions: [],
      suggested_traditions_en: [],
      reflection_ko: "",
      reflection_en: "",
    }
  }
}

// ---------------------------------------------------------------------------
// Audit logger
// ---------------------------------------------------------------------------

async function writeAuditLog(
  submissionId: string,
  chunkId: string,
  chapter: number,
  verse: number,
  theme: string,
): Promise<void> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for audit log")
    return
  }

  try {
    const resp = await fetch(`${supabaseUrl}/functions/v1/audit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        event_type: "content_placed",
        actor_type: "system",
        subject_type: "scripture_chunk",
        subject_id: chunkId,
        details: {
          submission_id: submissionId,
          chapter,
          verse,
          theme,
        },
      }),
    })

    if (!resp.ok) {
      const errText = await resp.text()
      console.error("Audit log call failed:", resp.status, errText)
    }
  } catch (error) {
    console.error("Audit log call error:", error)
  }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    )

    const { submission_id, force_chapter, force_position }: PlacementRequest = await req.json()

    if (!submission_id) {
      return new Response(
        JSON.stringify({ error: "submission_id is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      )
    }

    // ------------------------------------------------------------------
    // Step 1: Validate submission
    // ------------------------------------------------------------------

    const { data: submission, error: fetchErr } = await supabase
      .from("submissions")
      .select("*")
      .eq("id", submission_id)
      .single()

    if (fetchErr || !submission) {
      return new Response(
        JSON.stringify({ error: "Submission not found", details: fetchErr?.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 },
      )
    }

    if (submission.status !== "approved") {
      return new Response(
        JSON.stringify({
          error: `Submission must have status 'approved', got '${submission.status}'`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      )
    }

    // ------------------------------------------------------------------
    // Step 2: Get canonical text from refinement_history
    // ------------------------------------------------------------------

    const { data: refinements, error: refinementErr } = await supabase
      .from("refinement_history")
      .select("text_ko, text_en")
      .eq("submission_id", submission_id)
      .eq("stage", "canonical")
      .order("created_at", { ascending: false })
      .limit(1)

    let textKo: string
    let textEn: string

    if (refinementErr || !refinements || refinements.length === 0) {
      // Fallback to raw_text if no canonical refinement exists
      console.warn(`No canonical refinement found for ${submission_id}, using raw_text`)
      textKo = submission.raw_text
      textEn = "" // English translation should be created during refinement
    } else {
      textKo = refinements[0].text_ko
      textEn = refinements[0].text_en || ""
    }

    if (!textKo) {
      return new Response(
        JSON.stringify({ error: "No Korean text available for placement" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      )
    }

    // ------------------------------------------------------------------
    // Step 3: Fetch existing chapters for placement analysis
    // ------------------------------------------------------------------

    const { data: existingChapters, error: chaptersErr } = await supabase
      .from("scripture_chunks")
      .select("chapter, theme")
      .eq("is_archived", false)
      .order("chapter", { ascending: true })

    if (chaptersErr) {
      console.error("Failed to fetch existing chapters:", chaptersErr)
      return new Response(
        JSON.stringify({ error: "Failed to fetch existing chapters", details: chaptersErr.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
      )
    }

    // Aggregate chapters with verse counts
    const chapterMap = new Map<number, ChapterInfo>()
    for (const row of existingChapters || []) {
      const ch = Number(row.chapter)
      if (chapterMap.has(ch)) {
        chapterMap.get(ch)!.verse_count += 1
      } else {
        chapterMap.set(ch, {
          chapter: ch,
          theme: row.theme || "",
          verse_count: 1,
        })
      }
    }
    const chapters = Array.from(chapterMap.values())

    // ------------------------------------------------------------------
    // Step 4: Determine chapter placement
    // ------------------------------------------------------------------

    let chapter: number
    let theme: string
    let reasoning: string
    let suggestedTraditions: string[]
    let suggestedTraditionsEn: string[]
    let reflectionKo: string
    let reflectionEn: string

    if (force_chapter) {
      chapter = force_chapter
      const existing = chapters.find(c => c.chapter === force_chapter)
      theme = existing?.theme || "지혜"
      reasoning = `사용자가 ${force_chapter}장에 수동으로 배치함`
      suggestedTraditions = []
      suggestedTraditionsEn = []
      reflectionKo = ""
      reflectionEn = ""
    } else {
      const analysis = await determineChapterPlacement(textKo, textEn, chapters)
      chapter = analysis.chapter
      theme = analysis.theme
      reasoning = analysis.reasoning
      suggestedTraditions = analysis.suggested_traditions
      suggestedTraditionsEn = analysis.suggested_traditions_en
      reflectionKo = analysis.reflection_ko
      reflectionEn = analysis.reflection_en
    }

    // ------------------------------------------------------------------
    // Step 5: Determine verse number
    // ------------------------------------------------------------------

    let verse: number

    if (force_position) {
      verse = force_position
    } else {
      const { data: maxVerseData, error: maxVerseErr } = await supabase
        .from("scripture_chunks")
        .select("verse")
        .eq("chapter", chapter)
        .order("verse", { ascending: false })
        .limit(1)

      if (maxVerseErr) {
        console.error("Failed to query max verse:", maxVerseErr)
        return new Response(
          JSON.stringify({ error: "Failed to determine verse number", details: maxVerseErr.message }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
        )
      }

      const maxVerse = maxVerseData && maxVerseData.length > 0 ? Number(maxVerseData[0].verse) : 0
      verse = maxVerse + 1
    }

    // ------------------------------------------------------------------
    // Step 6: Generate chunk ID
    // ------------------------------------------------------------------

    const chunkId = `${chapter}:${verse}`

    // Check for collision (should not happen unless force_position is used without gap)
    const { data: existingChunk } = await supabase
      .from("scripture_chunks")
      .select("id")
      .eq("id", chunkId)
      .single()

    if (existingChunk) {
      return new Response(
        JSON.stringify({
          error: `Chunk ID ${chunkId} already exists. Use a different force_position or let the system auto-assign.`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 409 },
      )
    }

    // ------------------------------------------------------------------
    // Step 7: Create scripture_chunk
    // ------------------------------------------------------------------

    const { data: newChunk, error: insertErr } = await supabase
      .from("scripture_chunks")
      .insert({
        id: chunkId,
        chapter,
        verse,
        text_ko: textKo,
        text_en: textEn,
        traditions: suggestedTraditions,
        traditions_en: suggestedTraditionsEn,
        theme,
        reflection_ko: reflectionKo,
        reflection_en: reflectionEn,
        origin_type: "user_submission",
        origin_submission_id: submission_id,
        version: 1,
        is_archived: false,
      })
      .select("id, chapter, verse, theme")
      .single()

    if (insertErr || !newChunk) {
      console.error("Failed to insert scripture_chunk:", insertErr)
      return new Response(
        JSON.stringify({ error: "Failed to create scripture chunk", details: insertErr?.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
      )
    }

    // ------------------------------------------------------------------
    // Step 8: Create initial scripture_version
    // ------------------------------------------------------------------

    const { error: versionErr } = await supabase
      .from("scripture_versions")
      .insert({
        chunk_id: chunkId,
        version: 1,
        text_ko: textKo,
        text_en: textEn,
        traditions: suggestedTraditions,
        traditions_en: suggestedTraditionsEn,
        reflection_ko: reflectionKo,
        reflection_en: reflectionEn,
        change_type: "founding",
        change_summary: "Initial placement via community approval",
        changed_by: null, // System-initiated
        voting_session_id: null, // TODO: Link to voting session if available
      })

    if (versionErr) {
      console.error("Failed to create scripture_version:", versionErr)
      // Non-fatal — chunk is already created
    }

    // ------------------------------------------------------------------
    // Step 9: Update submission status to 'registered'
    // ------------------------------------------------------------------

    const { error: updateErr } = await supabase
      .from("submissions")
      .update({
        status: "registered",
        related_chunk_id: chunkId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", submission_id)

    if (updateErr) {
      console.error("Failed to update submission status:", updateErr)
      // Non-fatal — chunk is already created
    }

    // ------------------------------------------------------------------
    // Step 10: Write audit log (fire-and-forget)
    // ------------------------------------------------------------------

    writeAuditLog(submission_id, chunkId, chapter, verse, theme)

    // ------------------------------------------------------------------
    // Step 11: Assemble result
    // ------------------------------------------------------------------

    // TODO: Implement embedding-based similarity search when Voyage-3.5 integration is ready
    // For now, return empty similar_verses array
    const similarVerses: Array<{
      id: string
      chapter: number
      verse: number
      content_preview: string
    }> = []

    const result: PlacementResult = {
      scripture_chunk_id: chunkId,
      chapter,
      verse,
      position_reasoning: reasoning,
      similar_verses: similarVerses,
      theme,
    }

    return new Response(
      JSON.stringify({
        message: "Content successfully placed into scripture",
        status: "registered",
        result,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    )
  } catch (error) {
    console.error("Placement function error:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    )
  }
})
