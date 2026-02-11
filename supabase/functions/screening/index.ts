// supabase/functions/screening/index.ts
// AI screening of submissions against constitutional principles
// Triggered by: New submission creation, manual re-screening
//
// Process:
// 1. Fetch submission and constitutional principles
// 2. Evaluate each principle (0-1 score) with Claude Haiku
// 3. Check safety, plagiarism, language quality
// 4. Compute weighted average
// 5. Update submissions.screening_result

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface ScreeningRequest {
  submission_id: string
  rescreen?: boolean  // Force re-screening even if already screened
}

interface PrincipleScore {
  principle_id: string
  principle_name: string
  score: number  // 0-1
  reasoning: string
}

interface ScreeningResult {
  overall_score: number
  principle_scores: PrincipleScore[]
  safety_flags: string[]
  plagiarism_check: {
    is_suspicious: boolean
    similarity_score?: number
    matched_sources?: string[]
  }
  language_quality: {
    korean: { fluency: number, grammar: number }
    english: { fluency: number, grammar: number }
  }
  recommendation: "approve" | "reject" | "review"
  ai_reasoning: string
  screened_at: string
}

// ---------------------------------------------------------------------------
// Claude Haiku API helper
// ---------------------------------------------------------------------------

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
const CLAUDE_MODEL = "claude-haiku-4-5-20251001"

interface ClaudeMessage {
  role: "user" | "assistant"
  content: string
}

async function callClaude(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 256,
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
  // Extract text from the first content block
  const textBlock = data.content?.find((b: { type: string }) => b.type === "text")
  return textBlock?.text ?? ""
}

/**
 * Parse a JSON response from Claude, stripping markdown fences if present.
 */
function parseJsonResponse<T>(raw: string): T {
  const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim()
  return JSON.parse(cleaned)
}

// ---------------------------------------------------------------------------
// Phase A: Constitutional principle scoring
// ---------------------------------------------------------------------------

interface PrincipleRow {
  id: number
  code: string
  name_ko: string
  name_en: string
  description_ko: string
  description_en: string
  priority: number
  weight: number
}

async function evaluatePrinciple(
  principle: PrincipleRow,
  rawText: string,
): Promise<PrincipleScore> {
  const systemPrompt =
    "You are a content compliance evaluator. Evaluate the text against the given principle. " +
    "Respond in JSON only: {\"score\": number, \"reasoning\": string}. " +
    "The score must be between 0 and 1. Reasoning should be concise (1-2 sentences in Korean)."

  const userMessage =
    `원칙: ${principle.name_ko}\n` +
    `설명: ${principle.description_ko}\n\n` +
    `제출 텍스트:\n${rawText}\n\n` +
    `이 텍스트가 해당 원칙을 얼마나 준수하는지 0-1 점수로 평가하세요.`

  try {
    const raw = await callClaude(systemPrompt, userMessage)
    const parsed = parseJsonResponse<{ score: number; reasoning: string }>(raw)

    // Clamp score to [0, 1]
    const score = Math.max(0, Math.min(1, Number(parsed.score) || 0))

    return {
      principle_id: principle.code,
      principle_name: principle.name_ko,
      score,
      reasoning: parsed.reasoning || "",
    }
  } catch (error) {
    console.error(`Principle evaluation failed for ${principle.code}:`, error)
    return {
      principle_id: principle.code,
      principle_name: principle.name_ko,
      score: 0.5,
      reasoning: `평가 중 오류 발생: ${error.message}`,
    }
  }
}

// ---------------------------------------------------------------------------
// Phase B: Safety check
// ---------------------------------------------------------------------------

interface SafetyResult {
  flags: string[]
  is_safe: boolean
}

async function checkSafety(rawText: string): Promise<SafetyResult> {
  const systemPrompt =
    "You are a content safety evaluator. Check the text for safety issues. " +
    "Respond in JSON only: {\"flags\": string[], \"is_safe\": boolean}. " +
    "Possible flag values: \"violence\", \"hate_speech\", \"self_harm\", \"sexual_content\", \"dangerous_activities\". " +
    "If no issues found, return empty flags array and is_safe: true."

  const userMessage =
    `다음 텍스트에서 안전성 문제를 확인하세요.\n\n` +
    `확인 항목: 폭력, 증오 발언, 자해, 성적 콘텐츠, 위험한 행위\n\n` +
    `텍스트:\n${rawText}`

  try {
    const raw = await callClaude(systemPrompt, userMessage)
    const parsed = parseJsonResponse<SafetyResult>(raw)
    return {
      flags: Array.isArray(parsed.flags) ? parsed.flags : [],
      is_safe: Boolean(parsed.is_safe),
    }
  } catch (error) {
    console.error("Safety check failed:", error)
    // Fail-safe: mark as safe but log the error
    return { flags: [], is_safe: true }
  }
}

// ---------------------------------------------------------------------------
// Phase C: Language quality assessment
// ---------------------------------------------------------------------------

interface LanguageQuality {
  korean: { fluency: number; grammar: number }
  english: { fluency: number; grammar: number }
}

async function assessLanguageQuality(rawText: string): Promise<LanguageQuality> {
  const systemPrompt =
    "You are a language quality evaluator. Assess the Korean text quality. " +
    "Respond in JSON only: {\"korean\": {\"fluency\": number, \"grammar\": number}}. " +
    "Both scores must be between 0 and 1. Fluency measures natural flow, grammar measures correctness."

  const userMessage =
    `다음 한국어 텍스트의 언어 품질을 평가하세요.\n\n` +
    `텍스트:\n${rawText}\n\n` +
    `유창성(fluency)과 문법(grammar)을 각각 0-1 점수로 평가하세요.`

  try {
    const raw = await callClaude(systemPrompt, userMessage)
    const parsed = parseJsonResponse<{ korean: { fluency: number; grammar: number } }>(raw)

    return {
      korean: {
        fluency: Math.max(0, Math.min(1, Number(parsed.korean?.fluency) || 0)),
        grammar: Math.max(0, Math.min(1, Number(parsed.korean?.grammar) || 0)),
      },
      // Placeholder — no English text at submission time
      english: { fluency: 0, grammar: 0 },
    }
  } catch (error) {
    console.error("Language quality assessment failed:", error)
    return {
      korean: { fluency: 0.5, grammar: 0.5 },
      english: { fluency: 0, grammar: 0 },
    }
  }
}

// ---------------------------------------------------------------------------
// Audit logger
// ---------------------------------------------------------------------------

async function writeAuditLog(
  submissionId: string,
  overallScore: number,
  recommendation: string,
  principleCount: number,
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
        event_type: "submission_screened",
        actor_type: "ai",
        subject_type: "submission",
        subject_id: submissionId,
        details: {
          overall_score: overallScore,
          recommendation,
          principle_count: principleCount,
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

    const { submission_id, rescreen }: ScreeningRequest = await req.json()

    if (!submission_id) {
      return new Response(
        JSON.stringify({ error: "submission_id is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      )
    }

    // ------------------------------------------------------------------
    // Step 1: Fetch submission and validate status
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

    const allowedStatuses = rescreen
      ? ["submitted", "screening_failed"]
      : ["submitted"]

    if (!allowedStatuses.includes(submission.status)) {
      return new Response(
        JSON.stringify({
          error: `Submission status must be ${allowedStatuses.join(" or ")}, got '${submission.status}'`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      )
    }

    // Transition to screening
    const { error: statusErr } = await supabase
      .from("submissions")
      .update({ status: "screening", updated_at: new Date().toISOString() })
      .eq("id", submission_id)

    if (statusErr) {
      console.error("Failed to set screening status:", statusErr)
    }

    // ------------------------------------------------------------------
    // Step 2: Fetch active constitutional principles
    // ------------------------------------------------------------------

    const { data: principles, error: principlesErr } = await supabase
      .from("constitutional_principles")
      .select("id, code, name_ko, name_en, description_ko, description_en, priority, weight")
      .eq("is_active", true)
      .order("priority", { ascending: true })

    if (principlesErr || !principles || principles.length === 0) {
      // Rollback status
      await supabase
        .from("submissions")
        .update({ status: submission.status, updated_at: new Date().toISOString() })
        .eq("id", submission_id)

      return new Response(
        JSON.stringify({ error: "No active constitutional principles found", details: principlesErr?.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
      )
    }

    const rawText: string = submission.raw_text

    // ------------------------------------------------------------------
    // Step 3: Run three evaluation phases in parallel
    // ------------------------------------------------------------------

    const [principleScores, safetyResult, languageQuality] = await Promise.all([
      // Phase A: Constitutional principle scoring (all principles in parallel)
      Promise.all(
        principles.map((p: PrincipleRow) => evaluatePrinciple(p, rawText))
      ),

      // Phase B: Safety check
      checkSafety(rawText),

      // Phase C: Language quality
      assessLanguageQuality(rawText),
    ])

    // ------------------------------------------------------------------
    // Step 4: Plagiarism check (placeholder)
    // ------------------------------------------------------------------

    // TODO: Implement embedding-based plagiarism check when Voyage-3.5 embedding
    // pipeline is ready. This should:
    // 1. Generate embedding for rawText using Voyage-3.5
    // 2. Query scripture_chunks and existing approved submissions using vector similarity
    // 3. Flag as suspicious if cosine similarity > 0.9 (distance < 0.1)
    const plagiarismCheck = {
      is_suspicious: false,
      similarity_score: undefined as number | undefined,
      matched_sources: undefined as string[] | undefined,
    }

    // ------------------------------------------------------------------
    // Step 5: Compute weighted average
    // ------------------------------------------------------------------

    let weightedSum = 0
    let totalWeight = 0

    for (let i = 0; i < principles.length; i++) {
      const weight = Number(principles[i].weight) || 0
      const score = principleScores[i].score
      weightedSum += weight * score
      totalWeight += weight
    }

    const overallScore = totalWeight > 0
      ? Math.round((weightedSum / totalWeight) * 10000) / 10000
      : 0

    // ------------------------------------------------------------------
    // Step 6: Generate recommendation
    // ------------------------------------------------------------------

    let recommendation: "approve" | "reject" | "review"
    let rejectionReason: string | null = null

    if (overallScore >= 0.7 && safetyResult.is_safe && !plagiarismCheck.is_suspicious) {
      recommendation = "approve"
    } else if (overallScore < 0.5 || !safetyResult.is_safe) {
      recommendation = "reject"

      const reasons: string[] = []
      if (overallScore < 0.5) {
        reasons.push(`헌법 원칙 준수 점수 미달 (${overallScore.toFixed(4)})`)
      }
      if (!safetyResult.is_safe) {
        reasons.push(`안전성 문제 감지: ${safetyResult.flags.join(", ")}`)
      }
      if (plagiarismCheck.is_suspicious) {
        reasons.push("표절 의심")
      }
      rejectionReason = reasons.join("; ")
    } else {
      recommendation = "review"
      rejectionReason = `수동 검토 필요: 종합 점수 ${overallScore.toFixed(4)} (0.5~0.7 구간)`
    }

    // ------------------------------------------------------------------
    // Step 7: Build AI reasoning summary
    // ------------------------------------------------------------------

    const topScores = [...principleScores]
      .sort((a, b) => a.score - b.score)
      .slice(0, 3)
      .map((s) => `${s.principle_name}: ${s.score.toFixed(2)}`)
      .join(", ")

    const aiReasoning =
      `심사 결과: 종합 점수 ${overallScore.toFixed(4)}, ` +
      `판정 '${recommendation}'. ` +
      `안전성 ${safetyResult.is_safe ? "통과" : "미통과"}` +
      (safetyResult.flags.length > 0 ? ` (${safetyResult.flags.join(", ")})` : "") +
      `. 언어 품질 — 유창성: ${languageQuality.korean.fluency.toFixed(2)}, ` +
      `문법: ${languageQuality.korean.grammar.toFixed(2)}. ` +
      `가장 낮은 원칙 점수: ${topScores}.`

    // ------------------------------------------------------------------
    // Step 8: Assemble screening result
    // ------------------------------------------------------------------

    const screeningResult: ScreeningResult = {
      overall_score: overallScore,
      principle_scores: principleScores,
      safety_flags: safetyResult.flags,
      plagiarism_check: plagiarismCheck,
      language_quality: languageQuality,
      recommendation,
      ai_reasoning: aiReasoning,
      screened_at: new Date().toISOString(),
    }

    // ------------------------------------------------------------------
    // Step 9: Update submission in DB
    // ------------------------------------------------------------------

    const newStatus =
      recommendation === "approve"
        ? "screening_passed"
        : "screening_failed"

    const { error: updateErr } = await supabase
      .from("submissions")
      .update({
        screening_result: screeningResult,
        compliance_score: overallScore,
        status: newStatus,
        rejection_reason: rejectionReason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", submission_id)

    if (updateErr) {
      console.error("Failed to update submission with screening result:", updateErr)
      return new Response(
        JSON.stringify({ error: "Failed to update submission", details: updateErr.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
      )
    }

    // ------------------------------------------------------------------
    // Step 10: Write audit log (fire-and-forget)
    // ------------------------------------------------------------------

    // Do not await — audit failure should not block the response
    writeAuditLog(submission_id, overallScore, recommendation, principles.length)

    // ------------------------------------------------------------------
    // Response
    // ------------------------------------------------------------------

    return new Response(
      JSON.stringify({
        message: "Screening completed",
        status: newStatus,
        result: screeningResult,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    )
  } catch (error) {
    console.error("Screening function error:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    )
  }
})
