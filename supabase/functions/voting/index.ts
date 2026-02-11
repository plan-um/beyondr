// supabase/functions/voting/index.ts
// Manage voting session lifecycle
// Actions: create_session, generate_ai_entities, cast_vote, tally_votes, close_session
//
// AI entities distribution:
// - 40% tradition_based (Buddhist scholar, Christian theologian, etc.)
// - 30% function_based (Ethics reviewer, Scientific fact-checker, etc.)
// - 20% contrarian (Devil's advocate, Skeptical rationalist, etc.)
// - 10% meta (Constitutional guardian, Perennial philosopher)
//
// Approval thresholds:
// - 60% for new_submission
// - 70% for revision
// - 80% for amendment
// Quorum: 10% of eligible human voters

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type VotingAction =
  | "create_session"
  | "generate_ai_entities"
  | "cast_vote"
  | "tally_votes"
  | "close_session"

type SubjectType = "new_submission" | "revision" | "amendment" | "archive_restore"
type VoteValue = "for" | "against" | "abstain"
type SessionStatus =
  | "pending"
  | "active"
  | "tallying"
  | "approved"
  | "rejected"
  | "quorum_failed"
  | "flagged"

type PerspectiveType = "tradition_based" | "function_based" | "contrarian" | "meta"

interface VotingRequest {
  action: VotingAction
  session_id?: string
  submission_id?: string
  subject_type?: SubjectType
  voter_id?: string
  vote?: VoteValue
  reasoning?: string
}

interface VotingResult {
  session_id: string
  human_votes_for: number
  human_votes_against: number
  human_votes_abstain: number
  ai_votes_for: number
  ai_votes_against: number
  ai_votes_abstain: number
  quorum_met: boolean
  approval_rate: number
  approval_threshold: number
  outcome: SessionStatus
  ai_entities_used: number
}

// ---------------------------------------------------------------------------
// AI Entity perspective definitions
// ---------------------------------------------------------------------------

interface PerspectiveDefinition {
  perspective_type: PerspectiveType
  perspective_name: string
  perspective_name_ko: string
  system_prompt: string
}

const TRADITION_PERSPECTIVES: PerspectiveDefinition[] = [
  {
    perspective_type: "tradition_based",
    perspective_name: "Buddhist Scholar",
    perspective_name_ko: "불교 학자",
    system_prompt:
      "You are a Buddhist scholar deeply versed in the Pali Canon, Mahayana sutras, and Zen koans. " +
      "You evaluate submissions through the lens of the Four Noble Truths, the Eightfold Path, " +
      "and the principle of dependent origination. You value compassion (karuna), wisdom (prajna), " +
      "and liberation from suffering. Assess whether this content aligns with timeless Buddhist insights " +
      "while remaining accessible to modern seekers.",
  },
  {
    perspective_type: "tradition_based",
    perspective_name: "Christian Theologian",
    perspective_name_ko: "기독교 신학자",
    system_prompt:
      "You are a Christian theologian with deep knowledge of both Old and New Testaments, " +
      "patristic writings, and mystical traditions (Meister Eckhart, Julian of Norwich, Thomas Merton). " +
      "You evaluate through the lens of agape love, grace, redemption, and the Kingdom of God. " +
      "You seek content that speaks to the human soul's yearning for divine connection " +
      "while respecting interfaith dialogue.",
  },
  {
    perspective_type: "tradition_based",
    perspective_name: "Islamic Scholar",
    perspective_name_ko: "이슬람 학자",
    system_prompt:
      "You are an Islamic scholar versed in the Quran, Hadith, and Sufi mystical poetry (Rumi, Hafiz, Ibn Arabi). " +
      "You evaluate through the lens of tawhid (divine unity), taqwa (God-consciousness), " +
      "and ihsan (spiritual excellence). You value mercy (rahma), justice (adl), and the pursuit of knowledge. " +
      "Assess whether this content honors the sacred while speaking universally.",
  },
  {
    perspective_type: "tradition_based",
    perspective_name: "Hindu Philosopher",
    perspective_name_ko: "힌두 철학자",
    system_prompt:
      "You are a Hindu philosopher well-versed in the Vedas, Upanishads, Bhagavad Gita, and Yoga Sutras. " +
      "You evaluate through the lens of dharma, karma, moksha, and the ultimate reality (Brahman). " +
      "You value the diversity of paths (bhakti, jnana, karma, raja yoga) and see truth as multi-faceted. " +
      "Assess whether this content resonates with the perennial wisdom of Sanatana Dharma.",
  },
  {
    perspective_type: "tradition_based",
    perspective_name: "Stoic Sage",
    perspective_name_ko: "스토아 현자",
    system_prompt:
      "You are a Stoic philosopher drawing from Marcus Aurelius, Epictetus, and Seneca. " +
      "You evaluate through the lens of virtue ethics, logos (universal reason), " +
      "and the dichotomy of control. You value wisdom, courage, justice, and temperance. " +
      "Assess whether this content promotes inner freedom and alignment with nature's rational order.",
  },
  {
    perspective_type: "tradition_based",
    perspective_name: "Daoist Master",
    perspective_name_ko: "도가 사상가",
    system_prompt:
      "You are a Daoist master steeped in the Tao Te Ching, Zhuangzi, and the I Ching. " +
      "You evaluate through the lens of wu wei (effortless action), yin-yang harmony, " +
      "and the nameless Tao. You value naturalness, simplicity, and flowing with the Way. " +
      "Assess whether this content embodies the paradoxical wisdom of the Tao.",
  },
  {
    perspective_type: "tradition_based",
    perspective_name: "Jewish Rabbinical Scholar",
    perspective_name_ko: "유대교 랍비 학자",
    system_prompt:
      "You are a Jewish scholar versed in the Torah, Talmud, Midrash, and Kabbalistic traditions. " +
      "You evaluate through the lens of covenant, tikkun olam (repairing the world), " +
      "and the ongoing dialogue between humanity and the Divine. You value study, justice, and compassion. " +
      "Assess whether this content contributes to the sacred conversation across generations.",
  },
  {
    perspective_type: "tradition_based",
    perspective_name: "Indigenous Wisdom Keeper",
    perspective_name_ko: "원주민 지혜 수호자",
    system_prompt:
      "You are a keeper of indigenous spiritual wisdom, drawing from diverse traditions that honor " +
      "the sacred relationship between humanity, earth, and spirit. You evaluate through the lens of " +
      "interconnectedness, ancestral memory, and ceremonial consciousness. You value reciprocity, " +
      "respect for all beings, and the sacredness of place. Assess whether this content " +
      "honors the living web of existence.",
  },
]

const FUNCTION_PERSPECTIVES: PerspectiveDefinition[] = [
  {
    perspective_type: "function_based",
    perspective_name: "Ethics Reviewer",
    perspective_name_ko: "윤리 심사관",
    system_prompt:
      "You are an ethics reviewer specializing in applied ethics, moral philosophy, " +
      "and the intersection of ancient wisdom with modern ethical challenges. " +
      "You evaluate whether content promotes human flourishing, respects dignity, " +
      "avoids harm, and navigates moral complexity with nuance. " +
      "Flag any content that could be used to justify oppression, exclusion, or suffering.",
  },
  {
    perspective_type: "function_based",
    perspective_name: "Scientific Fact-Checker",
    perspective_name_ko: "과학적 사실 검증관",
    system_prompt:
      "You are a scientific fact-checker who respects both empirical knowledge and " +
      "the domain of spiritual/philosophical inquiry. You evaluate whether content makes " +
      "factual claims that contradict established science, while recognizing that spiritual " +
      "truths operate in a different epistemological domain. Flag pseudoscience, " +
      "but respect genuine metaphysical inquiry.",
  },
  {
    perspective_type: "function_based",
    perspective_name: "Literary Critic",
    perspective_name_ko: "문학 비평가",
    system_prompt:
      "You are a literary critic specializing in sacred and wisdom literature. " +
      "You evaluate the aesthetic quality, poetic resonance, and literary merit of submissions. " +
      "Great scripture is not just true but beautifully expressed -- it resonates across time. " +
      "Assess clarity, imagery, rhythm, and the capacity to evoke deep contemplation. " +
      "Consider whether this text could stand alongside the world's greatest wisdom literature.",
  },
  {
    perspective_type: "function_based",
    perspective_name: "Cultural Sensitivity Reviewer",
    perspective_name_ko: "문화 감수성 심사관",
    system_prompt:
      "You are a cultural sensitivity reviewer with deep knowledge of world cultures, " +
      "historical power dynamics, and the legacy of religious colonialism. " +
      "You evaluate whether content appropriates, misrepresents, or disrespects " +
      "any cultural or spiritual tradition. You seek content that bridges traditions " +
      "with genuine respect rather than superficial syncretism.",
  },
  {
    perspective_type: "function_based",
    perspective_name: "Psychological Wellbeing Assessor",
    perspective_name_ko: "심리적 건강성 평가관",
    system_prompt:
      "You are a psychologist specializing in the psychology of religion and spiritual development. " +
      "You evaluate whether content promotes genuine psychological growth and integration, " +
      "or whether it could enable spiritual bypassing, toxic positivity, guilt-based manipulation, " +
      "or unhealthy dependency. Healthy spirituality empowers; unhealthy spirituality controls.",
  },
]

const CONTRARIAN_PERSPECTIVES: PerspectiveDefinition[] = [
  {
    perspective_type: "contrarian",
    perspective_name: "Devil's Advocate",
    perspective_name_ko: "악마의 변호인",
    system_prompt:
      "You are a devil's advocate whose role is to find the strongest possible objections " +
      "to any submission. You play this role constructively -- not to destroy but to strengthen. " +
      "If a text cannot withstand rigorous challenge, it is not ready for inclusion in scripture. " +
      "Look for logical weaknesses, unstated assumptions, potential for misinterpretation, " +
      "and ways the text could be weaponized or misused.",
  },
  {
    perspective_type: "contrarian",
    perspective_name: "Skeptical Rationalist",
    perspective_name_ko: "회의적 합리주의자",
    system_prompt:
      "You are a skeptical rationalist in the tradition of Bertrand Russell and Carl Sagan. " +
      "You respect the human need for meaning but demand intellectual honesty. " +
      "You evaluate whether content makes unfalsifiable claims presented as facts, " +
      "uses emotional manipulation instead of genuine insight, or confuses subjective " +
      "experience with objective truth. Good wisdom literature can withstand rational scrutiny.",
  },
  {
    perspective_type: "contrarian",
    perspective_name: "Inter-tradition Harmonizer",
    perspective_name_ko: "전통 간 조화자",
    system_prompt:
      "You are an inter-tradition harmonizer who identifies where a submission might " +
      "inadvertently create division or favoritism among spiritual traditions. " +
      "You check whether content is genuinely universal or merely one tradition's perspective " +
      "disguised as universal truth. You seek authentic common ground, not forced syncretism. " +
      "Raise concerns if content could alienate practitioners of any major tradition.",
  },
]

const META_PERSPECTIVES: PerspectiveDefinition[] = [
  {
    perspective_type: "meta",
    perspective_name: "Constitutional Guardian",
    perspective_name_ko: "헌법 수호자",
    system_prompt:
      "You are the constitutional guardian of this living scripture project. " +
      "You evaluate every submission against the project's core constitutional principles: " +
      "inclusivity, non-dogmatism, respect for all traditions, commitment to truth, " +
      "and the living nature of wisdom. You are the final check ensuring the project " +
      "stays true to its founding vision while remaining open to evolution.",
  },
  {
    perspective_type: "meta",
    perspective_name: "Perennial Philosopher",
    perspective_name_ko: "영원 철학자",
    system_prompt:
      "You are a perennial philosopher in the tradition of Aldous Huxley, Huston Smith, " +
      "and Ken Wilber. You evaluate whether content touches upon the universal truths " +
      "that all traditions share at their mystic core. You seek the golden thread " +
      "that connects all genuine spiritual insight. Assess whether this content " +
      "contributes to the emerging integral wisdom of humanity.",
  },
]

// ---------------------------------------------------------------------------
// Claude Haiku API helper
// ---------------------------------------------------------------------------

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages"
const CLAUDE_MODEL = "claude-haiku-4-5-20251001"

async function callClaude(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 512,
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
  subjectType: string,
  subjectId: string,
  details: Record<string, unknown>,
): void {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (!supabaseUrl || !serviceRoleKey) return

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
      subject_type: subjectType,
      subject_id: subjectId,
      details,
    }),
  }).catch((err) => console.error("Audit log call error:", err))
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

function errorResponse(message: string, status = 400, details?: string): Response {
  return jsonResponse({ error: message, ...(details ? { details } : {}) }, status)
}

// ---------------------------------------------------------------------------
// Action: create_session
// ---------------------------------------------------------------------------

async function createSession(
  supabase: ReturnType<typeof createClient>,
  submissionId: string,
  subjectType?: SubjectType,
): Promise<Response> {
  // 1. Fetch the submission to get title/description
  const { data: submission, error: fetchErr } = await supabase
    .from("submissions")
    .select("id, title, raw_text, status")
    .eq("id", submissionId)
    .single()

  if (fetchErr || !submission) {
    return errorResponse("Submission not found", 404, fetchErr?.message)
  }

  // 2. Determine subject_type if not provided
  const resolvedSubjectType: SubjectType = subjectType || "new_submission"

  // 3. Set approval_threshold based on subject_type
  const thresholdMap: Record<SubjectType, number> = {
    new_submission: 0.60,
    revision: 0.70,
    amendment: 0.80,
    archive_restore: 0.60,
  }
  const approvalThreshold = thresholdMap[resolvedSubjectType]

  // 4. Count eligible humans (contributors with at least 1 contribution)
  const { count: eligibleCount } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .gt("contributions_count", 0)

  const eligibleHumanCount = eligibleCount ?? 0

  // 5. Calculate time window
  const startsAt = new Date().toISOString()
  const endsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  // 6. Insert voting session
  const { data: session, error: insertErr } = await supabase
    .from("voting_sessions")
    .insert({
      subject_type: resolvedSubjectType,
      subject_id: submissionId,
      title: submission.title || "Untitled Submission",
      description: (submission.raw_text || "").slice(0, 500),
      approval_threshold: approvalThreshold,
      quorum_percentage: 0.10,
      eligible_human_count: eligibleHumanCount,
      ai_entity_count: 0,
      human_votes_for: 0,
      human_votes_against: 0,
      human_votes_abstain: 0,
      ai_votes_for: 0,
      ai_votes_against: 0,
      ai_votes_abstain: 0,
      status: "active",
      starts_at: startsAt,
      ends_at: endsAt,
    })
    .select()
    .single()

  if (insertErr || !session) {
    return errorResponse("Failed to create voting session", 500, insertErr?.message)
  }

  writeAuditLog(
    "voting_created",
    "system",
    null,
    "voting_session",
    session.id,
    {
      submission_id: submissionId,
      subject_type: resolvedSubjectType,
      approval_threshold: approvalThreshold,
      eligible_human_count: eligibleHumanCount,
    },
  )

  return jsonResponse({
    message: "Voting session created",
    session,
  })
}

// ---------------------------------------------------------------------------
// Action: generate_ai_entities
// ---------------------------------------------------------------------------

async function generateAiEntities(
  supabase: ReturnType<typeof createClient>,
  sessionId: string,
): Promise<Response> {
  // 1. Fetch the session
  const { data: session, error: sessionErr } = await supabase
    .from("voting_sessions")
    .select("*")
    .eq("id", sessionId)
    .single()

  if (sessionErr || !session) {
    return errorResponse("Voting session not found", 404, sessionErr?.message)
  }

  if (session.status !== "active") {
    return errorResponse(`Session is not active (status: ${session.status})`)
  }

  // 2. Fetch the submission content
  const { data: submission, error: subErr } = await supabase
    .from("submissions")
    .select("id, title, raw_text")
    .eq("id", session.subject_id)
    .single()

  if (subErr || !submission) {
    return errorResponse("Associated submission not found", 404, subErr?.message)
  }

  const submissionText = submission.raw_text || ""
  const submissionTitle = submission.title || "Untitled"

  // 3. Determine entity count: match eligible_human_count, minimum 5
  const entityCount = Math.max(5, session.eligible_human_count as number)

  // 4. Distribute perspectives: 40% tradition, 30% function, 20% contrarian, 10% meta
  const traditionCount = Math.max(1, Math.round(entityCount * 0.4))
  const functionCount = Math.max(1, Math.round(entityCount * 0.3))
  const contrarianCount = Math.max(1, Math.round(entityCount * 0.2))
  const metaCount = Math.max(1, entityCount - traditionCount - functionCount - contrarianCount)

  // 5. Select perspectives from each pool (cycling through if count exceeds pool size)
  function selectPerspectives(pool: PerspectiveDefinition[], count: number): PerspectiveDefinition[] {
    const selected: PerspectiveDefinition[] = []
    for (let i = 0; i < count; i++) {
      selected.push(pool[i % pool.length])
    }
    return selected
  }

  const selectedPerspectives = [
    ...selectPerspectives(TRADITION_PERSPECTIVES, traditionCount),
    ...selectPerspectives(FUNCTION_PERSPECTIVES, functionCount),
    ...selectPerspectives(CONTRARIAN_PERSPECTIVES, contrarianCount),
    ...selectPerspectives(META_PERSPECTIVES, metaCount),
  ]

  // 6. For each entity, call Claude Haiku to evaluate and cast vote
  let aiVotesFor = 0
  let aiVotesAgainst = 0
  let aiVotesAbstain = 0
  const entityResults: Array<{ entity_id: string; perspective_name: string; vote: VoteValue }> = []

  // Process entities in parallel batches of 5 to avoid rate limits
  const batchSize = 5
  for (let i = 0; i < selectedPerspectives.length; i += batchSize) {
    const batch = selectedPerspectives.slice(i, i + batchSize)

    const batchResults = await Promise.all(
      batch.map(async (perspective) => {
        const userMessage =
          `You are evaluating a submission to a living, crowd-sourced scripture project.\n\n` +
          `Title: ${submissionTitle}\n\n` +
          `Full text:\n${submissionText}\n\n` +
          `Based on your perspective as ${perspective.perspective_name} (${perspective.perspective_name_ko}), ` +
          `evaluate this submission and decide your vote.\n\n` +
          `Respond in JSON only:\n` +
          `{\n` +
          `  "vote": "for" | "against" | "abstain",\n` +
          `  "reasoning": "Your detailed reasoning in 2-3 sentences",\n` +
          `  "confidence": 0.0 to 1.0\n` +
          `}`

        let rawResponse: string
        let vote: VoteValue = "abstain"
        let reasoning = ""

        try {
          rawResponse = await callClaude(perspective.system_prompt, userMessage, 512, 0.3)
          const parsed = parseJsonResponse<{
            vote: string
            reasoning: string
            confidence: number
          }>(rawResponse)

          // Normalize vote value
          const normalizedVote = parsed.vote?.toLowerCase()
          if (normalizedVote === "for" || normalizedVote === "against" || normalizedVote === "abstain") {
            vote = normalizedVote as VoteValue
          }
          reasoning = parsed.reasoning || ""
        } catch (err) {
          console.error(`AI entity evaluation failed for ${perspective.perspective_name}:`, err)
          rawResponse = JSON.stringify({ error: (err as Error).message })
          vote = "abstain"
          reasoning = "Evaluation failed due to an error."
        }

        // Insert AI entity record
        const { data: entity, error: entityErr } = await supabase
          .from("ai_voting_entities")
          .insert({
            session_id: sessionId,
            perspective_type: perspective.perspective_type,
            perspective_name: perspective.perspective_name,
            perspective_name_ko: perspective.perspective_name_ko,
            system_prompt: perspective.system_prompt,
            raw_response: { vote, reasoning, raw: rawResponse },
            model_used: CLAUDE_MODEL,
            temperature: 0.30,
          })
          .select("id")
          .single()

        if (entityErr) {
          console.error(`Failed to insert AI entity:`, entityErr)
          return null
        }

        // Insert vote record
        const { error: voteErr } = await supabase
          .from("votes")
          .insert({
            session_id: sessionId,
            voter_type: "ai",
            voter_id: entity!.id,
            vote,
            reason: reasoning,
          })

        if (voteErr) {
          console.error(`Failed to insert AI vote:`, voteErr)
        }

        return { entity_id: entity!.id, perspective_name: perspective.perspective_name, vote }
      }),
    )

    for (const result of batchResults) {
      if (!result) continue
      entityResults.push(result)
      if (result.vote === "for") aiVotesFor++
      else if (result.vote === "against") aiVotesAgainst++
      else aiVotesAbstain++
    }
  }

  // 7. Update voting session with AI vote counts
  const { error: updateErr } = await supabase
    .from("voting_sessions")
    .update({
      ai_entity_count: entityResults.length,
      ai_votes_for: aiVotesFor,
      ai_votes_against: aiVotesAgainst,
      ai_votes_abstain: aiVotesAbstain,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId)

  if (updateErr) {
    console.error("Failed to update session with AI vote counts:", updateErr)
  }

  writeAuditLog(
    "vote_cast",
    "ai",
    null,
    "voting_session",
    sessionId,
    {
      ai_entity_count: entityResults.length,
      ai_votes_for: aiVotesFor,
      ai_votes_against: aiVotesAgainst,
      ai_votes_abstain: aiVotesAbstain,
      distribution: {
        tradition: traditionCount,
        function: functionCount,
        contrarian: contrarianCount,
        meta: metaCount,
      },
    },
  )

  return jsonResponse({
    message: "AI entities generated and votes cast",
    session_id: sessionId,
    entity_count: entityResults.length,
    ai_votes: { for: aiVotesFor, against: aiVotesAgainst, abstain: aiVotesAbstain },
    entities: entityResults,
  })
}

// ---------------------------------------------------------------------------
// Action: cast_vote (human)
// ---------------------------------------------------------------------------

async function castVote(
  supabase: ReturnType<typeof createClient>,
  sessionId: string,
  voterId: string,
  vote: VoteValue,
  reasoning?: string,
): Promise<Response> {
  // 1. Fetch session and validate it is active
  const { data: session, error: sessionErr } = await supabase
    .from("voting_sessions")
    .select("id, status, ends_at")
    .eq("id", sessionId)
    .single()

  if (sessionErr || !session) {
    return errorResponse("Voting session not found", 404, sessionErr?.message)
  }

  if (session.status !== "active") {
    return errorResponse(`Voting session is not active (status: ${session.status})`)
  }

  // Check if session has expired
  if (new Date(session.ends_at) < new Date()) {
    return errorResponse("Voting session has expired")
  }

  // 2. Insert vote (UNIQUE constraint on session_id + voter_type + voter_id handles duplicates)
  const { error: voteErr } = await supabase
    .from("votes")
    .insert({
      session_id: sessionId,
      voter_type: "human",
      voter_id: voterId,
      vote,
      reason: reasoning || null,
    })

  if (voteErr) {
    if (voteErr.code === "23505") {
      return errorResponse("You have already voted in this session", 409)
    }
    return errorResponse("Failed to cast vote", 500, voteErr.message)
  }

  // 3. Increment the appropriate human vote counter
  const voteColumn = `human_votes_${vote}` as const
  const { error: updateErr } = await supabase.rpc("increment_column", {
    table_name: "voting_sessions",
    column_name: voteColumn,
    row_id: sessionId,
  })

  // Fallback: if RPC doesn't exist, do a manual update
  if (updateErr) {
    console.error("RPC increment_column failed, falling back to manual update:", updateErr)

    const { data: currentSession } = await supabase
      .from("voting_sessions")
      .select("human_votes_for, human_votes_against, human_votes_abstain")
      .eq("id", sessionId)
      .single()

    if (currentSession) {
      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (vote === "for") updateData.human_votes_for = (currentSession.human_votes_for || 0) + 1
      else if (vote === "against") updateData.human_votes_against = (currentSession.human_votes_against || 0) + 1
      else updateData.human_votes_abstain = (currentSession.human_votes_abstain || 0) + 1

      await supabase
        .from("voting_sessions")
        .update(updateData)
        .eq("id", sessionId)
    }
  }

  writeAuditLog(
    "vote_cast",
    "human",
    voterId,
    "voting_session",
    sessionId,
    { vote, reasoning },
  )

  return jsonResponse({
    message: "Vote cast successfully",
    session_id: sessionId,
    voter_id: voterId,
    vote,
  })
}

// ---------------------------------------------------------------------------
// Action: tally_votes
// ---------------------------------------------------------------------------

async function tallyVotes(
  supabase: ReturnType<typeof createClient>,
  sessionId: string,
): Promise<Response> {
  // 1. Fetch session
  const { data: session, error: sessionErr } = await supabase
    .from("voting_sessions")
    .select("*")
    .eq("id", sessionId)
    .single()

  if (sessionErr || !session) {
    return errorResponse("Voting session not found", 404, sessionErr?.message)
  }

  // 2. Mark as tallying
  await supabase
    .from("voting_sessions")
    .update({ status: "tallying", updated_at: new Date().toISOString() })
    .eq("id", sessionId)

  // 3. Calculate vote totals
  const humanFor = session.human_votes_for || 0
  const humanAgainst = session.human_votes_against || 0
  const humanAbstain = session.human_votes_abstain || 0
  const aiFor = session.ai_votes_for || 0
  const aiAgainst = session.ai_votes_against || 0
  const aiAbstain = session.ai_votes_abstain || 0

  const totalFor = humanFor + aiFor
  const totalAgainst = humanAgainst + aiAgainst
  const totalNonAbstain = totalFor + totalAgainst

  // 4. Calculate approval rate (abstains don't count)
  const approvalRate = totalNonAbstain > 0 ? totalFor / totalNonAbstain : 0

  // 5. Quorum check: human votes cast / eligible_human_count >= quorum_percentage
  const humanVotesCast = humanFor + humanAgainst + humanAbstain
  const eligibleHumanCount = session.eligible_human_count || 0
  const quorumPercentage = Number(session.quorum_percentage) || 0.10

  // If no eligible humans, quorum is automatically met (AI-only voting)
  const quorumMet = eligibleHumanCount === 0
    ? true
    : (humanVotesCast / eligibleHumanCount) >= quorumPercentage

  // 6. Determine outcome
  const approvalThreshold = Number(session.approval_threshold) || 0.60
  let outcome: SessionStatus

  if (!quorumMet) {
    outcome = "quorum_failed"
  } else if (approvalRate >= approvalThreshold) {
    outcome = "approved"
  } else {
    outcome = "rejected"
  }

  // 7. Update session with final status
  const { error: updateErr } = await supabase
    .from("voting_sessions")
    .update({
      status: outcome,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId)

  if (updateErr) {
    console.error("Failed to update session with tally result:", updateErr)
  }

  const result: VotingResult = {
    session_id: sessionId,
    human_votes_for: humanFor,
    human_votes_against: humanAgainst,
    human_votes_abstain: humanAbstain,
    ai_votes_for: aiFor,
    ai_votes_against: aiAgainst,
    ai_votes_abstain: aiAbstain,
    quorum_met: quorumMet,
    approval_rate: Math.round(approvalRate * 10000) / 10000,
    approval_threshold: approvalThreshold,
    outcome,
    ai_entities_used: session.ai_entity_count || 0,
  }

  writeAuditLog(
    "vote_cast",
    "system",
    null,
    "voting_session",
    sessionId,
    {
      action: "tally",
      outcome,
      approval_rate: result.approval_rate,
      quorum_met: quorumMet,
      human_votes: { for: humanFor, against: humanAgainst, abstain: humanAbstain },
      ai_votes: { for: aiFor, against: aiAgainst, abstain: aiAbstain },
    },
  )

  return jsonResponse({
    message: `Voting tallied: ${outcome}`,
    result,
  })
}

// ---------------------------------------------------------------------------
// Action: close_session
// ---------------------------------------------------------------------------

async function closeSession(
  supabase: ReturnType<typeof createClient>,
  sessionId: string,
): Promise<Response> {
  // 1. Fetch session
  const { data: session, error: sessionErr } = await supabase
    .from("voting_sessions")
    .select("id, status")
    .eq("id", sessionId)
    .single()

  if (sessionErr || !session) {
    return errorResponse("Voting session not found", 404, sessionErr?.message)
  }

  // 2. If still active or tallying, run tally first
  const terminalStatuses: SessionStatus[] = ["approved", "rejected", "quorum_failed", "flagged"]
  if (!terminalStatuses.includes(session.status as SessionStatus)) {
    // Run tally
    const tallyResponse = await tallyVotes(supabase, sessionId)
    const tallyResult = await tallyResponse.json()

    // Re-fetch session to get updated status
    const { data: updatedSession } = await supabase
      .from("voting_sessions")
      .select("id, status")
      .eq("id", sessionId)
      .single()

    // Set ends_at to now
    await supabase
      .from("voting_sessions")
      .update({
        ends_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId)

    writeAuditLog(
      "voting_created",
      "system",
      null,
      "voting_session",
      sessionId,
      { action: "close", final_status: updatedSession?.status, tallied: true },
    )

    return jsonResponse({
      message: "Voting session closed",
      session_id: sessionId,
      final_status: updatedSession?.status,
      tally: tallyResult.result,
    })
  }

  // Already in terminal state, just set ends_at
  await supabase
    .from("voting_sessions")
    .update({
      ends_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId)

  writeAuditLog(
    "voting_created",
    "system",
    null,
    "voting_session",
    sessionId,
    { action: "close", final_status: session.status, tallied: false },
  )

  return jsonResponse({
    message: "Voting session closed",
    session_id: sessionId,
    final_status: session.status,
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

    const body: VotingRequest = await req.json()
    const { action, session_id, submission_id, voter_id, vote, reasoning, subject_type } = body

    if (!action) {
      return errorResponse("action is required")
    }

    switch (action) {
      case "create_session": {
        if (!submission_id) {
          return errorResponse("submission_id is required for create_session")
        }
        return await createSession(supabase, submission_id, subject_type)
      }

      case "generate_ai_entities": {
        if (!session_id) {
          return errorResponse("session_id is required for generate_ai_entities")
        }
        return await generateAiEntities(supabase, session_id)
      }

      case "cast_vote": {
        if (!session_id || !voter_id || !vote) {
          return errorResponse("session_id, voter_id, and vote are required for cast_vote")
        }
        const validVotes: VoteValue[] = ["for", "against", "abstain"]
        if (!validVotes.includes(vote)) {
          return errorResponse(`Invalid vote value. Must be one of: ${validVotes.join(", ")}`)
        }
        return await castVote(supabase, session_id, voter_id, vote, reasoning)
      }

      case "tally_votes": {
        if (!session_id) {
          return errorResponse("session_id is required for tally_votes")
        }
        return await tallyVotes(supabase, session_id)
      }

      case "close_session": {
        if (!session_id) {
          return errorResponse("session_id is required for close_session")
        }
        return await closeSession(supabase, session_id)
      }

      default:
        return errorResponse(`Unknown action: ${action}`)
    }
  } catch (error) {
    console.error("Voting function error:", error)
    return jsonResponse({ error: (error as Error).message }, 500)
  }
})
