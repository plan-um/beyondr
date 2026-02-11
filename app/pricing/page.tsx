'use client'

import { useState, useEffect, useCallback } from 'react'
import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { initPaddle, openCheckout, isPaddleConfigured } from '@/lib/paddle'
import Link from 'next/link'

export default function PricingPage() {
  const { t: s, lang } = useI18n()
  const [yearly, setYearly] = useState(false)
  const [paddleReady, setPaddleReady] = useState(false)
  const configured = isPaddleConfigured()

  useEffect(() => {
    if (configured) {
      initPaddle().then((res) => setPaddleReady(res.configured))
    }
  }, [configured])

  const handleUpgrade = useCallback(() => {
    if (!paddleReady) return
    const priceId = yearly
      ? process.env.NEXT_PUBLIC_PADDLE_PRICE_YEARLY || ''
      : process.env.NEXT_PUBLIC_PADDLE_PRICE_MONTHLY || ''
    if (priceId) openCheckout(priceId)
  }, [paddleReady, yearly])

  const toggleLabel = lang === 'ko'
    ? { monthly: '월간', yearly: '연간', save: '42% 절약' }
    : { monthly: 'Monthly', yearly: 'Yearly', save: 'Save 42%' }

  const comingSoon = lang === 'ko' ? '준비 중' : 'Coming Soon'

  return (
    <main className="pt-14 min-h-screen">
      <div className="max-w-3xl mx-auto px-5 py-16">
        <div className="text-center mb-14">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-3">{s.pricing.title}</h1>
          <p className="text-sm text-muted-foreground">{s.pricing.sub}</p>
        </div>

        {/* Monthly / Yearly toggle */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <span className={`text-sm ${!yearly ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
            {toggleLabel.monthly}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={yearly}
            onClick={() => setYearly(!yearly)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${yearly ? 'bg-gold' : 'bg-muted'}`}
          >
            <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${yearly ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
          <span className={`text-sm ${yearly ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
            {toggleLabel.yearly}
          </span>
          {yearly && (
            <span className="text-xs text-gold font-medium ml-1">{toggleLabel.save}</span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Free */}
          <div className="p-6 rounded-xl border border-border/40 bg-card/30">
            <h3 className="text-sm font-medium mb-1">{s.pricing.free.name}</h3>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-3xl font-normal">{s.pricing.free.price}</span>
            </div>
            <p className="text-xs text-muted-foreground mb-6">{s.pricing.free.period}</p>
            <ul className="space-y-3 mb-8">
              {s.pricing.free.features.map((f, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="text-muted-foreground/40 mt-0.5">&mdash;</span>{f}
                </li>
              ))}
            </ul>
            <Button variant="outline" className="w-full h-10 text-xs tracking-wide" asChild>
              <Link href="/auth/signup">{s.pricing.free.cta}</Link>
            </Button>
          </div>

          {/* Premium */}
          <div className="p-6 rounded-xl border border-gold/30 bg-card/30 relative">
            <div className="absolute -top-2.5 right-5 text-[10px] tracking-wider uppercase bg-gold text-primary-foreground px-2.5 py-0.5 rounded-full font-medium">
              {s.pricing.premium.badge}
            </div>
            <h3 className="text-sm font-medium mb-1">{s.pricing.premium.name}</h3>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-3xl font-normal">
                {yearly
                  ? (lang === 'ko' ? '₩99,000' : '$69.99')
                  : s.pricing.premium.price}
              </span>
              <span className="text-sm text-muted-foreground">
                {yearly
                  ? (lang === 'ko' ? '/ 년' : '/ year')
                  : s.pricing.premium.period}
              </span>
            </div>
            <p className="text-xs text-gold/70 mb-6">
              {yearly ? s.pricing.launch : s.pricing.premium.annual}
            </p>
            <ul className="space-y-3 mb-8">
              {s.pricing.premium.features.map((f, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  <span className="text-gold mt-0.5">&#10022;</span>{f}
                </li>
              ))}
            </ul>
            {configured ? (
              <Button
                className="w-full h-10 text-xs tracking-wide"
                disabled={!paddleReady}
                onClick={handleUpgrade}
              >
                {s.pricing.premium.cta}
              </Button>
            ) : (
              <Button className="w-full h-10 text-xs tracking-wide" disabled>
                {comingSoon}
              </Button>
            )}
          </div>
        </div>

        {/* Launch offer */}
        <p className="text-center text-xs text-gold/70 mt-8 tracking-wide">{s.pricing.launch}</p>
      </div>
    </main>
  )
}
