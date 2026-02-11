'use client'

import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function LandingPage() {
  const { t: s } = useI18n()
  const router = useRouter()

  return (
    <main className="pt-14">
      {/* Hero */}
      <section className="min-h-[90vh] flex items-center justify-center px-5 relative overflow-hidden">
        {/* Subtle ambient glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-violet/5 blur-[120px] pointer-events-none" />

        <div className="max-w-2xl text-center relative z-10">
          <p className="text-xs tracking-[0.3em] uppercase text-muted-foreground mb-8 animate-fade-in">
            {s.hero.pre}
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold leading-[1.15] tracking-tight mb-6"
              style={{ animationDelay: '0.1s' }}>
            <span className="animate-fade-in block">{s.hero.h1_1}</span>
            <span className="animate-fade-in block font-semibold text-gold" style={{ animationDelay: '0.2s' }}>
              {s.hero.h1_2}
            </span>
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-lg mx-auto mb-10 animate-fade-in"
             style={{ animationDelay: '0.3s' }}>
            {s.hero.sub}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <Button size="lg" className="h-11 px-8 text-sm tracking-wide" onClick={() => router.push('/chat')}>
              {s.hero.cta}
            </Button>
            <Button variant="outline" size="lg" className="h-11 px-8 text-sm tracking-wide" onClick={() => router.push('/scriptures')}>
              {s.hero.cta2}
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-5 py-24 max-w-5xl mx-auto">
        <h2 className="text-center text-xs tracking-[0.3em] uppercase text-muted-foreground mb-16">{s.features.title}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-14">
          {[s.features.f1, s.features.f2, s.features.f3, s.features.f4].map((f, i) => (
            <div key={i} className="group">
              <div className="w-8 h-[1px] bg-gold/50 mb-5 group-hover:w-12 transition-all duration-500" />
              <h3 className="text-base font-medium mb-2.5 tracking-wide">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Quote */}
      <section className="px-5 py-20">
        <div className="max-w-2xl mx-auto text-center border-t border-b border-border/60 py-16">
          <blockquote className="text-xl sm:text-2xl font-medium leading-relaxed text-gold/90 mb-4">
            {s.quote.text}
          </blockquote>
          <cite className="text-xs tracking-[0.2em] uppercase text-muted-foreground not-italic">
            {s.quote.attr}
          </cite>
        </div>
      </section>
    </main>
  )
}
