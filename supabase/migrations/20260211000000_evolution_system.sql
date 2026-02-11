-- ============================================================================
-- Living Scripture Evolution System — Full Schema Migration
-- ============================================================================
-- Created: 2026-02-11
-- Description: Creates ALL tables for the democratic scripture growth system
--   including user contributions, AI screening, refinement, voting, placement,
--   governance, categories, crawling, revision, and audit infrastructure.
-- ============================================================================

-- ============================================================================
-- 0. EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "vector";  -- pgvector for semantic embeddings


-- ============================================================================
-- 1. UTILITY FUNCTIONS
-- ============================================================================

-- Generic updated_at trigger function (reused across all tables with updated_at)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Append-only enforcement for audit_logs
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only. UPDATE and DELETE are prohibited.';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- 2. BASE TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 2.1 profiles — linked to Supabase auth.users
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url  TEXT,
  role        TEXT DEFAULT 'member'
    CHECK (role IN ('member', 'contributor', 'moderator', 'admin', 'founder')),
  contribution_count INTEGER DEFAULT 0,
  joined_at   TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- 2.2 scriptures — chapters / top-level scripture containers
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scriptures (
  id          SERIAL PRIMARY KEY,
  title_ko    TEXT NOT NULL,
  title_en    TEXT NOT NULL,
  theme       TEXT NOT NULL,
  intro_ko    TEXT,
  intro_en    TEXT,
  sort_order  INTEGER,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 2.3 submissions — user-submitted content (created BEFORE scripture_chunks
--     because scripture_chunks.origin_submission_id references this table)
-- NOTE: submissions.related_chunk_id FK to scripture_chunks is added later
--       via ALTER TABLE to break the circular dependency.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS submissions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type                TEXT NOT NULL
    CHECK (type IN ('wisdom', 'story', 'reflection', 'teaching', 'prayer', 'poem')),
  title               TEXT,
  raw_text            TEXT NOT NULL,
  max_length_check    BOOLEAN GENERATED ALWAYS AS (
    CASE type
      WHEN 'wisdom'     THEN length(raw_text) <= 500
      WHEN 'story'      THEN length(raw_text) <= 5000
      WHEN 'reflection' THEN length(raw_text) <= 2000
      WHEN 'teaching'   THEN length(raw_text) <= 3000
      WHEN 'prayer'     THEN length(raw_text) <= 1000
      WHEN 'poem'       THEN length(raw_text) <= 1500
      ELSE true
    END
  ) STORED,
  language            TEXT DEFAULT 'ko',
  related_chunk_id    TEXT,  -- FK added after scripture_chunks creation
  embedding           vector(1024),
  status              TEXT DEFAULT 'draft'
    CHECK (status IN (
      'draft', 'submitted', 'screening', 'screening_passed',
      'screening_failed', 'refining', 'refined', 'voting',
      'approved', 'rejected', 'registered'
    )),
  screening_result    JSONB,
  compliance_score    NUMERIC(5,4),
  rejection_reason    TEXT,
  resubmission_count  INTEGER DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER submissions_updated_at
  BEFORE UPDATE ON submissions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- 2.4 voting_sessions — created before scripture_chunks because
--     scripture_chunks.voting_session_id references this table.
--     subject_id is TEXT (polymorphic) so no circular FK issue.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS voting_sessions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type          TEXT NOT NULL
    CHECK (subject_type IN ('new_submission', 'revision', 'amendment', 'archive_restore')),
  subject_id            TEXT NOT NULL,  -- polymorphic: submission_id, revision_proposal_id, etc.
  title                 TEXT NOT NULL,
  description           TEXT,
  approval_threshold    NUMERIC(3,2) NOT NULL DEFAULT 0.60,
  quorum_percentage     NUMERIC(3,2) NOT NULL DEFAULT 0.10,
  eligible_human_count  INTEGER NOT NULL DEFAULT 0,
  ai_entity_count       INTEGER NOT NULL DEFAULT 0,
  human_votes_for       INTEGER DEFAULT 0,
  human_votes_against   INTEGER DEFAULT 0,
  human_votes_abstain   INTEGER DEFAULT 0,
  ai_votes_for          INTEGER DEFAULT 0,
  ai_votes_against      INTEGER DEFAULT 0,
  ai_votes_abstain      INTEGER DEFAULT 0,
  status                TEXT DEFAULT 'pending'
    CHECK (status IN (
      'pending', 'active', 'tallying', 'approved',
      'rejected', 'quorum_failed', 'flagged'
    )),
  starts_at             TIMESTAMPTZ NOT NULL,
  ends_at               TIMESTAMPTZ NOT NULL,
  flagged_reason        TEXT,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER voting_sessions_updated_at
  BEFORE UPDATE ON voting_sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- 2.5 scripture_chunks — verses with evolution metadata
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scripture_chunks (
  id                  TEXT PRIMARY KEY,  -- format: '{chapter}:{verse}'
  scripture_id        INTEGER REFERENCES scriptures(id) ON DELETE SET NULL,
  chapter             INTEGER NOT NULL,
  verse               NUMERIC(10,2) NOT NULL,  -- supports decimals like 5.1
  text_ko             TEXT NOT NULL,
  text_en             TEXT NOT NULL,
  traditions          TEXT[] DEFAULT '{}',
  traditions_en       TEXT[] DEFAULT '{}',
  theme               TEXT NOT NULL,
  reflection_ko       TEXT,
  reflection_en       TEXT,
  embedding           vector(1024),  -- Voyage-3.5 dimension
  origin_type         TEXT DEFAULT 'founding'
    CHECK (origin_type IN ('founding', 'crawled', 'user_submission', 'community_revision')),
  origin_submission_id UUID REFERENCES submissions(id) ON DELETE SET NULL,
  voting_session_id   UUID REFERENCES voting_sessions(id) ON DELETE SET NULL,
  version             INTEGER DEFAULT 1,
  is_archived         BOOLEAN DEFAULT false,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER scripture_chunks_updated_at
  BEFORE UPDATE ON scripture_chunks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Now add the deferred FK from submissions → scripture_chunks
ALTER TABLE submissions
  ADD CONSTRAINT fk_submissions_related_chunk
  FOREIGN KEY (related_chunk_id) REFERENCES scripture_chunks(id) ON DELETE SET NULL;

-- ----------------------------------------------------------------------------
-- 2.6 related_quotes — extracted from inline to separate table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS related_quotes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id    TEXT NOT NULL REFERENCES scripture_chunks(id) ON DELETE CASCADE,
  source      TEXT NOT NULL,
  author      TEXT,
  text        TEXT NOT NULL,
  tradition   TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);


-- ============================================================================
-- 3. GOVERNANCE TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 3.1 constitutional_principles
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS constitutional_principles (
  id              SERIAL PRIMARY KEY,
  code            TEXT UNIQUE NOT NULL,  -- e.g., 'SAFETY', 'UNIVERSAL_HUMANITY'
  name_ko         TEXT NOT NULL,
  name_en         TEXT NOT NULL,
  description_ko  TEXT NOT NULL,
  description_en  TEXT NOT NULL,
  priority        INTEGER NOT NULL,      -- 1 = highest
  weight          NUMERIC(5,4) NOT NULL, -- inversely proportional to priority
  version         INTEGER DEFAULT 1,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER constitutional_principles_updated_at
  BEFORE UPDATE ON constitutional_principles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- 3.2 principle_versions — version history for constitutional principles
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS principle_versions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  principle_id    INTEGER NOT NULL REFERENCES constitutional_principles(id) ON DELETE CASCADE,
  version         INTEGER NOT NULL,
  name_ko         TEXT NOT NULL,
  name_en         TEXT NOT NULL,
  description_ko  TEXT NOT NULL,
  description_en  TEXT NOT NULL,
  change_summary  TEXT,
  changed_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 3.3 amendments — constitutional amendment proposals
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS amendments (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type                    TEXT NOT NULL
    CHECK (type IN ('principle_add', 'principle_modify', 'principle_remove', 'theme_add', 'theme_modify')),
  title                   TEXT NOT NULL,
  description             TEXT NOT NULL,
  proposed_by             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status                  TEXT DEFAULT 'discussion'
    CHECK (status IN (
      'discussion', 'council_vote', 'community_vote',
      'approved', 'rejected', 'withdrawn'
    )),
  discussion_ends_at      TIMESTAMPTZ,
  council_vote_ends_at    TIMESTAMPTZ,
  community_vote_ends_at  TIMESTAMPTZ,
  council_votes_for       INTEGER DEFAULT 0,
  council_votes_against   INTEGER DEFAULT 0,
  community_votes_for     INTEGER DEFAULT 0,
  community_votes_against INTEGER DEFAULT 0,
  required_majority       NUMERIC(3,2) DEFAULT 0.75,
  cooldown_until          TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER amendments_updated_at
  BEFORE UPDATE ON amendments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- 3.4 council_members — human and AI council members
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS council_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,  -- NULL for AI members
  name          TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('founder', 'human', 'ai')),
  perspective   TEXT,           -- AI's perspective description
  system_prompt TEXT,           -- AI's system prompt for evaluations
  is_active     BOOLEAN DEFAULT true,
  appointed_at  TIMESTAMPTZ DEFAULT now(),
  created_at    TIMESTAMPTZ DEFAULT now()
);


-- ============================================================================
-- 4. CATEGORY TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 4.1 categories — hierarchical: theme → subtopic → tag
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id         UUID REFERENCES categories(id) ON DELETE CASCADE,
  depth             INTEGER NOT NULL CHECK (depth IN (0, 1, 2)),  -- 0=theme, 1=subtopic, 2=tag
  name_ko           TEXT NOT NULL,
  name_en           TEXT NOT NULL,
  description_ko    TEXT,
  description_en    TEXT,
  embedding         vector(1024),
  governance_level  TEXT CHECK (governance_level IN ('constitutional', 'council', 'community')),
  support_count     INTEGER DEFAULT 0,  -- for depth=2 auto-approval
  is_active         BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 4.2 content_categories — junction table (polymorphic)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS content_categories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type  TEXT NOT NULL
    CHECK (content_type IN ('submission', 'crawled', 'scripture_chunk')),
  content_id    TEXT NOT NULL,  -- polymorphic reference
  category_id   UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  confidence    NUMERIC(5,4),
  assigned_by   TEXT CHECK (assigned_by IN ('auto', 'manual', 'ai')),
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(content_type, content_id, category_id)
);


-- ============================================================================
-- 5. CONTENT PIPELINE TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 5.1 crawl_sources — external content sources
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crawl_sources (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  source_type       TEXT NOT NULL
    CHECK (source_type IN ('religious_api', 'modern_spiritual', 'academic', 'web_dataset')),
  url               TEXT,
  api_config        JSONB,
  schedule_cron     TEXT DEFAULT '0 3 * * 1',  -- weekly Monday 3AM
  copyright_status  TEXT CHECK (copyright_status IN ('public_domain', 'cc_by', 'cc_by_nc', 'manual_review')),
  is_active         BOOLEAN DEFAULT true,
  last_crawled_at   TIMESTAMPTZ,
  total_collected   INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER crawl_sources_updated_at
  BEFORE UPDATE ON crawl_sources
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- 5.2 crawled_content — collected external content
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crawled_content (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id             UUID REFERENCES crawl_sources(id) ON DELETE SET NULL,
  content_hash          TEXT NOT NULL UNIQUE,  -- SHA-256 for dedup
  raw_text              TEXT NOT NULL,
  original_language     TEXT,
  author                TEXT,
  source_url            TEXT,
  publication_year      INTEGER,
  copyright_status      TEXT,
  embedding             vector(1024),
  relevance_score       NUMERIC(5,4),
  quality_score         NUMERIC(5,4),
  semantic_duplicate_of UUID REFERENCES crawled_content(id) ON DELETE SET NULL,
  status                TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'passed', 'rejected', 'duplicate')),
  created_at            TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 5.3 refinement_history — tracks AI refinement stages
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS refinement_history (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id             UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  stage                     TEXT NOT NULL CHECK (stage IN ('raw', 'draft', 'refined', 'canonical')),
  text_ko                   TEXT NOT NULL,
  text_en                   TEXT,
  ai_model                  TEXT,
  prompt_hash               TEXT,
  change_summary            TEXT,
  meaning_preservation_score NUMERIC(5,4),
  user_accepted             BOOLEAN,
  created_at                TIMESTAMPTZ DEFAULT now()
);


-- ============================================================================
-- 6. VOTING TABLES
-- ============================================================================

-- voting_sessions already created in section 2.4

-- ----------------------------------------------------------------------------
-- 6.1 ai_voting_entities — AI perspectives for a voting session
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_voting_entities (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          UUID NOT NULL REFERENCES voting_sessions(id) ON DELETE CASCADE,
  perspective_type    TEXT NOT NULL
    CHECK (perspective_type IN ('tradition_based', 'function_based', 'contrarian', 'meta')),
  perspective_name    TEXT NOT NULL,
  perspective_name_ko TEXT NOT NULL,
  system_prompt       TEXT NOT NULL,
  raw_response        JSONB,
  model_used          TEXT DEFAULT 'claude-haiku-4-5-20251001',
  temperature         NUMERIC(3,2) DEFAULT 0.30,
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 6.2 votes — individual vote records
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS votes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES voting_sessions(id) ON DELETE CASCADE,
  voter_type  TEXT NOT NULL CHECK (voter_type IN ('human', 'ai')),
  voter_id    UUID NOT NULL,  -- profiles.id or ai_voting_entities.id
  vote        TEXT NOT NULL CHECK (vote IN ('for', 'against', 'abstain')),
  reason      TEXT,           -- required for AI, optional for human
  voted_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, voter_type, voter_id)
);


-- ============================================================================
-- 7. AUDIT TABLE (APPEND-ONLY)
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id            BIGSERIAL PRIMARY KEY,
  event_type    TEXT NOT NULL,
  actor_type    TEXT NOT NULL CHECK (actor_type IN ('human', 'ai', 'system')),
  actor_id      TEXT,
  subject_type  TEXT,
  subject_id    TEXT,
  details       JSONB,
  ip_address    INET,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Enforce append-only: prevent UPDATE
CREATE TRIGGER audit_logs_no_update
  BEFORE UPDATE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

-- Enforce append-only: prevent DELETE
CREATE TRIGGER audit_logs_no_delete
  BEFORE DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();


-- ============================================================================
-- 8. SCRIPTURE VERSION HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS scripture_versions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id          TEXT NOT NULL REFERENCES scripture_chunks(id) ON DELETE CASCADE,
  version           INTEGER NOT NULL,
  text_ko           TEXT NOT NULL,
  text_en           TEXT NOT NULL,
  traditions        TEXT[],
  traditions_en     TEXT[],
  reflection_ko     TEXT,
  reflection_en     TEXT,
  change_type       TEXT CHECK (change_type IN (
    'founding', 'community_revision', 'emergency_fix', 'archive', 'restore'
  )),
  change_summary    TEXT,
  changed_by        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  voting_session_id UUID REFERENCES voting_sessions(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(chunk_id, version)
);


-- ============================================================================
-- 9. REVISION TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 9.1 revision_proposals
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS revision_proposals (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id              TEXT NOT NULL REFERENCES scripture_chunks(id) ON DELETE CASCADE,
  proposed_by           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  revision_type         TEXT NOT NULL
    CHECK (revision_type IN (
      'minor_text', 'major_text', 'tradition_tag',
      'position_move', 'deletion', 'chapter_structure'
    )),
  current_text_ko       TEXT NOT NULL,
  current_text_en       TEXT NOT NULL,
  proposed_text_ko      TEXT,
  proposed_text_en      TEXT,
  proposed_traditions   TEXT[],
  proposed_traditions_en TEXT[],
  proposed_reflection_ko TEXT,
  proposed_reflection_en TEXT,
  reason                TEXT NOT NULL,
  semantic_similarity   NUMERIC(5,4),
  auto_classified_type  TEXT,
  status                TEXT DEFAULT 'proposed'
    CHECK (status IN (
      'proposed', 'screening', 'discussion', 'refining',
      'voting', 'approved', 'rejected', 'withdrawn'
    )),
  discussion_ends_at    TIMESTAMPTZ,
  edit_count            INTEGER DEFAULT 0,  -- max 3 edits during discussion
  rejection_count       INTEGER DEFAULT 0,
  cooldown_until        TIMESTAMPTZ,
  voting_session_id     UUID REFERENCES voting_sessions(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER revision_proposals_updated_at
  BEFORE UPDATE ON revision_proposals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- 9.2 revision_discussions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS revision_discussions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id   UUID NOT NULL REFERENCES revision_proposals(id) ON DELETE CASCADE,
  author_type   TEXT NOT NULL CHECK (author_type IN ('human', 'ai_council')),
  author_id     UUID,  -- profiles.id or council_members.id
  content       TEXT NOT NULL,
  is_analysis   BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER revision_discussions_updated_at
  BEFORE UPDATE ON revision_discussions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================================
-- 10. INDEXES
-- ============================================================================

-- ---- scripture_chunks ----
CREATE INDEX idx_scripture_chunks_theme        ON scripture_chunks (theme);
CREATE INDEX idx_scripture_chunks_chapter_verse ON scripture_chunks (chapter, verse);
CREATE INDEX idx_scripture_chunks_origin_type   ON scripture_chunks (origin_type);
CREATE INDEX idx_scripture_chunks_scripture_id  ON scripture_chunks (scripture_id);

-- IVFFlat index on embeddings (requires rows to exist for training; safe to create on empty table)
-- Using lists = 100 as a reasonable default; tune after data is populated.
CREATE INDEX idx_scripture_chunks_embedding ON scripture_chunks
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ---- categories ----
CREATE INDEX idx_categories_parent_id ON categories (parent_id);
CREATE INDEX idx_categories_depth     ON categories (depth);

CREATE INDEX idx_categories_embedding ON categories
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);

-- ---- submissions ----
CREATE INDEX idx_submissions_user_id ON submissions (user_id);
CREATE INDEX idx_submissions_status  ON submissions (status);
CREATE INDEX idx_submissions_type    ON submissions (type);

-- ---- crawled_content ----
CREATE INDEX idx_crawled_content_hash      ON crawled_content (content_hash);
CREATE INDEX idx_crawled_content_source_id ON crawled_content (source_id);
CREATE INDEX idx_crawled_content_status    ON crawled_content (status);

-- ---- voting_sessions ----
CREATE INDEX idx_voting_sessions_subject ON voting_sessions (subject_type, subject_id);
CREATE INDEX idx_voting_sessions_status  ON voting_sessions (status);
CREATE INDEX idx_voting_sessions_ends_at ON voting_sessions (ends_at);

-- ---- votes ----
CREATE INDEX idx_votes_session_id ON votes (session_id);
CREATE INDEX idx_votes_voter      ON votes (voter_type, voter_id);

-- ---- audit_logs ----
CREATE INDEX idx_audit_logs_event_type  ON audit_logs (event_type);
CREATE INDEX idx_audit_logs_actor_type  ON audit_logs (actor_type);
CREATE INDEX idx_audit_logs_subject     ON audit_logs (subject_type, subject_id);
CREATE INDEX idx_audit_logs_created_at  ON audit_logs (created_at);

-- ---- revision_proposals ----
CREATE INDEX idx_revision_proposals_chunk_id    ON revision_proposals (chunk_id);
CREATE INDEX idx_revision_proposals_proposed_by ON revision_proposals (proposed_by);
CREATE INDEX idx_revision_proposals_status      ON revision_proposals (status);

-- ---- related_quotes ----
CREATE INDEX idx_related_quotes_chunk_id ON related_quotes (chunk_id);

-- ---- content_categories ----
CREATE INDEX idx_content_categories_category ON content_categories (category_id);
CREATE INDEX idx_content_categories_content  ON content_categories (content_type, content_id);

-- ---- refinement_history ----
CREATE INDEX idx_refinement_history_submission ON refinement_history (submission_id);

-- ---- principle_versions ----
CREATE INDEX idx_principle_versions_principle ON principle_versions (principle_id);

-- ---- scripture_versions ----
CREATE INDEX idx_scripture_versions_chunk ON scripture_versions (chunk_id);

-- ---- ai_voting_entities ----
CREATE INDEX idx_ai_voting_entities_session ON ai_voting_entities (session_id);

-- ---- amendments ----
CREATE INDEX idx_amendments_proposed_by ON amendments (proposed_by);
CREATE INDEX idx_amendments_status      ON amendments (status);

-- ---- revision_discussions ----
CREATE INDEX idx_revision_discussions_proposal ON revision_discussions (proposal_id);


-- ============================================================================
-- 11. ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on ALL tables
ALTER TABLE profiles                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE scriptures               ENABLE ROW LEVEL SECURITY;
ALTER TABLE scripture_chunks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE related_quotes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE constitutional_principles ENABLE ROW LEVEL SECURITY;
ALTER TABLE principle_versions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE amendments               ENABLE ROW LEVEL SECURITY;
ALTER TABLE council_members          ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories               ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_categories       ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawl_sources            ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawled_content          ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions              ENABLE ROW LEVEL SECURITY;
ALTER TABLE refinement_history       ENABLE ROW LEVEL SECURITY;
ALTER TABLE voting_sessions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_voting_entities       ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs               ENABLE ROW LEVEL SECURITY;
ALTER TABLE scripture_versions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE revision_proposals       ENABLE ROW LEVEL SECURITY;
ALTER TABLE revision_discussions     ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 11.1 profiles — users can read all, update own
-- ============================================================================

CREATE POLICY profiles_select_all
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY profiles_update_own
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY profiles_insert_own
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);


-- ============================================================================
-- 11.2 scriptures — public read
-- ============================================================================

CREATE POLICY scriptures_select_all
  ON scriptures FOR SELECT
  USING (true);

CREATE POLICY scriptures_admin_write
  ON scriptures FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'founder')
    )
  );


-- ============================================================================
-- 11.3 scripture_chunks — public read, admin/system write
-- ============================================================================

CREATE POLICY scripture_chunks_select_all
  ON scripture_chunks FOR SELECT
  USING (true);

CREATE POLICY scripture_chunks_admin_write
  ON scripture_chunks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'founder')
    )
  );


-- ============================================================================
-- 11.4 related_quotes — public read, admin write
-- ============================================================================

CREATE POLICY related_quotes_select_all
  ON related_quotes FOR SELECT
  USING (true);

CREATE POLICY related_quotes_admin_write
  ON related_quotes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'founder')
    )
  );


-- ============================================================================
-- 11.5 submissions — users can CRUD own drafts, read approved others
-- ============================================================================

-- Everyone can read approved/registered submissions
CREATE POLICY submissions_select_public
  ON submissions FOR SELECT
  USING (
    status IN ('approved', 'registered', 'voting')
    OR user_id = auth.uid()
  );

-- Users can insert their own
CREATE POLICY submissions_insert_own
  ON submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own drafts
CREATE POLICY submissions_update_own_draft
  ON submissions FOR UPDATE
  USING (
    auth.uid() = user_id
    AND status = 'draft'
  )
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own drafts
CREATE POLICY submissions_delete_own_draft
  ON submissions FOR DELETE
  USING (
    auth.uid() = user_id
    AND status = 'draft'
  );

-- Admin/system can manage all submissions
CREATE POLICY submissions_admin_all
  ON submissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'founder')
    )
  );


-- ============================================================================
-- 11.6 votes — users can insert own (1 per session), read own
-- ============================================================================

CREATE POLICY votes_insert_own
  ON votes FOR INSERT
  WITH CHECK (
    voter_type = 'human'
    AND voter_id = auth.uid()
  );

CREATE POLICY votes_select_own
  ON votes FOR SELECT
  USING (
    (voter_type = 'human' AND voter_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'founder')
    )
  );

-- Admin full access for system/AI vote management
CREATE POLICY votes_admin_all
  ON votes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'founder')
    )
  );


-- ============================================================================
-- 11.7 voting_sessions — public read active sessions
-- ============================================================================

CREATE POLICY voting_sessions_select_all
  ON voting_sessions FOR SELECT
  USING (true);

CREATE POLICY voting_sessions_admin_write
  ON voting_sessions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'founder')
    )
  );


-- ============================================================================
-- 11.8 audit_logs — public read (transparency)
-- ============================================================================

CREATE POLICY audit_logs_select_all
  ON audit_logs FOR SELECT
  USING (true);

-- Insert only for authenticated users and service role
CREATE POLICY audit_logs_insert_authenticated
  ON audit_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);


-- ============================================================================
-- 11.9 revision_proposals — users can CRUD own, read all non-draft
-- ============================================================================

CREATE POLICY revision_proposals_select_all
  ON revision_proposals FOR SELECT
  USING (
    status != 'proposed'
    OR proposed_by = auth.uid()
  );

CREATE POLICY revision_proposals_insert_own
  ON revision_proposals FOR INSERT
  WITH CHECK (auth.uid() = proposed_by);

CREATE POLICY revision_proposals_update_own
  ON revision_proposals FOR UPDATE
  USING (
    auth.uid() = proposed_by
    AND status IN ('proposed', 'discussion')
  )
  WITH CHECK (auth.uid() = proposed_by);

CREATE POLICY revision_proposals_delete_own
  ON revision_proposals FOR DELETE
  USING (
    auth.uid() = proposed_by
    AND status = 'proposed'
  );

CREATE POLICY revision_proposals_admin_all
  ON revision_proposals FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'founder')
    )
  );


-- ============================================================================
-- 11.10 revision_discussions — users can insert own, read all
-- ============================================================================

CREATE POLICY revision_discussions_select_all
  ON revision_discussions FOR SELECT
  USING (true);

CREATE POLICY revision_discussions_insert_own
  ON revision_discussions FOR INSERT
  WITH CHECK (
    author_type = 'human'
    AND author_id = auth.uid()
  );

CREATE POLICY revision_discussions_admin_all
  ON revision_discussions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'founder')
    )
  );


-- ============================================================================
-- 11.11 council_members — public read active, admin write
-- ============================================================================

CREATE POLICY council_members_select_active
  ON council_members FOR SELECT
  USING (is_active = true);

CREATE POLICY council_members_admin_write
  ON council_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'founder')
    )
  );


-- ============================================================================
-- 11.12 constitutional_principles — public read, admin write
-- ============================================================================

CREATE POLICY constitutional_principles_select_all
  ON constitutional_principles FOR SELECT
  USING (true);

CREATE POLICY constitutional_principles_admin_write
  ON constitutional_principles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'founder')
    )
  );


-- ============================================================================
-- 11.13 categories — public read, varied write based on depth
-- ============================================================================

CREATE POLICY categories_select_all
  ON categories FOR SELECT
  USING (true);

-- depth=0 (themes): only admin can create/modify (constitutional governance)
CREATE POLICY categories_admin_theme_write
  ON categories FOR INSERT
  WITH CHECK (
    depth = 0
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'founder')
    )
  );

-- depth=1 (subtopics): moderator+ can create
CREATE POLICY categories_moderator_subtopic_write
  ON categories FOR INSERT
  WITH CHECK (
    depth = 1
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('moderator', 'admin', 'founder')
    )
  );

-- depth=2 (tags): contributors+ can create
CREATE POLICY categories_contributor_tag_write
  ON categories FOR INSERT
  WITH CHECK (
    depth = 2
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('contributor', 'moderator', 'admin', 'founder')
    )
  );

-- Admin can update/delete any category
CREATE POLICY categories_admin_manage
  ON categories FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'founder')
    )
  );

CREATE POLICY categories_admin_delete
  ON categories FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'founder')
    )
  );


-- ============================================================================
-- 11.14 content_categories — public read, varied write
-- ============================================================================

CREATE POLICY content_categories_select_all
  ON content_categories FOR SELECT
  USING (true);

CREATE POLICY content_categories_admin_write
  ON content_categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'founder')
    )
  );


-- ============================================================================
-- 11.15 crawl_sources — admin only
-- ============================================================================

CREATE POLICY crawl_sources_admin_all
  ON crawl_sources FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'founder')
    )
  );


-- ============================================================================
-- 11.16 crawled_content — admin only
-- ============================================================================

CREATE POLICY crawled_content_admin_all
  ON crawled_content FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'founder')
    )
  );


-- ============================================================================
-- 11.17 refinement_history — users can read own submission's history
-- ============================================================================

CREATE POLICY refinement_history_select
  ON refinement_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM submissions
      WHERE submissions.id = refinement_history.submission_id
        AND (
          submissions.user_id = auth.uid()
          OR submissions.status IN ('approved', 'registered')
        )
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'founder')
    )
  );

CREATE POLICY refinement_history_admin_write
  ON refinement_history FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'founder')
    )
  );


-- ============================================================================
-- 11.18 ai_voting_entities — public read, admin write
-- ============================================================================

CREATE POLICY ai_voting_entities_select_all
  ON ai_voting_entities FOR SELECT
  USING (true);

CREATE POLICY ai_voting_entities_admin_write
  ON ai_voting_entities FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'founder')
    )
  );


-- ============================================================================
-- 11.19 scripture_versions — public read
-- ============================================================================

CREATE POLICY scripture_versions_select_all
  ON scripture_versions FOR SELECT
  USING (true);

CREATE POLICY scripture_versions_admin_write
  ON scripture_versions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'founder')
    )
  );


-- ============================================================================
-- 11.20 principle_versions — public read, admin write
-- ============================================================================

CREATE POLICY principle_versions_select_all
  ON principle_versions FOR SELECT
  USING (true);

CREATE POLICY principle_versions_admin_write
  ON principle_versions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'founder')
    )
  );


-- ============================================================================
-- 11.21 amendments — public read, varied write
-- ============================================================================

CREATE POLICY amendments_select_all
  ON amendments FOR SELECT
  USING (true);

CREATE POLICY amendments_insert_contributor
  ON amendments FOR INSERT
  WITH CHECK (
    auth.uid() = proposed_by
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('contributor', 'moderator', 'admin', 'founder')
    )
  );

CREATE POLICY amendments_update_own
  ON amendments FOR UPDATE
  USING (
    auth.uid() = proposed_by
    AND status = 'discussion'
  );

CREATE POLICY amendments_admin_all
  ON amendments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'founder')
    )
  );


-- ============================================================================
-- 12. SERVICE ROLE BYPASS
-- ============================================================================
-- Supabase service_role key bypasses RLS automatically.
-- Edge Functions and background jobs (crawlers, AI pipelines, vote tallying)
-- should use service_role to write to tables restricted by RLS.
-- No additional configuration needed — this is built into Supabase.


-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Tables created: 21
--   profiles, scriptures, scripture_chunks, related_quotes,
--   constitutional_principles, principle_versions, amendments,
--   council_members, categories, content_categories,
--   crawl_sources, crawled_content, submissions, refinement_history,
--   voting_sessions, votes, ai_voting_entities, audit_logs,
--   scripture_versions, revision_proposals, revision_discussions
--
-- Triggers: updated_at (8 tables), audit_logs append-only (2 triggers)
-- Indexes: 28 indexes including 2 IVFFlat vector indexes
-- RLS: Enabled on all 21 tables with granular policies
-- ============================================================================
