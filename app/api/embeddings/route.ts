import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { generateEmbedding, generateEmbeddings, VOYAGE_BATCH_LIMIT } from '@/lib/voyage'
import { checkRateLimit } from '@/lib/rate-limit'

/**
 * Embedding Management API
 *
 * POST /api/embeddings
 *   action="generate" - Generate embeddings for scripture_chunks without one
 *   action="search"   - Semantic search across scripture_chunks
 */

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createServiceClient(url, key)
}

export async function POST(request: Request) {
  try {
    // Auth check
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limit: 10 req/min per user
    const ip =
      request.headers.get('x-forwarded-for') ??
      request.headers.get('x-real-ip') ??
      'unknown'
    if (!checkRateLimit(`embeddings:${user.id}:${ip}`, 10, 60000)) {
      return Response.json({ error: 'Too many requests' }, { status: 429 })
    }

    const body = await request.json()
    const { action } = body as { action: string }

    if (action === 'generate') {
      return handleGenerate()
    } else if (action === 'search') {
      return handleSearch(body)
    } else {
      return Response.json(
        { error: 'Invalid action. Must be "generate" or "search".' },
        { status: 400 }
      )
    }
  } catch (err) {
    console.error('Embeddings API error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// action="generate": Batch generate embeddings for chunks without one
// ---------------------------------------------------------------------------

async function handleGenerate() {
  if (!process.env.VOYAGE_API_KEY) {
    return Response.json(
      { error: 'VOYAGE_API_KEY not configured' },
      { status: 503 }
    )
  }

  const serviceClient = getServiceClient()

  // Fetch scripture_chunks where embedding IS NULL
  const { data: chunks, error: fetchErr } = await serviceClient
    .from('scripture_chunks')
    .select('id, text_ko, text_en')
    .is('embedding', null)
    .order('chapter', { ascending: true })
    .order('verse', { ascending: true })
    .limit(1000)

  if (fetchErr) {
    return Response.json(
      { error: 'Failed to fetch chunks', details: fetchErr.message },
      { status: 500 }
    )
  }

  if (!chunks || chunks.length === 0) {
    return Response.json({
      message: 'All scripture_chunks already have embeddings',
      processed: 0,
    })
  }

  // Prepare texts for embedding (combine ko + en for richer representation)
  const texts = chunks.map(
    (c: { text_ko: string; text_en: string }) =>
      `${c.text_ko}\n\n${c.text_en}`
  )

  // Generate embeddings in batches
  let totalProcessed = 0
  const errors: string[] = []

  for (let i = 0; i < texts.length; i += VOYAGE_BATCH_LIMIT) {
    const batchTexts = texts.slice(i, i + VOYAGE_BATCH_LIMIT)
    const batchChunks = chunks.slice(i, i + VOYAGE_BATCH_LIMIT)

    const embeddings = await generateEmbeddings(batchTexts, 'document')
    if (!embeddings) {
      errors.push(`Batch ${Math.floor(i / VOYAGE_BATCH_LIMIT)} failed`)
      continue
    }

    // Update each chunk with its embedding
    for (let j = 0; j < batchChunks.length; j++) {
      const chunk = batchChunks[j] as { id: string }
      const embedding = embeddings[j]

      if (!embedding) {
        errors.push(`Missing embedding for chunk ${chunk.id}`)
        continue
      }

      // pgvector expects the embedding as a JSON string of the array
      const { error: updateErr } = await serviceClient
        .from('scripture_chunks')
        .update({ embedding: JSON.stringify(embedding) })
        .eq('id', chunk.id)

      if (updateErr) {
        errors.push(`Update failed for ${chunk.id}: ${updateErr.message}`)
      } else {
        totalProcessed++
      }
    }
  }

  return Response.json({
    message: 'Embedding generation complete',
    processed: totalProcessed,
    total: chunks.length,
    errors: errors.length > 0 ? errors : undefined,
  })
}

// ---------------------------------------------------------------------------
// action="search": Semantic vector search
// ---------------------------------------------------------------------------

interface SearchRequest {
  action: string
  query: string
  limit?: number
  threshold?: number
}

async function handleSearch(body: SearchRequest) {
  const { query, limit = 5, threshold = 0.5 } = body

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return Response.json({ error: 'query is required' }, { status: 400 })
  }

  if (!process.env.VOYAGE_API_KEY) {
    return Response.json(
      { error: 'VOYAGE_API_KEY not configured. Semantic search unavailable.' },
      { status: 503 }
    )
  }

  // Generate query embedding (use "query" input_type for search)
  const queryEmbedding = await generateEmbedding(query.trim(), 'query')
  if (!queryEmbedding) {
    return Response.json(
      { error: 'Failed to generate query embedding' },
      { status: 502 }
    )
  }

  const serviceClient = getServiceClient()

  // Vector similarity search using pgvector cosine distance operator (<=>)
  // 1 - (embedding <=> query_vector) gives cosine similarity
  const embeddingStr = `[${queryEmbedding.join(',')}]`
  const clampedLimit = Math.min(Math.max(1, limit), 50)

  const { data, error } = await serviceClient.rpc('match_scripture_chunks', {
    query_embedding: embeddingStr,
    match_threshold: threshold,
    match_count: clampedLimit,
  })

  if (error) {
    // Fallback: try raw SQL if RPC function doesn't exist
    console.warn(
      'RPC match_scripture_chunks not found, using raw query:',
      error.message
    )

    const { data: rawData, error: rawErr } = await serviceClient
      .from('scripture_chunks')
      .select('id, chapter, verse, text_ko, text_en, traditions, traditions_en, theme')
      .not('embedding', 'is', null)
      .limit(clampedLimit)

    if (rawErr || !rawData) {
      return Response.json(
        { error: 'Search failed', details: rawErr?.message },
        { status: 500 }
      )
    }

    // Note: Without RPC, we cannot do server-side vector search.
    // Return available chunks with a warning.
    return Response.json({
      results: rawData,
      warning:
        'RPC function match_scripture_chunks not found. Results are not semantically ranked. ' +
        'Run the migration to create the function.',
    })
  }

  return Response.json({
    results: data,
    query: query.trim(),
    count: data?.length ?? 0,
  })
}
