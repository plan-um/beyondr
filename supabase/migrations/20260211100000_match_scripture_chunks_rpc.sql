-- ============================================================================
-- RPC: match_scripture_chunks — vector similarity search for semantic search
-- ============================================================================
-- Used by: app/api/embeddings/route.ts (search action)
--          app/api/chat/route.ts (semantic scripture lookup)
--
-- Returns scripture_chunks ranked by cosine similarity to the query embedding.
-- ============================================================================

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
    1 - (sc.embedding <=> query_embedding) AS similarity
  FROM scripture_chunks sc
  WHERE sc.embedding IS NOT NULL
    AND 1 - (sc.embedding <=> query_embedding) > match_threshold
  ORDER BY sc.embedding <=> query_embedding
  LIMIT match_count;
$$;
