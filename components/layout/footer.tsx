'use client'

import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import { Separator } from '@/components/ui/separator'

export function Footer() {
  const { t } = useI18n()

  return (
    <footer className="border-t border-border/40 px-5 py-12">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
          {/* Left: Logo + tagline */}
          <div>
            <span className="text-sm tracking-[0.15em] uppercase font-medium block mb-2">beyondr</span>
            <span className="text-xs text-muted-foreground">{t.footer.tagline}</span>
          </div>

          {/* Center: Service links */}
          <div>
            <h4 className="text-xs font-semibold tracking-wide uppercase text-muted-foreground mb-3">{t.footer.service}</h4>
            <div className="flex flex-col gap-2">
              <Link href="/scriptures" className="text-sm text-muted-foreground hover:text-foreground transition-colors text-left">{t.nav.scriptures}</Link>
              <Link href="/chat" className="text-sm text-muted-foreground hover:text-foreground transition-colors text-left">{t.nav.chat}</Link>
              <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors text-left">{t.nav.pricing}</Link>
            </div>
          </div>

          {/* Right: Support links */}
          <div>
            <h4 className="text-xs font-semibold tracking-wide uppercase text-muted-foreground mb-3">{t.footer.support}</h4>
            <div className="flex flex-col gap-2">
              <Link href="/help" className="text-sm text-muted-foreground hover:text-foreground transition-colors text-left">{t.nav.help}</Link>
              <Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors text-left">{t.contact.title}</Link>
              <span className="text-sm text-muted-foreground/60">{t.footer.terms}</span>
              <span className="text-sm text-muted-foreground/60">{t.footer.privacy}</span>
            </div>
          </div>
        </div>

        <Separator className="mb-6" />
        <p className="text-xs text-muted-foreground text-center">{t.footer.copy}</p>
      </div>
    </footer>
  )
}
