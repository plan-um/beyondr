'use client'

import { useState, useMemo } from 'react'
import { useI18n } from '@/lib/i18n'
import { scriptureVerses, type Chapter, type Verse } from '@/lib/scripture-verses'
import { useScriptureSettings } from '@/lib/use-scripture-settings'
import { FontSizeControl } from '@/components/scripture/font-size-control'

const THEME_KEYS = ['all', 'awakening', 'suffering', 'love', 'life-death', 'practice']

export default function ScripturesPage() {
  const { t, lang } = useI18n()
  const { fontSizeClass } = useScriptureSettings()

  const [search, setSearch] = useState('')
  const [activeTheme, setActiveTheme] = useState(0)
  const [activeTradition, setActiveTradition] = useState('')
  const [expandedReflections, setExpandedReflections] = useState<Set<string>>(new Set())

  const toggleReflection = (key: string) => {
    setExpandedReflections((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // Collect all unique traditions from the data for the dropdown
  const allTraditions = useMemo(() => {
    const set = new Set<string>()
    for (const ch of scriptureVerses.chapters) {
      for (const v of ch.verses) {
        const traditions = lang === 'ko' ? v.traditions : v.traditions_en
        traditions.forEach((tr) => set.add(tr))
      }
    }
    return Array.from(set).sort()
  }, [lang])

  // Filter logic
  const filtered = useMemo(() => {
    const searchLower = search.toLowerCase().trim()
    const themeKey = THEME_KEYS[activeTheme]

    // Filter chapters by theme first
    let chapters = scriptureVerses.chapters
    if (themeKey !== 'all') {
      chapters = chapters.filter((ch) => ch.theme === themeKey)
    }

    // For each chapter, filter verses
    const result: { chapter: Chapter; verses: Verse[] }[] = []

    for (const ch of chapters) {
      const chTitle = lang === 'ko' ? ch.title_ko : ch.title_en
      const chTitleMatch = searchLower && chTitle.toLowerCase().includes(searchLower)

      const matchingVerses = ch.verses.filter((v) => {
        // Tradition filter
        if (activeTradition) {
          const traditions = lang === 'ko' ? v.traditions : v.traditions_en
          if (!traditions.includes(activeTradition)) return false
        }

        // Search filter
        if (searchLower) {
          if (chTitleMatch) return true
          const text = lang === 'ko' ? v.ko : v.en
          return text.toLowerCase().includes(searchLower)
        }

        return true
      })

      if (matchingVerses.length > 0) {
        result.push({ chapter: ch, verses: matchingVerses })
      }
    }

    return result
  }, [search, activeTheme, activeTradition, lang])

  const totalVerses = filtered.reduce((sum, g) => sum + g.verses.length, 0)

  return (
    <main className="pt-14 min-h-screen">
      <div className="max-w-4xl mx-auto px-5 py-16">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-3">
            {t.scriptures.title}
          </h1>
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
              onChange={(e) => setSearch(e.target.value)}
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

        {/* Result count */}
        {(search || activeTradition || activeTheme !== 0) && (
          <p className="text-xs text-muted-foreground mb-6">
            {totalVerses} {t.scriptures.browse.resultCount}
          </p>
        )}

        {/* Content */}
        {filtered.length > 0 ? (
          <div className="space-y-16">
            {filtered.map(({ chapter, verses }) => {
              const chTitle = lang === 'ko' ? chapter.title_ko : chapter.title_en
              const chIntro = lang === 'ko' ? chapter.intro_ko : chapter.intro_en

              return (
                <section
                  key={chapter.id}
                  className="border-l-2 border-gold/20 pl-6 animate-in fade-in duration-500"
                >
                  {/* Chapter header */}
                  <div className="mb-8">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gold/10 text-gold text-sm font-semibold">
                        {chapter.id}
                      </span>
                      <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">
                        {chTitle}
                      </h2>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {chIntro}
                    </p>
                  </div>

                  <div className="h-px bg-border/30 mb-8" />

                  {/* Verses */}
                  <div className="space-y-10">
                    {verses.map((verse) => {
                      const verseText = lang === 'ko' ? verse.ko : verse.en
                      const traditions = lang === 'ko' ? verse.traditions : verse.traditions_en
                      const reflection = lang === 'ko' ? verse.reflection_ko : verse.reflection_en
                      const reflectionKey = `${chapter.id}-${verse.num}`
                      const isExpanded = expandedReflections.has(reflectionKey)

                      return (
                        <div key={verse.num} className="animate-in fade-in duration-300">
                          {/* Verse number */}
                          <span className="text-xs font-medium text-gold/70 tracking-wider mb-2 block">
                            {verse.num}
                          </span>

                          {/* Verse text */}
                          <p className={`font-serif leading-relaxed mb-3 ${fontSizeClass}`}>
                            {verseText}
                          </p>

                          {/* Tradition badges */}
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

                          {/* Collapsible reflection */}
                          <button
                            onClick={() => toggleReflection(reflectionKey)}
                            className="text-xs text-muted-foreground/70 hover:text-gold transition-colors flex items-center gap-1.5"
                          >
                            <svg
                              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                              className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                            >
                              <path d="M9 18l6-6-6-6" />
                            </svg>
                            {t.scriptureDetail.reflection}
                          </button>

                          {isExpanded && (
                            <div className="mt-2 pl-4 border-l border-gold/10 animate-in fade-in slide-in-from-top-1 duration-200">
                              <p className="text-sm text-muted-foreground italic leading-relaxed">
                                {reflection}
                              </p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
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
