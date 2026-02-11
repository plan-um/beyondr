'use client'

import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

export default function ContactPage() {
  const { t: s } = useI18n()
  const [selectedType, setSelectedType] = useState(0)
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <main className="pt-14 min-h-screen flex items-center justify-center px-5">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-6">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gold">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">{s.contact.success}</h2>
          <p className="text-sm text-muted-foreground">{s.contact.successSub}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="pt-14 min-h-screen">
      <div className="max-w-xl mx-auto px-5 py-16">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-3">{s.contact.title}</h1>
        <p className="text-base text-muted-foreground mb-10">{s.contact.sub}</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Type selection - radio cards */}
          <div className="grid grid-cols-2 gap-3">
            {s.contact.types.map((type, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedType(i)}
                className={`text-left p-4 rounded-xl border transition-all duration-200 ${
                  selectedType === i
                    ? 'border-gold/50 bg-gold/5 text-foreground'
                    : 'border-border/40 text-muted-foreground hover:border-border hover:text-foreground'
                }`}
              >
                <span className="text-sm font-medium">{type}</span>
              </button>
            ))}
          </div>

          {/* Email */}
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={s.contact.email}
            className="w-full bg-secondary/50 border border-border/40 rounded-xl px-4 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-gold/40 transition-colors"
          />

          {/* Subject */}
          <input
            type="text"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={s.contact.subject}
            className="w-full bg-secondary/50 border border-border/40 rounded-xl px-4 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-gold/40 transition-colors"
          />

          {/* Message */}
          <textarea
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={s.contact.message}
            rows={6}
            className="w-full bg-secondary/50 border border-border/40 rounded-xl px-4 py-3 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-gold/40 transition-colors resize-none"
          />

          {/* Submit */}
          <Button type="submit" className="w-full h-11 text-sm tracking-wide">
            {s.contact.submit}
          </Button>
        </form>
      </div>
    </main>
  )
}
