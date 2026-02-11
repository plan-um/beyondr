'use client'

import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'

const t = {
  en: {
    title: 'Payment Successful!',
    desc: 'Your premium plan is active. Enjoy all features.',
    cta: 'Back to Home',
  },
  ko: {
    title: '결제가 완료되었어요!',
    desc: '프리미엄 플랜이 활성화되었어요. 모든 기능을 자유롭게 이용해 보세요.',
    cta: '홈으로 돌아가기',
  },
}

export default function PaymentSuccessPage() {
  const { lang } = useI18n()
  const s = t[lang]

  return (
    <main className="pt-14 min-h-screen flex items-center justify-center px-5">
      <Card className="max-w-lg w-full border-border/40 bg-card/30">
        <CardContent className="flex flex-col items-center text-center py-12 px-8">
          {/* Checkmark circle */}
          <div className="mb-6">
            <svg
              width="64"
              height="64"
              viewBox="0 0 64 64"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="32" cy="32" r="30" stroke="#22c55e" strokeWidth="2.5" fill="none" />
              <path
                d="M20 33l8 8 16-16"
                stroke="#22c55e"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold tracking-tight mb-2">{s.title}</h1>
          <p className="text-sm text-muted-foreground mb-8 leading-relaxed">{s.desc}</p>
          <Button className="h-10 px-8 text-xs tracking-wide" asChild>
            <Link href="/">{s.cta}</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
