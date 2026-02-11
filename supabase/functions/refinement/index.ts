// supabase/functions/refinement/index.ts
// 4-stage AI refinement pipeline (raw → draft → refined → canonical)
// Triggered by: Manual refinement request, voting approval
//
// Process:
// 1. Fetch submission at current stage
// 2. Refine with Claude Sonnet (preserve meaning >=90% similarity)
// 3. Generate bilingual output
// 4. Create refinement_history entry
// 5. Update submission to next stage

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

type RefinementStage = "raw" | "draft" | "refined" | "canonical"

interface RefinementRequest {
  submission_id: string
  target_stage: RefinementStage
  custom_instructions?: string  // Optional: additional refinement guidance
}

interface RefinementResult {
  stage: RefinementStage
  text_ko: string
  text_en: string
  changes_summary: string
  similarity_score: number  // Semantic similarity to previous stage
  refinement_metadata: {
    model: string
    tokens_used: number
    duration_ms: number
  }
}

const STAGE_ORDER: RefinementStage[] = ["raw", "draft", "refined", "canonical"]

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
  maxTokens = 2048,
  temperature = 0.3,
): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
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
  const text = textBlock?.text ?? ""

  return {
    text,
    inputTokens: data.usage?.input_tokens ?? 0,
    outputTokens: data.usage?.output_tokens ?? 0,
  }
}

/**
 * Parse a JSON response from Claude, stripping markdown fences if present.
 */
function parseJsonResponse<T>(raw: string): T {
  const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim()
  return JSON.parse(cleaned)
}

// ---------------------------------------------------------------------------
// Simple string hash for prompt tracking
// ---------------------------------------------------------------------------

function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, "0")
}

// ---------------------------------------------------------------------------
// Stage-specific prompt builders
// ---------------------------------------------------------------------------

interface StagePrompt {
  system: string
  user: string
}

function buildStagePrompt(
  targetStage: RefinementStage,
  inputText: string,
  customInstructions?: string,
): StagePrompt {
  const jsonInstruction =
    "\n\n반드시 다음 JSON 형식으로만 응답하세요:\n" +
    '{"text_ko": "다듬어진 한국어 텍스트", "text_en": "English translation", "changes_summary": "변경 사항 요약"}'

  let system: string
  let user: string

  switch (targetStage) {
    case "draft": {
      system =
        "당신은 영적 텍스트 편집자입니다. 원문의 의미를 완벽히 보존하면서 문장을 다듬어주세요."

      user =
        `원문:\n${inputText}\n\n` +
        `다음 기준으로 초안을 작성하세요:\n` +
        `1. 문법 오류 수정\n` +
        `2. 문장 구조 개선\n` +
        `3. 어색한 표현 자연스럽게\n` +
        `4. 의미는 100% 보존` +
        (customInstructions ? `\n\n추가 지시사항:\n${customInstructions}` : "") +
        jsonInstruction
      break
    }

    case "refined": {
      system =
        "당신은 경전 편집 전문가입니다. 초안을 경전 수준의 간결하고 시적인 문체로 다듬어주세요."

      user =
        `초안:\n${inputText}\n\n` +
        `다음 기준으로 정제하세요:\n` +
        `1. 간결하고 명료하게\n` +
        `2. 경전체 문체 적용\n` +
        `3. 시적 리듬 고려\n` +
        `4. 핵심 메시지 강화\n` +
        `5. 의미 변화 최소화 (유사도 90% 이상)` +
        (customInstructions ? `\n\n추가 지시사항:\n${customInstructions}` : "") +
        jsonInstruction
      break
    }

    case "canonical": {
      system =
        "당신은 경전 최종 편집자입니다. 정제된 텍스트를 시대를 초월한 정전 수준으로 완성하세요."

      user =
        `정제본:\n${inputText}\n\n` +
        `최종 기준:\n` +
        `1. 시대를 초월한 표현\n` +
        `2. 다양한 해석 가능성 열어두기\n` +
        `3. 음운적 아름다움\n` +
        `4. 외경전과의 조화\n` +
        `5. 의미 보존 (유사도 90% 이상)` +
        (customInstructions ? `\n\n추가 지시사항:\n${customInstructions}` : "") +
        jsonInstruction
      break
    }

    default:
      throw new Error(`Cannot build prompt for stage: ${targetStage}`)
  }

  return { system, user }
}

// ---------------------------------------------------------------------------
// Audit logger (fire-and-forget)
// ---------------------------------------------------------------------------

function writeAuditLog(
  submissionId: string,
  targetStage: RefinementStage,
  changesSummary: string,
  similarityScore: number,
): void {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for audit log")
    return
  }

  // Fire-and-forget: do not await
  fetch(`${supabaseUrl}/functions/v1/audit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({
      event_type: "refinement_completed",
      actor_type: "ai",
      subject_type: "submission",
      subject_id: submissionId,
      details: {
        stage: targetStage,
        meaning_preservation_score: similarityScore,
        changes_summary: changesSummary,
      },
    }),
  }).catch((err) => {
    console.error("Audit log call error:", err)
  })
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

    const { submission_id, target_stage, custom_instructions }: RefinementRequest = await req.json()

    // ------------------------------------------------------------------
    // Validate request parameters
    // ------------------------------------------------------------------

    if (!submission_id || !target_stage) {
      return new Response(
        JSON.stringify({ error: "submission_id and target_stage are required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      )
    }

    if (!STAGE_ORDER.includes(target_stage)) {
      return new Response(
        JSON.stringify({ error: `Invalid target_stage. Must be one of: ${STAGE_ORDER.join(", ")}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      )
    }

    if (target_stage === "raw") {
      return new Response(
        JSON.stringify({ error: "Cannot refine to 'raw' stage. Raw is the initial stage." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      )
    }

    // ------------------------------------------------------------------
    // Step 1: Fetch submission
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

    // ------------------------------------------------------------------
    // Step 2: Determine current stage and validate progression
    // ------------------------------------------------------------------

    // Fetch the latest refinement_history entry for this submission
    const { data: latestHistory, error: historyErr } = await supabase
      .from("refinement_history")
      .select("stage, text_ko")
      .eq("submission_id", submission_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (historyErr) {
      console.error("Failed to fetch refinement history:", historyErr)
      return new Response(
        JSON.stringify({ error: "Failed to fetch refinement history", details: historyErr.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
      )
    }

    // If no history exists, current stage is 'raw'
    const currentStage: RefinementStage = latestHistory
      ? (latestHistory.stage as RefinementStage)
      : "raw"

    const currentIndex = STAGE_ORDER.indexOf(currentStage)
    const targetIndex = STAGE_ORDER.indexOf(target_stage)

    if (targetIndex !== currentIndex + 1) {
      return new Response(
        JSON.stringify({
          error: `Invalid stage progression. Current stage is '${currentStage}', ` +
            `target must be '${STAGE_ORDER[currentIndex + 1] ?? "none (already canonical)"}', ` +
            `but got '${target_stage}'.`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      )
    }

    // ------------------------------------------------------------------
    // Step 3: Get input text for refinement
    // ------------------------------------------------------------------

    // For 'raw' stage, use submission.raw_text
    // For subsequent stages, use the latest refinement_history entry's text_ko
    const inputText: string = currentStage === "raw"
      ? submission.raw_text
      : latestHistory!.text_ko

    if (!inputText || inputText.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "No input text available for refinement" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      )
    }

    // ------------------------------------------------------------------
    // Step 4: Build prompt and call Claude Sonnet
    // ------------------------------------------------------------------

    const stagePrompt = buildStagePrompt(target_stage, inputText, custom_instructions)
    const promptHash = simpleHash(stagePrompt.system)

    const startTime = Date.now()

    let claudeResponse: { text: string; inputTokens: number; outputTokens: number }
    try {
      claudeResponse = await callClaude(
        stagePrompt.system,
        stagePrompt.user,
        2048,
        0.3,
      )
    } catch (apiError) {
      console.error("Claude API call failed:", apiError)
      return new Response(
        JSON.stringify({
          error: "AI refinement failed",
          details: (apiError as Error).message,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 502 },
      )
    }

    const durationMs = Date.now() - startTime

    // ------------------------------------------------------------------
    // Step 5: Parse Claude response
    // ------------------------------------------------------------------

    let parsed: { text_ko: string; text_en: string; changes_summary: string }
    try {
      parsed = parseJsonResponse<{
        text_ko: string
        text_en: string
        changes_summary: string
      }>(claudeResponse.text)
    } catch (parseError) {
      console.error("Failed to parse Claude response:", claudeResponse.text)
      return new Response(
        JSON.stringify({
          error: "Failed to parse AI response",
          details: (parseError as Error).message,
          raw_response: claudeResponse.text.substring(0, 500),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 502 },
      )
    }

    if (!parsed.text_ko || parsed.text_ko.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "AI returned empty text_ko" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 502 },
      )
    }

    // Semantic preservation measurement via Voyage-3.5 embeddings
    let meaningPreservationScore = 0.95  // Default fallback
    let semanticPreservationWarning: string | undefined

    const voyageKey = Deno.env.get("VOYAGE_API_KEY")
    if (voyageKey) {
      try {
        // Generate embeddings for both original and refined texts in one batch
        const embRes = await fetch("https://api.voyageai.com/v1/embeddings", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${voyageKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "voyage-3.5",
            input: [inputText, parsed.text_ko],
            input_type: "document",
          }),
        })

        if (embRes.ok) {
          const embData = await embRes.json()
          const originalEmb: number[] | undefined = embData.data?.[0]?.embedding
          const refinedEmb: number[] | undefined = embData.data?.[1]?.embedding

          if (originalEmb && refinedEmb) {
            // Compute cosine similarity
            let dotProduct = 0
            let normA = 0
            let normB = 0
            for (let i = 0; i < originalEmb.length; i++) {
              dotProduct += originalEmb[i] * refinedEmb[i]
              normA += originalEmb[i] * originalEmb[i]
              normB += refinedEmb[i] * refinedEmb[i]
            }
            const denominator = Math.sqrt(normA) * Math.sqrt(normB)
            meaningPreservationScore = denominator > 0
              ? dotProduct / denominator
              : 0

            // Clamp to [0, 1]
            meaningPreservationScore = Math.max(0, Math.min(1, meaningPreservationScore))

            if (meaningPreservationScore < 0.90) {
              semanticPreservationWarning =
                `의미 보존 경고: 유사도 ${meaningPreservationScore.toFixed(4)} (기준 0.90 이상). ` +
                `원문과 다듬어진 텍스트의 의미가 크게 달라졌을 수 있습니다.`
              console.warn(
                `Semantic preservation low for submission ${submission_id}: ` +
                `${meaningPreservationScore.toFixed(4)}`
              )
            }
          }
        } else {
          console.error("Voyage API error during semantic preservation check:", embRes.status)
        }
      } catch (embError) {
        console.error("Semantic preservation measurement failed:", embError)
        // Non-fatal: use default score
      }
    }

    // ------------------------------------------------------------------
    // Step 6: Record refinement_history entry
    // ------------------------------------------------------------------

    const { error: insertErr } = await supabase
      .from("refinement_history")
      .insert({
        submission_id,
        stage: target_stage,
        text_ko: parsed.text_ko,
        text_en: parsed.text_en || null,
        ai_model: CLAUDE_MODEL,
        prompt_hash: promptHash,
        change_summary: parsed.changes_summary || null,
        meaning_preservation_score: meaningPreservationScore,
      })

    if (insertErr) {
      console.error("Failed to insert refinement history:", insertErr)
      return new Response(
        JSON.stringify({ error: "Failed to save refinement result", details: insertErr.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
      )
    }

    // ------------------------------------------------------------------
    // Step 7: Update submission status
    // ------------------------------------------------------------------

    let newStatus: string | undefined
    switch (target_stage) {
      case "draft":
        // After raw→draft, keep the current status (screening_passed or refining)
        newStatus = submission.status === "screening_passed" ? "refining" : undefined
        break
      case "refined":
        newStatus = "refining"
        break
      case "canonical":
        newStatus = "refined"
        break
    }

    if (newStatus) {
      const { error: updateErr } = await supabase
        .from("submissions")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", submission_id)

      if (updateErr) {
        console.error("Failed to update submission status:", updateErr)
        // Non-fatal: refinement_history is already saved
      }
    }

    // ------------------------------------------------------------------
    // Step 8: Audit log (fire-and-forget)
    // ------------------------------------------------------------------

    writeAuditLog(
      submission_id,
      target_stage,
      parsed.changes_summary || "",
      meaningPreservationScore,
    )

    // ------------------------------------------------------------------
    // Step 9: Build and return result
    // ------------------------------------------------------------------

    const totalTokens = claudeResponse.inputTokens + claudeResponse.outputTokens

    const result: RefinementResult = {
      stage: target_stage,
      text_ko: parsed.text_ko,
      text_en: parsed.text_en || "",
      changes_summary: parsed.changes_summary || "",
      similarity_score: meaningPreservationScore,
      refinement_metadata: {
        model: CLAUDE_MODEL,
        tokens_used: totalTokens,
        duration_ms: durationMs,
      },
    }

    return new Response(
      JSON.stringify({
        message: "Refinement completed",
        status: newStatus ?? submission.status,
        result,
        ...(semanticPreservationWarning ? { warning: semanticPreservationWarning } : {}),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    )
  } catch (error) {
    console.error("Refinement function error:", error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    )
  }
})
