// supabase/functions/constitution-check/index.ts
// Check content against constitutional principles
// Triggered by: Any content evaluation (submission, revision, amendment)
//
// Process:
// 1. Fetch active constitutional principles
// 2. Evaluate each principle (0-1 score) with Claude Haiku
// 3. Compute weighted average
// 4. Return compliance score

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

type CheckType = "submission" | "revision" | "amendment"

interface ConstitutionCheckRequest {
  text_ko: string
  text_en: string
  check_type: CheckType
  context?: string  // Optional: additional context about the content
}

interface PrincipleEvaluation {
  principle_id: string
  principle_name: string
  principle_weight: number
  score: number  // 0-1
  reasoning: string
  weighted_score: number  // score * weight
}

interface ConstitutionCheckResult {
  overall_compliance: number  // Weighted average
  principle_evaluations: PrincipleEvaluation[]
  compliant: boolean  // overall_compliance >= threshold
  threshold: number
  recommendation: string
  evaluated_at: string
}

// Thresholds by check type
const COMPLIANCE_THRESHOLDS: Record<CheckType, number> = {
  submission: 0.7,   // New content needs 70% compliance
  revision: 0.75,    // Revisions need 75% (stricter)
  amendment: 0.8     // Constitutional changes need 80% (strictest)
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

    const { text_ko, text_en, check_type, context }: ConstitutionCheckRequest = await req.json()

    if (!text_ko || !text_en || !check_type) {
      return new Response(
        JSON.stringify({ error: "text_ko, text_en, and check_type are required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      )
    }

    if (!COMPLIANCE_THRESHOLDS[check_type]) {
      return new Response(
        JSON.stringify({ error: `Invalid check_type. Must be: submission, revision, or amendment` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
      )
    }

    // Step 1 - Fetch active constitutional principles
    const { data: principles, error: fetchError } = await supabase
      .from("constitutional_principles")
      .select("*")
      .eq("is_active", true)
      .order("priority", { ascending: true })

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch principles: ${fetchError.message}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
      )
    }

    if (!principles || principles.length === 0) {
      return new Response(
        JSON.stringify({ error: "No active constitutional principles found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
      )
    }

    // Step 2 - Evaluate each principle with Claude Haiku in parallel
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY")
    if (!anthropicApiKey) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
      )
    }

    const evaluationPromises = principles.map(async (principle): Promise<PrincipleEvaluation> => {
      try {
        const userPrompt = `헌법 원칙:
이름: ${principle.name_ko}
설명: ${principle.description_ko}

평가할 텍스트:
한글: ${text_ko}
영문: ${text_en}
${context ? `\n추가 맥락: ${context}` : ""}

이 텍스트가 해당 원칙을 얼마나 준수하는지 0-1 점수로 평가하세요.
- 0.0: 완전히 위반
- 0.5: 부분적 준수
- 1.0: 완벽한 준수

JSON 형식으로 응답하세요:
{
  "score": number,
  "reasoning": "평가 근거를 한국어로 작성"
}`

        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": anthropicApiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 512,
            temperature: 0.3,
            system: "You are a constitutional compliance evaluator for Beyondr, a spiritual wisdom platform. Evaluate text against the given principle objectively. Always respond in valid JSON.",
            messages: [
              { role: "user", content: userPrompt },
            ],
          }),
        })

        if (!response.ok) {
          const errorBody = await response.text()
          throw new Error(`Claude API error ${response.status}: ${errorBody}`)
        }

        const data = await response.json()
        const content = data.content?.[0]?.text ?? ""

        // Extract JSON from response (handle potential markdown code blocks)
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          throw new Error("No valid JSON found in Claude response")
        }

        const parsed = JSON.parse(jsonMatch[0])
        const score = typeof parsed.score === "number"
          ? Math.max(0, Math.min(1, parsed.score))
          : 0.5
        const reasoning = typeof parsed.reasoning === "string" && parsed.reasoning.length > 0
          ? parsed.reasoning
          : "평가 근거를 생성하지 못했습니다."

        const weightNum = Number(principle.weight)
        return {
          principle_id: principle.code,
          principle_name: principle.name_ko,
          principle_weight: weightNum,
          score,
          reasoning,
          weighted_score: weightNum * score,
        }
      } catch (err) {
        // If a single principle evaluation fails, assign neutral score
        const weightNum = Number(principle.weight)
        return {
          principle_id: principle.code,
          principle_name: principle.name_ko,
          principle_weight: weightNum,
          score: 0.5,
          reasoning: `평가 중 오류 발생: ${err instanceof Error ? err.message : String(err)}`,
          weighted_score: weightNum * 0.5,
        }
      }
    })

    const evaluations = await Promise.all(evaluationPromises)

    // Step 3 & 4 - Compute weighted scores and overall compliance
    const overall_compliance = evaluations.reduce((sum, ev) => sum + ev.weighted_score, 0)

    // Step 5 - Determine compliance status
    const threshold = COMPLIANCE_THRESHOLDS[check_type]
    const compliant = overall_compliance >= threshold

    // Sort evaluations by score ascending (weakest first)
    evaluations.sort((a, b) => a.score - b.score)

    let recommendation: string
    if (compliant) {
      recommendation = "이 콘텐츠는 헌법 기준을 충족합니다."
    } else {
      const weakPrinciples = evaluations
        .filter((ev) => ev.score < threshold)
        .slice(0, 3)
        .map((ev) => ev.principle_name)
      recommendation = `이 콘텐츠는 헌법 기준을 충족하지 못합니다. 다음 원칙을 개선하세요: ${weakPrinciples.join(", ")}`
    }

    // Step 6 - Format and return result
    const result: ConstitutionCheckResult = {
      overall_compliance,
      principle_evaluations: evaluations,
      compliant,
      threshold,
      recommendation,
      evaluated_at: new Date().toISOString(),
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    )
  }
})
