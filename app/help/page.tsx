'use client'

import { useState } from 'react'
import { useI18n } from '@/lib/i18n'

export default function HelpPage() {
  const { t: s } = useI18n()
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <main className="pt-14 min-h-screen">
      <div className="max-w-5xl mx-auto px-5 py-16">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-12">{s.help.title}</h1>

        <div className="flex gap-12">
          {/* Sticky side navigation (desktop) */}
          <nav className="hidden lg:block w-48 shrink-0">
            <div className="sticky top-20 space-y-2">
              {s.help.sections.map((sec) => (
                <a
                  key={sec.id}
                  href={`#help-${sec.id}`}
                  className="block text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
                >
                  {sec.title}
                </a>
              ))}
              <a href="#help-faq" className="block text-sm text-muted-foreground hover:text-foreground transition-colors py-1">
                {s.help.faqTitle}
              </a>
            </div>
          </nav>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Sections */}
            {s.help.sections.map((sec) => (
              <section key={sec.id} id={`help-${sec.id}`} className="mb-14 scroll-mt-20">
                <h2 className="text-lg font-semibold mb-4">{sec.title}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{sec.content}</p>
              </section>
            ))}

            {/* FAQ */}
            <section id="help-faq" className="scroll-mt-20">
              <h2 className="text-lg font-semibold mb-6">{s.help.faqTitle}</h2>
              <div className="space-y-2">
                {s.help.faq.map((item, i) => (
                  <div key={i} className="border border-border/40 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="w-full text-left px-5 py-4 flex items-center justify-between gap-4"
                    >
                      <span className="text-sm font-medium">{item.q}</span>
                      <svg
                        width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        className={`shrink-0 transition-transform duration-200 text-muted-foreground ${openFaq === i ? 'rotate-180' : ''}`}
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>
                    {openFaq === i && (
                      <div className="px-5 pb-4 animate-fade-in">
                        <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}
