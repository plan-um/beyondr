import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'
import { NextRequest, NextResponse } from 'next/server'
import { generateEmbeddings } from '@/lib/voyage'
import { chapters } from '@/lib/scripture-data'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const THEME_TO_TRADITIONS: Record<string, string[]> = {
  awakening: ['Buddhism', 'Vedanta'],
  suffering: ['Buddhism', 'Stoicism'],
  love: ['Sufism', 'Christianity'],
  life_death: ['Hinduism', 'Stoicism'],
  practice: ['Zen', 'Taoism']
}

function isEnglish(text: string): boolean {
  const koreanRegex = /[\u3131-\u314e\u314f-\u3163\uac00-\ud7a3]/
  return !koreanRegex.test(text)
}

async function importLibraryQuotes(batchSize = 50) {
  const quotesPath = join(process.cwd(), 'beyondr-mockup/src/data/library-quotes.json')
  const quotesData = JSON.parse(readFileSync(quotesPath, 'utf-8'))

  let total = 0
  let imported = 0
  let skipped = 0
  let errors = 0
  let embeddingsGenerated = 0
  let embeddingsFailed = 0

  const chunks = []
  let verseNumber = 1

  for (const book of quotesData.books) {
    for (const quote of book.quotes) {
      const id = `lib:${String(verseNumber).padStart(4, '0')}`
      const text = quote.text
      const traditions = THEME_TO_TRADITIONS[quote.theme] || []

      chunks.push({
        id,
        scripture_id: null,
        chapter: 100,
        verse: verseNumber,
        text_ko: text,
        text_en: isEnglish(text) ? text : text,
        traditions,
        traditions_en: traditions,
        theme: quote.theme,
        origin_type: 'crawled',
        version: 1,
        is_archived: false
      })

      verseNumber++
      total++
    }
  }

  // Check existing IDs
  const { data: existing } = await supabase
    .from('scripture_chunks')
    .select('id')
    .in('id', chunks.map(c => c.id))

  const existingIds = new Set(existing?.map(e => e.id) || [])
  const newChunks = chunks.filter(c => !existingIds.has(c.id))
  skipped = chunks.length - newChunks.length

  // Process in batches with embeddings
  for (let i = 0; i < newChunks.length; i += batchSize) {
    const batch = newChunks.slice(i, i + batchSize)
    const texts = batch.map(c => c.text_ko)

    try {
      const embeddings = await generateEmbeddings(texts, 'document')

      if (embeddings) {
        const chunksWithEmbeddings = batch.map((chunk, idx) => ({
          ...chunk,
          embedding: JSON.stringify(embeddings[idx])
        }))

        const { error } = await supabase
          .from('scripture_chunks')
          .insert(chunksWithEmbeddings)

        if (error) {
          console.error('Batch insert error:', error)
          errors += batch.length
        } else {
          imported += batch.length
          embeddingsGenerated += batch.length
        }
      } else {
        // Insert without embeddings
        const { error } = await supabase
          .from('scripture_chunks')
          .insert(batch)

        if (error) {
          console.error('Batch insert error:', error)
          errors += batch.length
        } else {
          imported += batch.length
          embeddingsFailed += batch.length
        }
      }
    } catch (err) {
      console.error('Batch processing error:', err)
      errors += batch.length
      embeddingsFailed += batch.length
    }
  }

  return {
    total,
    imported,
    skipped,
    errors,
    embeddings: {
      generated: embeddingsGenerated,
      failed: embeddingsFailed
    }
  }
}

async function importRelatedQuotes(batchSize = 50) {
  let total = 0
  let imported = 0
  let skipped = 0
  let errors = 0
  let embeddingsGenerated = 0
  let embeddingsFailed = 0

  const chunks = []
  let verseNumber = 1

  for (const chapter of chapters) {
    for (const verse of chapter.verses) {
      if (verse.relatedQuotes && verse.relatedQuotes.length > 0) {
        for (let i = 0; i < verse.relatedQuotes.length; i++) {
          const quote = verse.relatedQuotes[i]
          const id = `rel:${verse.id}:${i}`

          chunks.push({
            id,
            scripture_id: null,
            chapter: 200,
            verse: verseNumber,
            text_ko: quote.text,
            text_en: quote.text,
            traditions: quote.tradition ? [quote.tradition] : [],
            traditions_en: quote.tradition ? [quote.tradition] : [],
            theme: verse.theme,
            origin_type: 'crawled',
            version: 1,
            is_archived: false
          })

          verseNumber++
          total++
        }
      }
    }
  }

  // Check existing IDs
  const { data: existing } = await supabase
    .from('scripture_chunks')
    .select('id')
    .in('id', chunks.map(c => c.id))

  const existingIds = new Set(existing?.map(e => e.id) || [])
  const newChunks = chunks.filter(c => !existingIds.has(c.id))
  skipped = chunks.length - newChunks.length

  // Process in batches with embeddings
  for (let i = 0; i < newChunks.length; i += batchSize) {
    const batch = newChunks.slice(i, i + batchSize)
    const texts = batch.map(c => c.text_ko)

    try {
      const embeddings = await generateEmbeddings(texts, 'document')

      if (embeddings) {
        const chunksWithEmbeddings = batch.map((chunk, idx) => ({
          ...chunk,
          embedding: JSON.stringify(embeddings[idx])
        }))

        const { error } = await supabase
          .from('scripture_chunks')
          .insert(chunksWithEmbeddings)

        if (error) {
          console.error('Batch insert error:', error)
          errors += batch.length
        } else {
          imported += batch.length
          embeddingsGenerated += batch.length
        }
      } else {
        // Insert without embeddings
        const { error } = await supabase
          .from('scripture_chunks')
          .insert(batch)

        if (error) {
          console.error('Batch insert error:', error)
          errors += batch.length
        } else {
          imported += batch.length
          embeddingsFailed += batch.length
        }
      }
    } catch (err) {
      console.error('Batch processing error:', err)
      errors += batch.length
      embeddingsFailed += batch.length
    }
  }

  return {
    total,
    imported,
    skipped,
    errors,
    embeddings: {
      generated: embeddingsGenerated,
      failed: embeddingsFailed
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { action = 'all', batch_size = 50 } = body

    let libraryResult = null
    let relatedResult = null

    if (action === 'library_quotes' || action === 'all') {
      libraryResult = await importLibraryQuotes(batch_size)
    }

    if (action === 'related_quotes' || action === 'all') {
      relatedResult = await importRelatedQuotes(batch_size)
    }

    const totalEmbeddings = {
      generated: (libraryResult?.embeddings.generated || 0) + (relatedResult?.embeddings.generated || 0),
      failed: (libraryResult?.embeddings.failed || 0) + (relatedResult?.embeddings.failed || 0)
    }

    return NextResponse.json({
      status: 'completed',
      library_quotes: libraryResult,
      related_quotes: relatedResult,
      embeddings: totalEmbeddings
    })
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: 'Import failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
