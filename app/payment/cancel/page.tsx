'use client'

import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'

const t = {
  en: {
    title: 'Payment Cancelled',
    desc: 'You can try again anytime.',
    pricing: 'View Pricing',
    home: 'Home',
  },
  ko: {
    title: '결제가 취소되었어요',
    desc: '언제든 다시 시도할 수 있어요.',
    pricing: '가격 보기',
    home: '홈으로',
  },
}

export default function PaymentCancelPage() {
  const { lang } = useI18n()
  const s = t[lang]

  return (
    <main className="pt-14 min-h-screen flex items-center justify-center px-5">
      <Card className="max-w-lg w-full border-border/40 bg-card/30">
        <CardContent className="flex flex-col items-center text-center py-12 px-8">
          {/* X circle */}
          <div className="mb-6">
            <svg
              width="64"
              height="64"
              viewBox="0 0 64 64"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="2.5" fill="none" className="text-muted-foreground/40" />
              <path
                d="M24 24l16 16M40 24L24 40"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
                className="text-muted-foreground/60"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold tracking-tight mb-2">{s.title}</h1>
          <p className="text-sm text-muted-foreground mb-8 leading-relaxed">{s.desc}</p>
          <div className="flex gap-3">
            <Button className="h-10 px-6 text-xs tracking-wide" asChild>
              <Link href="/pricing">{s.pricing}</Link>
            </Button>
            <Button variant="outline" className="h-10 px-6 text-xs tracking-wide" asChild>
              <Link href="/">{s.home}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
