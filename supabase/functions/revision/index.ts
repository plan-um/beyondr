// supabase/functions/revision/index.ts
// Handle scripture revision proposals
// Actions: propose, screen, start_discussion, ai_analysis, start_vote, apply_revision, reject_revision
//
// Process:
// 1. User proposes revision to existing verse
// 2. AI screens for constitutional compliance
// 3. Community discussion period (7 days) + AI council analysis
// 4. AI generates comprehensive revision analysis
// 5. Voting (70% approval threshold)
// 6. Apply revision and create version history

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

type RevisionAction =
  | "propose"
  | "screen"
  | "start_discussion"
  | "ai_analysis"
  | "start_vote"
  | "apply_revision"
  | "reject_revision"

interface RevisionRequest {
  action: RevisionAction
  revision_id?: string
  chunk_id?: string
  proposed_text_ko?: string
  proposed_text_en?: string
  reasoning?: string
  proposer_id?: string
}

interface RevisionProposal {
  revision_id: string
  chunk_id: string
  original_text: { ko: string; en: string }
  proposed_text: { ko: string; en: string }
  reasoning: string
  status: "proposed" | "screening" | "discussion" | "refining" | "voting" | "approved" | "rejected" | "withdrawn"
  constitutional_score: number
  discussion_summary?: string
  ai_analysis?: string
}

// ---------------------------------------------------------------------------
// Claude API helpers
// ---------------------------------------------------------------------------

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
const CLAUDE_HAIKU = "claude-haiku-4-5-20251001"
const CLAUDE_SONNET = "claude-sonnet-4-5-20250929"

async function callClaude(
  model: string,
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
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
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
// Audit logger (fire-and-forget)
// ---------------------------------------------------------------------------

function writeAuditLog(
  eventType: string,
  actorType: "human" | "ai" | "system",
  actorId: string | null,
  subjectId: string,
  details: Record<string, unknown>,
): void {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for audit log")
    return
  }

  fetch(`${supabaseUrl}/functions/v1/audit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({
      event_type: eventType,
      actor_type: actorType,
      actor_id: actorId,
      subject_type: "revision_proposal",
      subject_id: subjectId,
      details,
    }),
  }).catch((err) => {
    console.error("Audit log call error:", err)
  })
}

// ---------------------------------------------------------------------------
// Helper: JSON response builder
// ---------------------------------------------------------------------------

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  })
}

function errorResponse(error: string, status = 400, details?: string): Response {
  return jsonResponse({ error, ...(details ? { details } : {}) }, status)
}

// ---------------------------------------------------------------------------
// Action handlers
// ---------------------------------------------------------------------------

async function handlePropose(
  supabase: ReturnType<typeof createClient>,
  req: RevisionRequest,
): Promise<Response> {
  const { chunk_id, proposed_text_ko, proposed_text_en, reasoning, proposer_id } = req

  // Validate required fields
  if (!chunk_id || !proposed_text_ko || !proposed_text_en || !reasoning || !proposer_id) {
    return errorResponse(
      "chunk_id, proposed_text_ko, proposed_text_en, reasoning, and proposer_id are required",
    )
  }

  // Step 1: Fetch existing scripture chunk
  const { data: chunk, error: chunkErr } = await supabase
    .from("scripture_chunks")
    .select("id, text_ko, text_en, traditions, version")
    .eq("id", chunk_id)
    .single()

  if (chunkErr || !chunk) {
    return errorResponse("Scripture chunk not found", 404, chunkErr?.message)
  }

  // Step 2: Check cooldown for this proposer + chunk combination
  const { data: cooldownRows, error: cooldownErr } = await supabase
    .from("revision_proposals")
    .select("cooldown_until")
    .eq("chunk_id", chunk_id)
    .eq("proposed_by", proposer_id)
    .gt("cooldown_until", new Date().toISOString())
    .limit(1)

  if (cooldownErr) {
    console.error("Cooldown check failed:", cooldownErr)
  }

  if (cooldownRows && cooldownRows.length > 0) {
    const cooldownUntil = cooldownRows[0].cooldown_until
    return errorResponse(
      `You are in a cooldown period for this chunk until ${cooldownUntil}. Please try again later.`,
      429,
    )
  }

  // Step 3: Insert revision proposal
  const { data: proposal, error: insertErr } = await supabase
    .from("revision_proposals")
    .insert({
      chunk_id,
      proposed_by: proposer_id,
      revision_type: "minor_text", // Auto-classify as minor_text by default (TODO: embedding-based classification)
      current_text_ko: chunk.text_ko,
      current_text_en: chunk.text_en,
      proposed_text_ko,
      proposed_text_en,
      reason: reasoning,
      status: "proposed",
    })
    .select("*")
    .single()

  if (insertErr || !proposal) {
    return errorResponse("Failed to create revision proposal", 500, insertErr?.message)
  }

  // Audit log
  writeAuditLog("revision_proposed", "human", proposer_id, proposal.id, {
    chunk_id,
    action: "propose",
    status: "proposed",
  })

  // Step 4: Immediately trigger screening
  const screenResult = await handleScreen(supabase, { action: "screen", revision_id: proposal.id })

  // Return the screen result which includes the proposal state after screening
  const screenBody = await screenResult.json()

  return jsonResponse({
    message: "Revision proposed and screened",
    proposal_id: proposal.id,
    screening: screenBody,
  })
}

async function handleScreen(
  supabase: ReturnType<typeof createClient>,
  req: RevisionRequest,
): Promise<Response> {
  const { revision_id } = req

  if (!revision_id) {
    return errorResponse("revision_id is required")
  }

  // Step 1: Fetch the proposal
  const { data: proposal, error: fetchErr } = await supabase
    .from("revision_proposals")
    .select("*")
    .eq("id", revision_id)
    .single()

  if (fetchErr || !proposal) {
    return errorResponse("Revision proposal not found", 404, fetchErr?.message)
  }

  // Step 2: Update status to screening
  await supabase
    .from("revision_proposals")
    .update({ status: "screening", updated_at: new Date().toISOString() })
    .eq("id", revision_id)

  // Step 3: Call constitution-check Edge Function
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

  let complianceResult: {
    overall_compliance: number
    compliant: boolean
    recommendation: string
    principle_evaluations?: unknown[]
  }

  try {
    const checkResponse = await fetch(`${supabaseUrl}/functions/v1/constitution-check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        text_ko: proposal.proposed_text_ko,
        text_en: proposal.proposed_text_en,
        check_type: "revision",
      }),
    })

    if (!checkResponse.ok) {
      const errText = await checkResponse.text()
      throw new Error(`Constitution check failed: ${checkResponse.status} ${errText}`)
    }

    complianceResult = await checkResponse.json()
  } catch (err) {
    console.error("Constitution check error:", err)
    // Rollback status
    await supabase
      .from("revision_proposals")
      .update({ status: "proposed", updated_at: new Date().toISOString() })
      .eq("id", revision_id)

    return errorResponse(
      "Constitutional compliance check failed",
      502,
      (err as Error).message,
    )
  }

  // Step 4: Update proposal based on compliance result
  const isCompliant = complianceResult.overall_compliance >= 0.75

  if (isCompliant) {
    // Discussion period: 7 days from now
    const discussionEndsAt = new Date()
    discussionEndsAt.setDate(discussionEndsAt.getDate() + 7)

    const { error: updateErr } = await supabase
      .from("revision_proposals")
      .update({
        status: "discussion",
        semantic_similarity: complianceResult.overall_compliance,
        discussion_ends_at: discussionEndsAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", revision_id)

    if (updateErr) {
      return errorResponse("Failed to update proposal status", 500, updateErr.message)
    }

    // Audit log
    writeAuditLog("submission_screened", "ai", null, revision_id, {
      action: "screen",
      status: "discussion",
      compliance_score: complianceResult.overall_compliance,
      compliant: true,
    })

    // Trigger AI council discussion (fire-and-forget style, but we await for reliability)
    const discussionResult = await handleStartDiscussion(supabase, {
      action: "start_discussion",
      revision_id,
    })
    const discussionBody = await discussionResult.json()

    return jsonResponse({
      message: "Screening passed - discussion period started",
      status: "discussion",
      compliance_score: complianceResult.overall_compliance,
      discussion_ends_at: discussionEndsAt.toISOString(),
      recommendation: complianceResult.recommendation,
      council_discussion: discussionBody,
    })
  } else {
    // Rejected
    const { error: updateErr } = await supabase
      .from("revision_proposals")
      .update({
        status: "rejected",
        semantic_similarity: complianceResult.overall_compliance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", revision_id)

    if (updateErr) {
      return errorResponse("Failed to update proposal status", 500, updateErr.message)
    }

    // Audit log
    writeAuditLog("submission_screened", "ai", null, revision_id, {
      action: "screen",
      status: "rejected",
      compliance_score: complianceResult.overall_compliance,
      compliant: false,
      reason: "Constitutional compliance below 0.75 threshold",
    })

    return jsonResponse({
      message: "Screening failed - revision rejected",
      status: "rejected",
      compliance_score: complianceResult.overall_compliance,
      recommendation: complianceResult.recommendation,
    })
  }
}

async function handleStartDiscussion(
  supabase: ReturnType<typeof createClient>,
  req: RevisionRequest,
): Promise<Response> {
  const { revision_id } = req

  if (!revision_id) {
    return errorResponse("revision_id is required")
  }

  // Step 1: Fetch the proposal
  const { data: proposal, error: fetchErr } = await supabase
    .from("revision_proposals")
    .select("*")
    .eq("id", revision_id)
    .single()

  if (fetchErr || !proposal) {
    return errorResponse("Revision proposal not found", 404, fetchErr?.message)
  }

  // Step 2: Fetch AI council members
  const { data: councilMembers, error: councilErr } = await supabase
    .from("council_members")
    .select("*")
    .eq("type", "ai")
    .eq("is_active", true)

  if (councilErr) {
    console.error("Failed to fetch council members:", councilErr)
    return errorResponse("Failed to fetch AI council members", 500, councilErr.message)
  }

  if (!councilMembers || councilMembers.length === 0) {
    return jsonResponse({
      message: "No active AI council members found - discussion started without AI analysis",
      revision_id,
      analyses_count: 0,
    })
  }

  // Step 3: Generate analysis from each AI council member in parallel
  const analysisPromises = councilMembers.map(async (member) => {
    const userMessage =
      `경전 구절 개정안을 당신의 관점에서 분석해주세요.\n\n` +
      `현재 구절:\n한글: ${proposal.current_text_ko}\n영문: ${proposal.current_text_en}\n\n` +
      `제안된 개정:\n한글: ${proposal.proposed_text_ko}\n영문: ${proposal.proposed_text_en}\n\n` +
      `개정 이유: ${proposal.reason}\n\n` +
      `당신의 관점에서 이 개정안에 대해 분석하세요. ` +
      `찬성/반대/조건부 의견과 그 근거를 제시하세요.`

    try {
      const analysis = await callClaude(
        CLAUDE_HAIKU,
        member.system_prompt || "You are an AI council member evaluating a scripture revision proposal.",
        userMessage,
        512,
        0.4,
      )

      // Insert into revision_discussions
      const { error: insertErr } = await supabase
        .from("revision_discussions")
        .insert({
          proposal_id: revision_id,
          author_type: "ai_council",
          author_id: member.id,
          content: analysis,
          is_ai_analysis: true,
        })

      if (insertErr) {
        console.error(`Failed to insert AI analysis for council member ${member.id}:`, insertErr)
      }

      return { member_id: member.id, member_name: member.name, success: true }
    } catch (err) {
      console.error(`AI analysis failed for council member ${member.id}:`, err)
      return { member_id: member.id, member_name: member.name, success: false, error: (err as Error).message }
    }
  })

  const analysisResults = await Promise.all(analysisPromises)

  // Audit log
  writeAuditLog("discussion_created", "ai", null, revision_id, {
    action: "start_discussion",
    council_members_count: councilMembers.length,
    successful_analyses: analysisResults.filter((r) => r.success).length,
  })

  return jsonResponse({
    message: "AI council discussion generated",
    revision_id,
    analyses_count: analysisResults.filter((r) => r.success).length,
    analyses: analysisResults,
  })
}

async function handleAiAnalysis(
  supabase: ReturnType<typeof createClient>,
  req: RevisionRequest,
): Promise<Response> {
  const { revision_id } = req

  if (!revision_id) {
    return errorResponse("revision_id is required")
  }

  // Step 1: Fetch the proposal
  const { data: proposal, error: fetchErr } = await supabase
    .from("revision_proposals")
    .select("*")
    .eq("id", revision_id)
    .single()

  if (fetchErr || !proposal) {
    return errorResponse("Revision proposal not found", 404, fetchErr?.message)
  }

  // Step 2: Fetch all discussion comments
  const { data: discussions, error: discErr } = await supabase
    .from("revision_discussions")
    .select("*")
    .eq("proposal_id", revision_id)
    .order("created_at", { ascending: true })

  if (discErr) {
    console.error("Failed to fetch discussions:", discErr)
  }

  // Step 3: Build discussion summary for context
  const discussionText = (discussions || [])
    .map((d) => {
      const authorLabel = d.author_type === "ai_council" ? "AI 위원" : "사용자"
      return `[${authorLabel}]: ${d.content}`
    })
    .join("\n\n")

  // Step 4: Generate comprehensive analysis with Claude Sonnet
  const systemPrompt = "당신은 경전 개정 분석가입니다. 제안된 개정안에 대해 다각적으로 분석하고 종합적인 평가를 제공합니다."

  const userMessage =
    `원문:\n한글: ${proposal.current_text_ko}\n영문: ${proposal.current_text_en}\n\n` +
    `제안된 개정:\n한글: ${proposal.proposed_text_ko}\n영문: ${proposal.proposed_text_en}\n\n` +
    `개정 이유: ${proposal.reason}\n\n` +
    `커뮤니티/AI 위원 피드백:\n${discussionText || "(아직 피드백 없음)"}\n\n` +
    `다음을 분석하세요:\n` +
    `1. 개정의 필요성\n` +
    `2. 원문과의 의미 차이\n` +
    `3. 잠재적 영향\n` +
    `4. 커뮤니티 의견 요약\n` +
    `5. 개정 권고 (찬성/반대/조건부)\n\n` +
    `JSON 형식으로 응답하세요:\n` +
    `{"necessity": "string", "meaning_diff": "string", "impact": "string", "community_summary": "string", "recommendation": "approve|reject|conditional", "reasoning": "string"}`

  let analysisText: string
  try {
    analysisText = await callClaude(CLAUDE_SONNET, systemPrompt, userMessage, 2048, 0.3)
  } catch (err) {
    return errorResponse("AI analysis generation failed", 502, (err as Error).message)
  }

  // Step 5: Parse the analysis
  let parsed: {
    necessity: string
    meaning_diff: string
    impact: string
    community_summary: string
    recommendation: string
    reasoning: string
  }

  try {
    parsed = parseJsonResponse(analysisText)
  } catch {
    // If JSON parsing fails, store raw text
    parsed = {
      necessity: "Parse error",
      meaning_diff: "Parse error",
      impact: "Parse error",
      community_summary: "Parse error",
      recommendation: "conditional",
      reasoning: analysisText,
    }
  }

  // Step 6: Insert analysis into revision_discussions
  const formattedAnalysis =
    `[종합 AI 분석]\n\n` +
    `필요성: ${parsed.necessity}\n\n` +
    `의미 차이: ${parsed.meaning_diff}\n\n` +
    `잠재적 영향: ${parsed.impact}\n\n` +
    `커뮤니티 의견 요약: ${parsed.community_summary}\n\n` +
    `권고: ${parsed.recommendation}\n\n` +
    `근거: ${parsed.reasoning}`

  const { error: insertErr } = await supabase
    .from("revision_discussions")
    .insert({
      proposal_id: revision_id,
      author_type: "ai_council",
      author_id: null,
      content: formattedAnalysis,
      is_ai_analysis: true,
    })

  if (insertErr) {
    console.error("Failed to insert AI analysis:", insertErr)
  }

  // Audit log
  writeAuditLog("revision_proposed", "ai", null, revision_id, {
    action: "ai_analysis",
    recommendation: parsed.recommendation,
  })

  return jsonResponse({
    message: "AI analysis completed",
    revision_id,
    analysis: parsed,
  })
}

async function handleStartVote(
  supabase: ReturnType<typeof createClient>,
  req: RevisionRequest,
): Promise<Response> {
  const { revision_id } = req

  if (!revision_id) {
    return errorResponse("revision_id is required")
  }

  // Step 1: Fetch and validate proposal
  const { data: proposal, error: fetchErr } = await supabase
    .from("revision_proposals")
    .select("*")
    .eq("id", revision_id)
    .single()

  if (fetchErr || !proposal) {
    return errorResponse("Revision proposal not found", 404, fetchErr?.message)
  }

  if (proposal.status !== "discussion") {
    return errorResponse(
      `Proposal must be in 'discussion' status to start voting, currently '${proposal.status}'`,
    )
  }

  // Check that discussion period has ended
  if (proposal.discussion_ends_at) {
    const discussionEnd = new Date(proposal.discussion_ends_at)
    if (discussionEnd > new Date()) {
      return errorResponse(
        `Discussion period has not ended yet. Ends at ${proposal.discussion_ends_at}`,
      )
    }
  }

  // Step 2: Call voting Edge Function to create session
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

  let votingResult: { session_id?: string; result?: { session_id?: string } }

  try {
    const votingResponse = await fetch(`${supabaseUrl}/functions/v1/voting`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        action: "create_session",
        submission_id: revision_id,
        subject_type: "revision",
      }),
    })

    if (!votingResponse.ok) {
      const errText = await votingResponse.text()
      throw new Error(`Voting session creation failed: ${votingResponse.status} ${errText}`)
    }

    votingResult = await votingResponse.json()
  } catch (err) {
    return errorResponse("Failed to create voting session", 502, (err as Error).message)
  }

  const sessionId = votingResult.session_id || votingResult.result?.session_id

  // Step 3: Update proposal status
  const { error: updateErr } = await supabase
    .from("revision_proposals")
    .update({
      status: "voting",
      voting_session_id: sessionId || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", revision_id)

  if (updateErr) {
    return errorResponse("Failed to update proposal to voting status", 500, updateErr.message)
  }

  // Audit log
  writeAuditLog("voting_created", "system", null, revision_id, {
    action: "start_vote",
    status: "voting",
    voting_session_id: sessionId,
  })

  return jsonResponse({
    message: "Voting session created for revision proposal",
    revision_id,
    status: "voting",
    voting_session_id: sessionId,
  })
}

async function handleApplyRevision(
  supabase: ReturnType<typeof createClient>,
  req: RevisionRequest,
): Promise<Response> {
  const { revision_id } = req

  if (!revision_id) {
    return errorResponse("revision_id is required")
  }

  // Step 1: Fetch and validate proposal
  const { data: proposal, error: fetchErr } = await supabase
    .from("revision_proposals")
    .select("*")
    .eq("id", revision_id)
    .single()

  if (fetchErr || !proposal) {
    return errorResponse("Revision proposal not found", 404, fetchErr?.message)
  }

  if (proposal.status !== "voting") {
    return errorResponse(
      `Proposal must be in 'voting' status to apply, currently '${proposal.status}'`,
    )
  }

  // Step 2: Validate voting outcome is approved
  if (proposal.voting_session_id) {
    const { data: votingSession, error: voteErr } = await supabase
      .from("voting_sessions")
      .select("outcome")
      .eq("id", proposal.voting_session_id)
      .single()

    if (voteErr || !votingSession) {
      return errorResponse("Voting session not found", 404, voteErr?.message)
    }

    if (votingSession.outcome !== "approved") {
      return errorResponse(
        `Voting outcome must be 'approved', currently '${votingSession.outcome}'`,
      )
    }
  }

  // Step 3: Fetch the current scripture chunk
  const { data: chunk, error: chunkErr } = await supabase
    .from("scripture_chunks")
    .select("*")
    .eq("id", proposal.chunk_id)
    .single()

  if (chunkErr || !chunk) {
    return errorResponse("Scripture chunk not found", 404, chunkErr?.message)
  }

  const currentVersion = chunk.version || 1
  const newVersion = currentVersion + 1

  // Step 4: Save current version to scripture_versions
  const { error: versionErr } = await supabase
    .from("scripture_versions")
    .insert({
      chunk_id: proposal.chunk_id,
      version: currentVersion,
      text_ko: chunk.text_ko,
      text_en: chunk.text_en,
      traditions: chunk.traditions || [],
      traditions_en: chunk.traditions_en || [],
      reflection_ko: chunk.reflection_ko || null,
      reflection_en: chunk.reflection_en || null,
      change_type: "community_revision",
      change_summary: proposal.reason,
      changed_by: proposal.proposed_by,
      voting_session_id: proposal.voting_session_id || null,
    })

  if (versionErr) {
    console.error("Failed to save version history:", versionErr)
    return errorResponse("Failed to save version history", 500, versionErr.message)
  }

  // Step 5: Update scripture_chunks with proposed text
  const updateFields: Record<string, unknown> = {
    text_ko: proposal.proposed_text_ko,
    text_en: proposal.proposed_text_en,
    version: newVersion,
    updated_at: new Date().toISOString(),
  }

  // Include optional fields if present in proposal
  if (proposal.proposed_traditions) {
    updateFields.traditions = proposal.proposed_traditions
  }
  if (proposal.proposed_traditions_en) {
    updateFields.traditions_en = proposal.proposed_traditions_en
  }
  if (proposal.proposed_reflection_ko) {
    updateFields.reflection_ko = proposal.proposed_reflection_ko
  }
  if (proposal.proposed_reflection_en) {
    updateFields.reflection_en = proposal.proposed_reflection_en
  }

  const { error: chunkUpdateErr } = await supabase
    .from("scripture_chunks")
    .update(updateFields)
    .eq("id", proposal.chunk_id)

  if (chunkUpdateErr) {
    console.error("Failed to update scripture chunk:", chunkUpdateErr)
    return errorResponse("Failed to apply revision to scripture chunk", 500, chunkUpdateErr.message)
  }

  // Step 6: Update revision_proposals status
  const { error: proposalUpdateErr } = await supabase
    .from("revision_proposals")
    .update({
      status: "approved",
      updated_at: new Date().toISOString(),
    })
    .eq("id", revision_id)

  if (proposalUpdateErr) {
    console.error("Failed to update proposal status:", proposalUpdateErr)
  }

  // Audit log
  writeAuditLog("revision_approved", "system", null, revision_id, {
    action: "apply_revision",
    chunk_id: proposal.chunk_id,
    old_version: currentVersion,
    new_version: newVersion,
    status: "approved",
  })

  return jsonResponse({
    message: "Revision applied successfully",
    revision_id,
    chunk_id: proposal.chunk_id,
    status: "approved",
    old_version: currentVersion,
    new_version: newVersion,
  })
}

async function handleRejectRevision(
  supabase: ReturnType<typeof createClient>,
  req: RevisionRequest,
): Promise<Response> {
  const { revision_id } = req

  if (!revision_id) {
    return errorResponse("revision_id is required")
  }

  // Step 1: Fetch proposal
  const { data: proposal, error: fetchErr } = await supabase
    .from("revision_proposals")
    .select("*")
    .eq("id", revision_id)
    .single()

  if (fetchErr || !proposal) {
    return errorResponse("Revision proposal not found", 404, fetchErr?.message)
  }

  // Step 2: Calculate new rejection count and cooldown
  const newRejectionCount = (proposal.rejection_count || 0) + 1
  const cooldownDays = newRejectionCount >= 3 ? 180 : 30

  const cooldownUntil = new Date()
  cooldownUntil.setDate(cooldownUntil.getDate() + cooldownDays)

  // Step 3: Update proposal
  const { error: updateErr } = await supabase
    .from("revision_proposals")
    .update({
      status: "rejected",
      rejection_count: newRejectionCount,
      cooldown_until: cooldownUntil.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", revision_id)

  if (updateErr) {
    return errorResponse("Failed to reject revision", 500, updateErr.message)
  }

  // Audit log
  writeAuditLog("revision_proposed", "system", null, revision_id, {
    action: "reject_revision",
    status: "rejected",
    rejection_count: newRejectionCount,
    cooldown_days: cooldownDays,
    cooldown_until: cooldownUntil.toISOString(),
  })

  return jsonResponse({
    message: "Revision rejected",
    revision_id,
    status: "rejected",
    rejection_count: newRejectionCount,
    cooldown_days: cooldownDays,
    cooldown_until: cooldownUntil.toISOString(),
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

    const body: RevisionRequest = await req.json()
    const { action } = body

    if (!action) {
      return errorResponse("action is required")
    }

    switch (action) {
      case "propose":
        return await handlePropose(supabase, body)

      case "screen":
        return await handleScreen(supabase, body)

      case "start_discussion":
        return await handleStartDiscussion(supabase, body)

      case "ai_analysis":
        return await handleAiAnalysis(supabase, body)

      case "start_vote":
        return await handleStartVote(supabase, body)

      case "apply_revision":
        return await handleApplyRevision(supabase, body)

      case "reject_revision":
        return await handleRejectRevision(supabase, body)

      default:
        return errorResponse(`Unknown action: ${action}`)
    }
  } catch (error) {
    console.error("Revision function error:", error)
    return jsonResponse(
      { error: (error as Error).message },
      500,
    )
  }
})
