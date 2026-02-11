'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/lib/i18n'

export default function ScripturesPage() {
  const { t: s } = useI18n()
  const router = useRouter()
  const [active, setActive] = useState(0)
  const [search, setSearch] = useState('')

  const filtered = s.scriptures.items.filter((item) => {
    const matchesTradition = active === 0 || item.tradition === s.scriptures.traditions[active]
    const matchesSearch = !search || item.title.toLowerCase().includes(search.toLowerCase()) || item.desc.toLowerCase().includes(search.toLowerCase())
    return matchesTradition && matchesSearch
  })

  return (
    <main className="pt-14 min-h-screen">
      <div className="max-w-4xl mx-auto px-5 py-16">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-3">{s.scriptures.title}</h1>
          <p className="text-base text-muted-foreground">{s.scriptures.sub}</p>
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={s.scriptures.search}
            className="w-full bg-secondary/50 border border-border/40 rounded-xl pl-10 pr-4 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-gold/40 transition-colors"
          />
        </div>

        {/* Tradition filter */}
        <div className="flex gap-2 mb-10 overflow-x-auto pb-2">
          {s.scriptures.traditions.map((tr, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all shrink-0 ${
                active === i
                  ? 'border-foreground/20 text-foreground bg-secondary'
                  : 'border-border/40 text-muted-foreground hover:text-foreground'
              }`}
            >
              {tr}
            </button>
          ))}
        </div>

        {/* Scripture cards */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map((item, i) => {
              const originalIndex = s.scriptures.items.indexOf(item)
              return (
                <button
                  key={i}
                  onClick={() => router.push(`/scriptures/${originalIndex}`)}
                  className="text-left p-5 rounded-xl border border-border/40 hover:border-gold/30 bg-card/50 transition-all duration-300 group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-xs tracking-[0.2em] uppercase text-gold/70 font-medium">{item.tradition}</span>
                    <span className="text-xs text-muted-foreground">{item.verses}</span>
                  </div>
                  <h3 className="text-xl font-semibold mb-2 group-hover:text-gold transition-colors duration-300">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mx-auto mb-4 text-muted-foreground/30">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <p className="text-sm text-muted-foreground">{s.scriptures.noResults}</p>
          </div>
        )}
      </div>
    </main>
  )
}
