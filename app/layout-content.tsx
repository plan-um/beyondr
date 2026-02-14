'use client'

import { usePathname } from 'next/navigation'
import { useI18n } from '@/lib/i18n'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { BackToTop } from '@/components/layout/back-to-top'
import { PreferencesSync } from '@/components/preferences-sync'

export function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { t } = useI18n()
  const isChatPage = pathname === '/chat'

  return (
    <>
      <PreferencesSync />
      <Header />
      {children}
      {!isChatPage && <Footer />}
      {!isChatPage && <BackToTop label={t.backToTop} />}
    </>
  )
}
