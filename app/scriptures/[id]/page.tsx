'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import { scriptureVerses } from '@/lib/scripture-verses'
import { Separator } from '@/components/ui/separator'
import { useScriptureSettings } from '@/lib/use-scripture-settings'
import { FontSizeControl } from '@/components/scripture/font-size-control'

export default function ScriptureDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { t: s, lang } = useI18n()
  const chapterIndex = Number(params.id)
  const chapter = scriptureVerses.chapters[chapterIndex]
  const [expandedVerse, setExpandedVerse] = useState<string | null>(null)
  const { fontSizeClass } = useScriptureSettings()

  return (
    <main className="pt-14 min-h-screen">
      <div className="max-w-3xl mx-auto px-5 py-16">
        {/* Top navigation */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <Link
            href="/scriptures"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            {s.scriptureDetail.back}
          </Link>
          <FontSizeControl />
          <div className="flex gap-2 overflow-x-auto">
            {scriptureVerses.chapters.map((ch, i) => (
              <Link
                key={ch.id}
                href={`/scriptures/${i}`}
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all shrink-0 ${
                  i === chapterIndex
                    ? 'border-gold/50 text-gold bg-gold/5'
                    : 'border-border/40 text-muted-foreground hover:text-foreground'
                }`}
              >
                {s.scriptureDetail.chapter} {ch.id}
              </Link>
            ))}
          </div>
        </div>

        {/* Chapter header */}
        <div className="mb-12">
          <span className="text-xs tracking-[0.2em] uppercase text-gold/70 font-medium mb-3 block">
            {s.scriptureDetail.chapter} {chapter.id}
          </span>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-4">
            {lang === 'ko' ? chapter.title_ko : chapter.title_en}
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed">
            {lang === 'ko' ? chapter.intro_ko : chapter.intro_en}
          </p>
        </div>

        <Separator className="mb-10" />

        {/* Verses */}
        <div className="space-y-10">
          {chapter.verses.map((verse) => (
            <div key={verse.num} className="group">
              {/* Verse number */}
              <span className="text-xs tracking-[0.15em] text-gold/60 font-medium mb-3 block">{verse.num}</span>

              {/* Verse text */}
              <p className={`leading-relaxed mb-3 ${lang === 'en' ? 'font-serif' : ''} ${fontSizeClass}`}>
                {lang === 'ko' ? verse.ko : verse.en}
              </p>

              {/* Traditions */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {(lang === 'ko' ? verse.traditions : verse.traditions_en).map((tr, j) => (
                  <span key={j} className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                    {tr}
                  </span>
                ))}
              </div>

              {/* Related wisdom toggle */}
              <button
                onClick={() => setExpandedVerse(expandedVerse === verse.num ? null : verse.num)}
                className="text-xs text-gold/70 hover:text-gold transition-colors mb-3 flex items-center gap-1"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  className={`transition-transform duration-200 ${expandedVerse === verse.num ? 'rotate-90' : ''}`}>
                  <path d="M9 18l6-6-6-6" />
                </svg>
                {s.scriptureDetail.relatedWisdom}
              </button>

              {expandedVerse === verse.num && (
                <div className="pl-4 border-l-2 border-gold/20 mb-4 animate-fade-in">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {lang === 'ko'
                      ? `이 구절은 ${verse.traditions.join(', ')} 전통의 지혜에서 영감을 받았어요. 각 전통이 같은 진리를 다른 언어로 표현하고 있어요.`
                      : `This verse draws from the wisdom of ${verse.traditions_en.join(', ')}. Each tradition expresses the same truth in different language.`
                    }
                  </p>
                </div>
              )}

              {/* Reflection */}
              <div className="bg-secondary/30 rounded-lg p-4 border border-border/30">
                <span className="text-xs text-gold/60 font-medium block mb-1.5">{s.scriptureDetail.reflection}</span>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {lang === 'ko' ? verse.reflection_ko : verse.reflection_en}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
