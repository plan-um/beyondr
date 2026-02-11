'use client'

import type { Lang } from '@/lib/i18n'

export function LangToggle({ lang, toggle }: { lang: Lang; toggle: () => void }) {
  return (
    <button
      onClick={toggle}
      className="text-sm tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
    >
      {lang === 'en' ? '\uD55C\uAD6D\uC5B4' : 'EN'}
    </button>
  )
}
