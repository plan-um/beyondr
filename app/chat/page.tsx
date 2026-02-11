'use client'

import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { TypingIndicator } from '@/components/layout/typing-indicator'
import { useState, useEffect, useRef, useCallback } from 'react'

type ChatMsg = { role: 'user' | 'ai'; text: string }

export default function ChatPage() {
  const { t: s, lang } = useI18n()
  const [persona, setPersona] = useState(0)
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: 'ai', text: s.chat.greeting },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // Update greeting when language changes
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].role === 'ai') {
        return [{ role: 'ai', text: s.chat.greeting }]
      }
      return prev
    })
  }, [s.chat.greeting])

  const handleSend = useCallback(async () => {
    if (!input.trim() || isTyping) return
    const userMsg = input.trim()
    setInput('')

    const newMessages: ChatMsg[] = [...messages, { role: 'user', text: userMsg }]
    setMessages(newMessages)
    setIsTyping(true)

    // Build conversation history for API (skip the initial greeting)
    const apiMessages = newMessages
      .filter((_, i) => i > 0 || newMessages[0].role === 'user')
      .map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.text,
      }))

    // Abort any previous request
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, persona, lang }),
        signal: controller.signal,
      })

      if (!res.ok || !res.body) {
        throw new Error('Response error')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      // Add empty AI message to stream into
      setMessages((prev) => [...prev, { role: 'ai', text: '' }])
      setIsTyping(false)

      let done = false
      while (!done) {
        const { value, done: streamDone } = await reader.read()
        done = streamDone
        if (value) {
          const chunk = decoder.decode(value, { stream: true })
          setMessages((prev) => {
            const updated = [...prev]
            const last = updated[updated.length - 1]
            if (last.role === 'ai') {
              updated[updated.length - 1] = { ...last, text: last.text + chunk }
            }
            return updated
          })
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      setIsTyping(false)
      const errorMsg =
        lang === 'ko'
          ? '지금은 연결이 어려워요. 잠시 후 다시 시도해 주세요.'
          : 'Connection issue. Please try again.'
      setMessages((prev) => {
        // Remove empty streaming message if it was added
        const cleaned = prev.filter((m, i) => !(i === prev.length - 1 && m.role === 'ai' && m.text === ''))
        return [...cleaned, { role: 'ai', text: errorMsg }]
      })
    }
  }, [input, isTyping, messages, persona, lang])

  return (
    <main className="pt-14 h-screen flex flex-col">
      {/* Persona selector */}
      <div className="border-b border-border/40 px-5 py-3 flex items-center gap-2 overflow-x-auto">
        <span className="text-xs text-muted-foreground mr-2 shrink-0 hidden sm:inline">Persona:</span>
        {s.chat.personas.map((p, i) => (
          <button
            key={i}
            onClick={() => setPersona(i)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all duration-200 shrink-0 ${
              persona === i
                ? 'border-gold/50 text-gold bg-gold/5'
                : 'border-border/40 text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
              <div
                className={`max-w-[85%] sm:max-w-[75%] ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-3'
                    : 'text-foreground'
                }`}
              >
                {msg.role === 'ai' && (
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded-full bg-gold/20 flex items-center justify-center">
                      <span className="text-gold text-[9px]">&#8734;</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{s.chat.personas[persona]}</span>
                  </div>
                )}
                <p className={`text-sm leading-relaxed ${msg.role === 'ai' ? 'pl-7 whitespace-pre-wrap' : ''}`}>{msg.text}</p>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start animate-fade-in">
              <div className="text-foreground">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-5 h-5 rounded-full bg-gold/20 flex items-center justify-center">
                    <span className="text-gold text-[9px]">&#8734;</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{s.chat.personas[persona]}</span>
                </div>
                <TypingIndicator />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      {/* Sample questions */}
      {messages.length <= 1 && (
        <div className="px-5 pb-3">
          <div className="max-w-2xl mx-auto flex flex-wrap gap-2">
            {s.chat.sample.map((q, i) => (
              <button
                key={i}
                onClick={() => { setInput(q); }}
                className="text-xs px-3 py-2 rounded-lg border border-border/40 text-muted-foreground hover:text-foreground hover:border-border transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border/40 px-5 py-4">
        <div className="max-w-2xl mx-auto flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={s.chat.placeholder}
            className="flex-1 bg-secondary/50 border border-border/40 rounded-xl px-4 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:border-gold/40 transition-colors"
          />
          <Button size="sm" className="h-10 px-5 rounded-xl" onClick={handleSend} disabled={!input.trim() || isTyping}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mr-1.5">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
            <span className="hidden sm:inline text-xs">{s.chat.send}</span>
          </Button>
        </div>
      </div>
    </main>
  )
}
