import { createClient } from '@supabase/supabase-js'
import { scriptureVerses } from '@/lib/scripture-verses'

/**
 * Public Scripture API
 *
 * GET /api/scriptures
 *   Returns all scripture_chunks from the database, organized by theme
 *
 * Optional query params:
 *   - search: keyword to filter text_ko or text_en (case insensitive)
 *   - theme: filter by specific theme
 *   - tradition: filter by tradition name in traditions or traditions_en array
 */

interface ScriptureChunk {
  id: string
  chapter: number | null
  verse: number | null
  text_ko: string
  text_en: string | null
  traditions: string[]
  traditions_en: string[]
  theme: string
  reflection_ko: string | null
  reflection_en: string | null
  metadata: any
  origin_type: string
}

interface ChapterData {
  theme: string
  canonical: ScriptureChunk[]
  extended: ScriptureChunk[]
  totalCount: number
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(url, key)
}

function convertStaticDataToResponse() {
  const themes = ['awakening', 'suffering', 'love', 'life_death', 'practice']
  const chapters: ChapterData[] = []

  for (const theme of themes) {
    const themeChapters = scriptureVerses.chapters.filter(
      (ch) => ch.theme === theme
    )

    const canonical: ScriptureChunk[] = []

    for (const chapter of themeChapters) {
      for (const verse of chapter.verses) {
        canonical.push({
          id: verse.num,
          chapter: chapter.id,
          verse: parseFloat(verse.num.split(':')[1] || '0'),
          text_ko: verse.ko,
          text_en: verse.en,
          traditions: verse.traditions,
          traditions_en: verse.traditions_en,
          theme: chapter.theme,
          reflection_ko: verse.reflection_ko,
          reflection_en: verse.reflection_en,
          metadata: {},
          origin_type: 'founding',
        })
      }
    }

    chapters.push({
      theme,
      canonical,
      extended: [],
      totalCount: canonical.length,
    })
  }

  const total = chapters.reduce((sum, ch) => sum + ch.totalCount, 0)

  return { chapters, total }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const theme = searchParams.get('theme')
    const tradition = searchParams.get('tradition')

    let supabase
    let data: ScriptureChunk[] | null = null
    let error: any = null

    try {
      supabase = getServiceClient()

      // Build query
      let query = supabase
        .from('scripture_chunks')
        .select(
          'id, chapter, verse, text_ko, text_en, traditions, traditions_en, theme, reflection_ko, reflection_en, metadata, origin_type'
        )
        .or('is_archived.eq.false,is_archived.is.null')
        .order('chapter', { ascending: true })
        .order('verse', { ascending: true })

      // Apply filters
      if (theme) {
        query = query.eq('theme', theme)
      }

      if (search) {
        query = query.or(
          `text_ko.ilike.%${search}%,text_en.ilike.%${search}%`
        )
      }

      if (tradition) {
        query = query.or(
          `traditions.cs.{${tradition}},traditions_en.cs.{${tradition}}`
        )
      }

      const response = await query

      data = response.data
      error = response.error
    } catch (err) {
      console.error('Supabase client error:', err)
      error = err
    }

    // If DB query fails, use static fallback
    if (error || !data) {
      console.warn('Falling back to static data:', error?.message)
      const fallback = convertStaticDataToResponse()

      // Apply client-side filters to fallback data if needed
      let filteredChapters = fallback.chapters

      if (theme) {
        filteredChapters = filteredChapters.filter((ch) => ch.theme === theme)
      }

      if (search) {
        const lowerSearch = search.toLowerCase()
        filteredChapters = filteredChapters
          .map((ch) => ({
            ...ch,
            canonical: ch.canonical.filter(
              (v) =>
                v.text_ko.toLowerCase().includes(lowerSearch) ||
                v.text_en?.toLowerCase().includes(lowerSearch)
            ),
            extended: ch.extended.filter(
              (v) =>
                v.text_ko.toLowerCase().includes(lowerSearch) ||
                v.text_en?.toLowerCase().includes(lowerSearch)
            ),
          }))
          .map((ch) => ({
            ...ch,
            totalCount: ch.canonical.length + ch.extended.length,
          }))
          .filter((ch) => ch.totalCount > 0)
      }

      if (tradition) {
        filteredChapters = filteredChapters
          .map((ch) => ({
            ...ch,
            canonical: ch.canonical.filter(
              (v) =>
                v.traditions.includes(tradition) ||
                v.traditions_en.includes(tradition)
            ),
            extended: ch.extended.filter(
              (v) =>
                v.traditions.includes(tradition) ||
                v.traditions_en.includes(tradition)
            ),
          }))
          .map((ch) => ({
            ...ch,
            totalCount: ch.canonical.length + ch.extended.length,
          }))
          .filter((ch) => ch.totalCount > 0)
      }

      const total = filteredChapters.reduce(
        (sum, ch) => sum + ch.totalCount,
        0
      )

      return Response.json(
        { chapters: filteredChapters, total },
        {
          headers: {
            'Cache-Control':
              'public, s-maxage=300, stale-while-revalidate=600',
          },
        }
      )
    }

    // Organize data by theme
    const themes = ['awakening', 'suffering', 'love', 'life_death', 'practice']
    const chapters: ChapterData[] = []

    for (const themeKey of themes) {
      const themeChunks = data.filter((chunk) => chunk.theme === themeKey)

      // Skip empty themes
      if (themeChunks.length === 0) {
        continue
      }

      const canonical = themeChunks
        .filter((chunk) => chunk.origin_type === 'founding')
        .sort((a, b) => {
          if (a.chapter !== b.chapter) {
            return (a.chapter || 0) - (b.chapter || 0)
          }
          return (a.verse || 0) - (b.verse || 0)
        })

      const extended = themeChunks
        .filter((chunk) => chunk.origin_type !== 'founding')
        .sort((a, b) => {
          if (a.chapter !== b.chapter) {
            return (a.chapter || 0) - (b.chapter || 0)
          }
          return (a.verse || 0) - (b.verse || 0)
        })

      chapters.push({
        theme: themeKey,
        canonical,
        extended,
        totalCount: canonical.length + extended.length,
      })
    }

    const total = data.length

    return Response.json(
      { chapters, total },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    )
  } catch (err) {
    console.error('Scriptures API error:', err)
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
