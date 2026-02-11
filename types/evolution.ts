// ============================================================
// Beyondr Living Scripture Evolution System — Type Definitions
// ============================================================

// --- Enums ---

export type UserRole = 'member' | 'contributor' | 'moderator' | 'admin' | 'founder';

export type SubmissionType = 'wisdom' | 'story' | 'reflection' | 'teaching' | 'prayer' | 'poem';

export type SubmissionStatus =
  | 'draft' | 'submitted' | 'screening' | 'screening_passed' | 'screening_failed'
  | 'refining' | 'refined' | 'voting' | 'approved' | 'rejected' | 'registered';

export type RefinementStage = 'raw' | 'draft' | 'refined' | 'canonical';

export type VotingSubjectType = 'new_submission' | 'revision' | 'amendment' | 'archive_restore';

export type VotingSessionStatus = 'pending' | 'active' | 'tallying' | 'approved' | 'rejected' | 'quorum_failed' | 'flagged';

export type VoteChoice = 'for' | 'against' | 'abstain';

export type VoterType = 'human' | 'ai';

export type AIPerspectiveType = 'tradition_based' | 'function_based' | 'contrarian' | 'meta';

export type OriginType = 'founding' | 'crawled' | 'user_submission' | 'community_revision';

export type CopyrightStatus = 'public_domain' | 'cc_by' | 'cc_by_nc' | 'manual_review';

export type CrawlSourceType = 'religious_api' | 'modern_spiritual' | 'academic' | 'web_dataset';

export type CategoryDepth = 0 | 1 | 2;

export type GovernanceLevel = 'constitutional' | 'council' | 'community';

export type CouncilMemberType = 'founder' | 'human' | 'ai';

export type AmendmentStatus = 'discussion' | 'council_vote' | 'community_vote' | 'approved' | 'rejected' | 'withdrawn';

export type RevisionType = 'minor_text' | 'major_text' | 'tradition_tag' | 'position_move' | 'deletion' | 'chapter_structure';

export type RevisionStatus = 'proposed' | 'screening' | 'discussion' | 'refining' | 'voting' | 'approved' | 'rejected' | 'withdrawn';

export type AuditEventType =
  | 'submission.created' | 'submission.submitted' | 'submission.screened'
  | 'submission.refined' | 'submission.approved' | 'submission.rejected'
  | 'vote.cast' | 'voting_session.created' | 'voting_session.ended'
  | 'scripture.registered' | 'scripture.revised' | 'scripture.archived'
  | 'principle.amended' | 'category.created' | 'council.member_added'
  | 'revision.proposed' | 'revision.approved' | 'revision.rejected'
  | 'emergency_fix.applied';

export type ActorType = 'human' | 'ai' | 'system';

export type ScriptureChangeType = 'founding' | 'community_revision' | 'emergency_fix' | 'archive' | 'restore';

// --- Submission Length Limits ---

export const SUBMISSION_MAX_LENGTHS: Record<SubmissionType, number> = {
  wisdom: 500,
  story: 5000,
  reflection: 2000,
  teaching: 3000,
  prayer: 1000,
  poem: 1500,
};

// --- Interfaces ---

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  contribution_count: number;
  joined_at: string;
  updated_at: string;
}

export interface ConstitutionalPrinciple {
  id: number;
  code: string;
  name_ko: string;
  name_en: string;
  description_ko: string;
  description_en: string;
  priority: number;
  weight: number;
  version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PrincipleVersion {
  id: string;
  principle_id: number;
  version: number;
  name_ko: string;
  name_en: string;
  description_ko: string;
  description_en: string;
  change_summary: string | null;
  changed_by: string | null;
  created_at: string;
}

export interface Amendment {
  id: string;
  type: 'principle_add' | 'principle_modify' | 'principle_remove' | 'theme_add' | 'theme_modify';
  title: string;
  description: string;
  proposed_by: string;
  status: AmendmentStatus;
  discussion_ends_at: string | null;
  council_vote_ends_at: string | null;
  community_vote_ends_at: string | null;
  council_votes_for: number;
  council_votes_against: number;
  community_votes_for: number;
  community_votes_against: number;
  required_majority: number;
  cooldown_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface CouncilMember {
  id: string;
  profile_id: string | null;
  name: string;
  type: CouncilMemberType;
  perspective: string | null;
  system_prompt: string | null;
  is_active: boolean;
  appointed_at: string;
  created_at: string;
}

export interface Category {
  id: string;
  parent_id: string | null;
  depth: CategoryDepth;
  name_ko: string;
  name_en: string;
  description_ko: string | null;
  description_en: string | null;
  governance_level: GovernanceLevel | null;
  support_count: number;
  is_active: boolean;
  created_at: string;
  children?: Category[];  // for hierarchical display
}

export interface ContentCategory {
  id: string;
  content_type: 'submission' | 'crawled' | 'scripture_chunk';
  content_id: string;
  category_id: string;
  confidence: number | null;
  assigned_by: 'auto' | 'manual' | 'ai';
  created_at: string;
  category?: Category;  // joined
}

export interface CrawlSource {
  id: string;
  name: string;
  source_type: CrawlSourceType;
  url: string | null;
  api_config: Record<string, unknown> | null;
  schedule_cron: string;
  copyright_status: CopyrightStatus | null;
  is_active: boolean;
  last_crawled_at: string | null;
  total_collected: number;
  created_at: string;
  updated_at: string;
}

export interface CrawledContent {
  id: string;
  source_id: string;
  content_hash: string;
  raw_text: string;
  original_language: string | null;
  author: string | null;
  source_url: string | null;
  publication_year: number | null;
  copyright_status: string | null;
  relevance_score: number | null;
  quality_score: number | null;
  semantic_duplicate_of: string | null;
  status: 'pending' | 'passed' | 'rejected' | 'duplicate';
  created_at: string;
}

export interface Submission {
  id: string;
  user_id: string;
  type: SubmissionType;
  title: string | null;
  raw_text: string;
  language: string;
  related_chunk_id: string | null;
  status: SubmissionStatus;
  screening_result: ScreeningResult | null;
  compliance_score: number | null;
  rejection_reason: string | null;
  resubmission_count: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  user?: Profile;
  refinements?: RefinementHistory[];
  categories?: ContentCategory[];
}

export interface ScreeningResult {
  safety_score: number;
  principles: Record<string, number>;  // code -> score (0-1)
  overall_compliance: number;
  plagiarism_check: {
    max_similarity: number;
    similar_to: string | null;
  };
  language_quality: number;
  passed: boolean;
  rejection_reasons?: string[];
}

export interface RefinementHistory {
  id: string;
  submission_id: string;
  stage: RefinementStage;
  text_ko: string;
  text_en: string | null;
  ai_model: string | null;
  prompt_hash: string | null;
  change_summary: string | null;
  meaning_preservation_score: number | null;
  user_accepted: boolean | null;
  created_at: string;
}

export interface VotingSession {
  id: string;
  subject_type: VotingSubjectType;
  subject_id: string;
  title: string;
  description: string | null;
  approval_threshold: number;
  quorum_percentage: number;
  eligible_human_count: number;
  ai_entity_count: number;
  human_votes_for: number;
  human_votes_against: number;
  human_votes_abstain: number;
  ai_votes_for: number;
  ai_votes_against: number;
  ai_votes_abstain: number;
  status: VotingSessionStatus;
  starts_at: string;
  ends_at: string;
  flagged_reason: string | null;
  created_at: string;
  updated_at: string;
  // Computed
  total_human_votes: number;
  total_ai_votes: number;
  approval_rate: number;
  quorum_met: boolean;
  // Joined
  ai_entities?: AIVotingEntity[];
  votes?: Vote[];
}

export interface Vote {
  id: string;
  session_id: string;
  voter_type: VoterType;
  voter_id: string;
  vote: VoteChoice;
  reason: string | null;
  voted_at: string;
  // Joined
  voter_profile?: Profile;
  ai_entity?: AIVotingEntity;
}

export interface AIVotingEntity {
  id: string;
  session_id: string;
  perspective_type: AIPerspectiveType;
  perspective_name: string;
  perspective_name_ko: string;
  system_prompt: string;
  raw_response: Record<string, unknown> | null;
  model_used: string;
  temperature: number;
  created_at: string;
}

// AI Entity Distribution Config
export interface AIEntityDistribution {
  tradition_based: number;  // 40%
  function_based: number;   // 30%
  contrarian: number;       // 20%
  meta: number;             // 10%
}

export const DEFAULT_AI_ENTITY_DISTRIBUTION: AIEntityDistribution = {
  tradition_based: 0.40,
  function_based: 0.30,
  contrarian: 0.20,
  meta: 0.10,
};

export interface AuditLog {
  id: number;
  event_type: string;
  actor_type: ActorType;
  actor_id: string | null;
  subject_type: string | null;
  subject_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface ScriptureVersion {
  id: string;
  chunk_id: string;
  version: number;
  text_ko: string;
  text_en: string;
  traditions: string[] | null;
  traditions_en: string[] | null;
  reflection_ko: string | null;
  reflection_en: string | null;
  change_type: ScriptureChangeType;
  change_summary: string | null;
  changed_by: string | null;
  voting_session_id: string | null;
  created_at: string;
}

export interface RevisionProposal {
  id: string;
  chunk_id: string;
  proposed_by: string;
  revision_type: RevisionType;
  current_text_ko: string;
  current_text_en: string;
  proposed_text_ko: string | null;
  proposed_text_en: string | null;
  proposed_traditions: string[] | null;
  proposed_traditions_en: string[] | null;
  proposed_reflection_ko: string | null;
  proposed_reflection_en: string | null;
  reason: string;
  semantic_similarity: number | null;
  auto_classified_type: string | null;
  status: RevisionStatus;
  discussion_ends_at: string | null;
  edit_count: number;
  rejection_count: number;
  cooldown_until: string | null;
  voting_session_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  chunk?: ScriptureChunkEvolution;
  proposer?: Profile;
  discussions?: RevisionDiscussion[];
  voting_session?: VotingSession;
}

export interface RevisionDiscussion {
  id: string;
  proposal_id: string;
  author_type: 'human' | 'ai_council';
  author_id: string | null;
  content: string;
  is_analysis: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  author_profile?: Profile;
  council_member?: CouncilMember;
}

// Extended ScriptureChunk with evolution fields
export interface ScriptureChunkEvolution {
  id: string;
  scripture_id: number;
  chapter: number;
  verse: number;
  text_ko: string;
  text_en: string;
  traditions: string[];
  traditions_en: string[];
  theme: string;
  reflection_ko: string | null;
  reflection_en: string | null;
  origin_type: OriginType;
  origin_submission_id: string | null;
  voting_session_id: string | null;
  version: number;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  related_quotes?: RelatedQuoteDB[];
  versions?: ScriptureVersion[];
  categories?: ContentCategory[];
}

export interface RelatedQuoteDB {
  id: string;
  chunk_id: string;
  source: string;
  author: string | null;
  text: string;
  tradition: string | null;
  created_at: string;
}

// --- Voting Threshold Constants ---

export const VOTING_THRESHOLDS = {
  new_submission: { approval: 0.60, quorum: 0.10, duration_days: 7 },
  revision_minor: { approval: 0.70, quorum: 0.10, duration_days: 7 },
  revision_major: { approval: 0.70, quorum: 0.15, duration_days: 14 },
  revision_deletion: { approval: 0.80, quorum: 0.20, duration_days: 21 },
  revision_tradition_tag: { approval: 0.70, quorum: 0.10, duration_days: 7 },
  revision_position_move: { approval: 0.70, quorum: 0.15, duration_days: 14 },
  archive_restore: { approval: 0.60, quorum: 0.10, duration_days: 7 },
  amendment_council: { approval: 0.67, quorum: 1.0, duration_days: 14 },
  amendment_community: { approval: 0.75, quorum: 0.25, duration_days: 21 },
} as const;

// --- Pipeline Stage Types ---

export interface PipelineState {
  submission_id: string;
  current_stage: SubmissionStatus;
  started_at: string;
  stages_completed: RefinementStage[];
  compliance_score: number | null;
  voting_session_id: string | null;
}

// --- Transparency Page Types ---

export interface TransparencyEvent {
  id: number;
  event_type: string;
  event_type_label_ko: string;
  event_type_label_en: string;
  actor_type: ActorType;
  actor_name: string;
  subject_summary: string;
  details_summary: string;
  created_at: string;
}

export interface TransparencyFilter {
  event_types?: string[];
  actor_types?: ActorType[];
  date_from?: string;
  date_to?: string;
  subject_type?: string;
  subject_id?: string;
}
