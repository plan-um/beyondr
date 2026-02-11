/**
 * Voyage-3.5 Embedding API Client
 *
 * Provides embedding generation and similarity computation for:
 * - Semantic scripture search
 * - Plagiarism detection
 * - Content similarity measurement
 *
 * Gracefully degrades when VOYAGE_API_KEY is not set.
 */

const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings'
const VOYAGE_MODEL = 'voyage-3.5'
const VOYAGE_DIMENSIONS = 1024
const VOYAGE_BATCH_LIMIT = 128

interface VoyageEmbeddingResponse {
  object: string
  data: Array<{
    object: string
    index: number
    embedding: number[]
  }>
  model: string
  usage: {
    total_tokens: number
  }
}

/**
 * Generate a single embedding vector for the given text.
 * Returns null if VOYAGE_API_KEY is not configured.
 *
 * @param text - The text to embed
 * @param inputType - "document" for storage, "query" for search
 */
export async function generateEmbedding(
  text: string,
  inputType: 'document' | 'query' = 'document'
): Promise<number[] | null> {
  const apiKey = process.env.VOYAGE_API_KEY
  if (!apiKey) return null

  try {
    const response = await fetch(VOYAGE_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: VOYAGE_MODEL,
        input: [text],
        input_type: inputType,
      }),
    })

    if (!response.ok) {
      const errBody = await response.text()
      console.error(`Voyage API error ${response.status}: ${errBody}`)
      return null
    }

    const data: VoyageEmbeddingResponse = await response.json()
    return data.data[0]?.embedding ?? null
  } catch (error) {
    console.error('Voyage embedding generation failed:', error)
    return null
  }
}

/**
 * Generate embeddings for multiple texts in a single batch request.
 * Returns null if VOYAGE_API_KEY is not configured.
 * Automatically chunks inputs into batches of 128.
 *
 * @param texts - Array of texts to embed (automatically batched if > 128)
 * @param inputType - "document" for storage, "query" for search
 */
export async function generateEmbeddings(
  texts: string[],
  inputType: 'document' | 'query' = 'document'
): Promise<number[][] | null> {
  const apiKey = process.env.VOYAGE_API_KEY
  if (!apiKey) return null

  if (texts.length === 0) return []

  try {
    const allEmbeddings: number[][] = []

    // Process in batches of VOYAGE_BATCH_LIMIT
    for (let i = 0; i < texts.length; i += VOYAGE_BATCH_LIMIT) {
      const batch = texts.slice(i, i + VOYAGE_BATCH_LIMIT)

      const response = await fetch(VOYAGE_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: VOYAGE_MODEL,
          input: batch,
          input_type: inputType,
        }),
      })

      if (!response.ok) {
        const errBody = await response.text()
        console.error(`Voyage API batch error ${response.status}: ${errBody}`)
        return null
      }

      const data: VoyageEmbeddingResponse = await response.json()

      // Sort by index to ensure correct ordering
      const sorted = [...data.data].sort((a, b) => a.index - b.index)
      for (const item of sorted) {
        allEmbeddings.push(item.embedding)
      }
    }

    return allEmbeddings
  } catch (error) {
    console.error('Voyage batch embedding generation failed:', error)
    return null
  }
}

/**
 * Compute cosine similarity between two embedding vectors.
 * Returns a value between -1 and 1, where 1 means identical.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(
      `Vector dimension mismatch: ${a.length} vs ${b.length}`
    )
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB)
  if (denominator === 0) return 0

  return dotProduct / denominator
}

export { VOYAGE_DIMENSIONS, VOYAGE_BATCH_LIMIT, VOYAGE_MODEL }
