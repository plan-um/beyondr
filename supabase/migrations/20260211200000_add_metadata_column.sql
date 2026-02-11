-- Add metadata JSONB column to scripture_chunks for counseling context and other extensible data
ALTER TABLE scripture_chunks ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Create a GIN index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_scripture_chunks_metadata ON scripture_chunks USING gin(metadata);

-- Create index on counseling scenarios for efficient filtering
CREATE INDEX IF NOT EXISTS idx_scripture_chunks_counseling_scenarios
  ON scripture_chunks USING gin((metadata->'counseling_context'->'scenarios'));

-- Drop existing function first (return type changed: added metadata column)
DROP FUNCTION IF EXISTS match_scripture_chunks(vector(1024), float, int);

-- Recreate match_scripture_chunks RPC with metadata column
CREATE OR REPLACE FUNCTION match_scripture_chunks(
  query_embedding vector(1024),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id text,
  chapter int,
  verse numeric(10,2),
  text_ko text,
  text_en text,
  traditions text[],
  traditions_en text[],
  theme text,
  reflection_ko text,
  reflection_en text,
  metadata jsonb,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    sc.id,
    sc.chapter,
    sc.verse,
    sc.text_ko,
    sc.text_en,
    sc.traditions,
    sc.traditions_en,
    sc.theme,
    sc.reflection_ko,
    sc.reflection_en,
    sc.metadata,
    1 - (sc.embedding <=> query_embedding) AS similarity
  FROM scripture_chunks sc
  WHERE sc.embedding IS NOT NULL
    AND 1 - (sc.embedding <=> query_embedding) > match_threshold
  ORDER BY sc.embedding <=> query_embedding
  LIMIT match_count;
$$;
