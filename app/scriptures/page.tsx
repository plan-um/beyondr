'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useI18n } from '@/lib/i18n'
import { scriptureVerses } from '@/lib/scripture-verses'
import { useScriptureSettings } from '@/lib/use-scripture-settings'
import { FontSizeControl } from '@/components/scripture/font-size-control'

const THEME_KEYS = ['all', 'awakening', 'suffering', 'love', 'life_death', 'practice']

const CHAPTER_META: Record<string, { title_ko: string; title_en: string; intro_ko: string; intro_en: string; order: number }> = {
  awakening: { title_ko: '깨어남의 길', title_en: 'The Path of Awakening', intro_ko: '지금 이 순간, 당신은 이미 깨어 있어요. 다만 그 사실을 잊고 있을 뿐.', intro_en: 'Right now, you are already awake. You have simply forgotten.', order: 1 },
  suffering: { title_ko: '고통과 치유', title_en: 'Suffering and Healing', intro_ko: '상처가 없는 삶은 없어요. 하지만 상처를 통과한 빛은, 다른 어떤 빛보다 따뜻해요.', intro_en: 'No life is without wounds. But light that passes through a wound is warmer than any other.', order: 2 },
  love: { title_ko: '사랑과 연결', title_en: 'Love and Connection', intro_ko: '사랑은 감정이 아니에요. 사랑은 존재 방식이에요.', intro_en: 'Love is not a feeling. Love is a way of being.', order: 3 },
  life_death: { title_ko: '삶과 죽음', title_en: 'Life and Death', intro_ko: '삶과 죽음은 반대가 아니에요. 삶과 죽음은 하나의 호흡이에요.', intro_en: 'Life and death are not opposites. They are one breath.', order: 4 },
  practice: { title_ko: '고요와 수행', title_en: 'Stillness and Practice', intro_ko: '수행은 특별한 게 아니에요. 매일 조금씩, 자기 자신에게 돌아오는 거예요.', intro_en: 'Practice is nothing extraordinary. It is returning to yourself, a little, every day.', order: 5 },
}

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

function convertStaticFallback(): { chapters: ChapterData[]; total: number } {
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

    chapters.push({ theme, canonical, extended: [], totalCount: canonical.length })
  }

  return { chapters, total: chapters.reduce((s, c) => s + c.totalCount, 0) }
}

export default function ScripturesPage() {
  const { t, lang } = useI18n()
  const { fontSizeClass } = useScriptureSettings()

  const [data, setData] = useState<{ chapters: ChapterData[]; total: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [activeTheme, setActiveTheme] = useState(0)
  const [activeTradition, setActiveTradition] = useState('')
  const [expandedReflections, setExpandedReflections] = useState<Set<string>>(new Set())
  const [expandedExtended, setExpandedExtended] = useState<Set<string>>(new Set())
  const [extendedVisible, setExtendedVisible] = useState<Record<string, number>>({})

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  const labels = useMemo(() => ({
    coreScripture: lang === 'ko' ? '핵심 경전' : 'Core Scripture',
    extendedWisdom: lang === 'ko' ? '관련 지혜' : 'Extended Wisdom',
    showMore: lang === 'ko' ? '더 보기' : 'Show more',
    showAll: lang === 'ko' ? '모두 보기' : 'Show all',
    loading: lang === 'ko' ? '경전을 불러오는 중...' : 'Loading scriptures...',
    totalVerses: (n: number) => lang === 'ko' ? `총 ${n}절` : `${n} total verses`,
  }), [lang])

  // Debounce search input
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(value), 300)
  }, [])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  // Fetch data from API
  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (debouncedSearch) params.set('search', debouncedSearch)
    if (activeTheme > 0) params.set('theme', THEME_KEYS[activeTheme])
    if (activeTradition) params.set('tradition', activeTradition)

    fetch(`/api/scriptures?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.chapters) {
          setData(d)
        } else {
          setData(convertStaticFallback())
        }
      })
      .catch(() => {
        setData(convertStaticFallback())
      })
      .finally(() => setLoading(false))
  }, [debouncedSearch, activeTheme, activeTradition])

  // Collect all unique traditions from loaded data
  const allTraditions = useMemo(() => {
    if (!data) return []
    const set = new Set<string>()
    for (const ch of data.chapters) {
      for (const item of [...ch.canonical, ...ch.extended]) {
        const traditions = lang === 'ko' ? item.traditions : item.traditions_en
        traditions?.forEach((tr) => set.add(tr))
      }
    }
    return Array.from(set).sort()
  }, [data, lang])

  const toggleReflection = useCallback((key: string) => {
    setExpandedReflections((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const toggleExtended = useCallback((theme: string) => {
    setExpandedExtended((prev) => {
      const next = new Set(prev)
      if (next.has(theme)) next.delete(theme)
      else next.add(theme)
      return next
    })
  }, [])

  const getVisibleCount = useCallback((theme: string) => extendedVisible[theme] || 10, [extendedVisible])

  const showMore = useCallback((theme: string) => {
    setExtendedVisible((prev) => ({
      ...prev,
      [theme]: (prev[theme] || 10) + 10,
    }))
  }, [])

  // Sort chapters by order
  const sortedChapters = useMemo(() => {
    if (!data) return []
    return [...data.chapters]
      .filter((ch) => ch.totalCount > 0)
      .sort((a, b) => (CHAPTER_META[a.theme]?.order || 99) - (CHAPTER_META[b.theme]?.order || 99))
  }, [data])

  // Extended font size: one step down from canonical
  const extendedFontClass = useMemo(() => {
    if (fontSizeClass === 'text-2xl') return 'text-xl'
    if (fontSizeClass === 'text-xl') return 'text-lg'
    return fontSizeClass
  }, [fontSizeClass])

  const fontClass = lang === 'en' ? 'font-serif' : ''

  return (
    <main className="pt-14 min-h-screen">
      <div className="max-w-4xl mx-auto px-5 py-16">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-3">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              {t.scriptures.title}
            </h1>
            {data && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gold/10 text-gold border border-gold/20">
                {labels.totalVerses(data.total)}
              </span>
            )}
          </div>
          <p className="text-base text-muted-foreground">{t.scriptures.sub}</p>
        </div>

        {/* Sticky Toolbar */}
        <div className="sticky top-14 z-20 bg-background/95 backdrop-blur-sm pb-4 -mx-5 px-5 pt-4 border-b border-border/20 mb-8">
          {/* Search */}
          <div className="relative mb-4">
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={t.scriptures.browse.searchPlaceholder}
              className="w-full bg-secondary/50 border border-border/40 rounded-xl pl-10 pr-4 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-gold/40 transition-colors"
            />
          </div>

          {/* Theme filter chips */}
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
            {t.scriptures.traditions.map((label, i) => (
              <button
                key={i}
                onClick={() => setActiveTheme(i)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all shrink-0 ${
                  activeTheme === i
                    ? 'border-gold/40 text-gold bg-gold/5'
                    : 'border-border/40 text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Tradition dropdown + font size control */}
          <div className="flex items-center justify-between gap-3">
            <select
              value={activeTradition}
              onChange={(e) => setActiveTradition(e.target.value)}
              className="bg-secondary/50 border border-border/40 rounded-lg px-3 py-1.5 text-xs text-muted-foreground focus:outline-none focus:border-gold/40 transition-colors max-w-[200px]"
            >
              <option value="">{t.scriptures.browse.allTraditions}</option>
              {allTraditions.map((tr) => (
                <option key={tr} value={tr}>{tr}</option>
              ))}
            </select>
            <FontSizeControl />
          </div>
        </div>

        {/* Result count when filtering */}
        {(debouncedSearch || activeTradition || activeTheme !== 0) && data && (
          <p className="text-xs text-muted-foreground mb-6">
            {data.total} {t.scriptures.browse.resultCount}
          </p>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="space-y-16">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border-l-2 border-border/20 pl-6 animate-pulse">
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-secondary/60" />
                    <div className="h-6 w-48 bg-secondary/60 rounded" />
                  </div>
                  <div className="h-4 w-80 bg-secondary/40 rounded" />
                </div>
                <div className="h-px bg-border/20 mb-8" />
                <div className="space-y-8">
                  {[1, 2, 3].map((j) => (
                    <div key={j}>
                      <div className="h-3 w-10 bg-gold/10 rounded mb-2" />
                      <div className="h-5 w-full bg-secondary/50 rounded mb-2" />
                      <div className="h-5 w-3/4 bg-secondary/40 rounded mb-3" />
                      <div className="flex gap-1.5">
                        <div className="h-5 w-16 bg-secondary/30 rounded-full" />
                        <div className="h-5 w-20 bg-secondary/30 rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : sortedChapters.length > 0 ? (
          <div className="space-y-16">
            {sortedChapters.map((chapter) => {
              const meta = CHAPTER_META[chapter.theme]
              if (!meta) return null

              const chTitle = lang === 'ko' ? meta.title_ko : meta.title_en
              const chIntro = lang === 'ko' ? meta.intro_ko : meta.intro_en
              const isExtendedOpen = expandedExtended.has(chapter.theme)
              const visibleCount = getVisibleCount(chapter.theme)
              const visibleExtended = chapter.extended.slice(0, visibleCount)
              const hasMoreExtended = chapter.extended.length > visibleCount

              return (
                <section
                  key={chapter.theme}
                  className="border-l-2 border-gold/20 pl-6 animate-in fade-in duration-500"
                >
                  {/* Chapter header */}
                  <div className="mb-8">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gold/10 text-gold text-sm font-semibold">
                        {meta.order}
                      </span>
                      <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">
                        {chTitle}
                      </h2>
                      <span className="text-xs text-muted-foreground/60 ml-auto">
                        {chapter.totalCount}{lang === 'ko' ? '절' : ' verses'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {chIntro}
                    </p>
                  </div>

                  <div className="h-px bg-border/30 mb-8" />

                  {/* Core Scripture section */}
                  {chapter.canonical.length > 0 && (
                    <div className="mb-10">
                      <h3 className="text-xs font-medium tracking-wider uppercase text-gold/60 mb-6">
                        {labels.coreScripture} ({chapter.canonical.length})
                      </h3>

                      <div className="space-y-10">
                        {chapter.canonical.map((item) => {
                          const verseText = lang === 'ko' ? item.text_ko : (item.text_en || item.text_ko)
                          const traditions = lang === 'ko' ? item.traditions : item.traditions_en
                          const reflection = lang === 'ko' ? item.reflection_ko : item.reflection_en
                          const verseLabel = item.chapter && item.verse ? `${item.chapter}:${item.verse}` : item.id
                          const reflectionKey = `${chapter.theme}-${item.id}`
                          const isReflectionExpanded = expandedReflections.has(reflectionKey)

                          return (
                            <div key={item.id} className="animate-in fade-in duration-300">
                              {/* Verse number */}
                              <span className="text-xs font-medium text-gold/70 tracking-wider mb-2 block">
                                {verseLabel}
                              </span>

                              {/* Verse text */}
                              <p className={`leading-relaxed mb-3 ${fontClass} ${fontSizeClass}`}>
                                {verseText}
                              </p>

                              {/* Tradition badges */}
                              {traditions && traditions.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-3">
                                  {traditions.map((tr) => (
                                    <span
                                      key={tr}
                                      className="bg-secondary text-muted-foreground rounded-full text-xs px-2.5 py-0.5"
                                    >
                                      {tr}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Collapsible reflection */}
                              {reflection && (
                                <>
                                  <button
                                    onClick={() => toggleReflection(reflectionKey)}
                                    className="text-xs text-muted-foreground/70 hover:text-gold transition-colors flex items-center gap-1.5"
                                  >
                                    <svg
                                      width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                      className={`transition-transform duration-200 ${isReflectionExpanded ? 'rotate-90' : ''}`}
                                    >
                                      <path d="M9 18l6-6-6-6" />
                                    </svg>
                                    {t.scriptureDetail.reflection}
                                  </button>

                                  {isReflectionExpanded && (
                                    <div className="mt-2 pl-4 border-l border-gold/10 animate-in fade-in slide-in-from-top-1 duration-200">
                                      <p className="text-sm text-muted-foreground italic leading-relaxed">
                                        {reflection}
                                      </p>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Extended Wisdom section */}
                  {chapter.extended.length > 0 && (
                    <div className="mt-8">
                      <button
                        onClick={() => toggleExtended(chapter.theme)}
                        className="flex items-center gap-2 text-xs font-medium tracking-wider uppercase text-muted-foreground/60 hover:text-muted-foreground transition-colors mb-4"
                      >
                        <svg
                          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                          className={`transition-transform duration-200 ${isExtendedOpen ? 'rotate-90' : ''}`}
                        >
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                        {labels.extendedWisdom} ({chapter.extended.length})
                      </button>

                      {isExtendedOpen && (
                        <div className="pl-4 border-l border-border/20 animate-in fade-in slide-in-from-top-2 duration-300">
                          {visibleExtended.map((item) => {
                            const verseText = lang === 'ko' ? item.text_ko : (item.text_en || item.text_ko)
                            const traditions = lang === 'ko' ? item.traditions : item.traditions_en

                            return (
                              <div key={item.id} className="py-3 border-b border-border/10 last:border-0">
                                <p className={`leading-relaxed ${fontClass} ${extendedFontClass}`}>
                                  {verseText}
                                </p>
                                {traditions && traditions.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {traditions.map((tr) => (
                                      <span
                                        key={tr}
                                        className="text-xs px-2 py-0.5 rounded-full bg-secondary/50 text-muted-foreground/70"
                                      >
                                        {tr}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          })}

                          {hasMoreExtended && (
                            <button
                              onClick={() => showMore(chapter.theme)}
                              className="mt-3 text-xs text-gold/70 hover:text-gold transition-colors flex items-center gap-1.5"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 5v14M5 12h14" />
                              </svg>
                              {labels.showMore} ({chapter.extended.length - visibleCount} {lang === 'ko' ? '개 남음' : 'remaining'})
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </section>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <svg
              width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"
              className="mx-auto mb-4 text-muted-foreground/30"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <p className="text-sm text-muted-foreground">{t.scriptures.noResults}</p>
          </div>
        )}
      </div>
    </main>
  )
}
