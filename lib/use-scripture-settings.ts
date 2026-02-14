'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'

const PREFS_KEY = 'beyondr-preferences'
const LEGACY_KEY = 'beyondr-font-size'
const DEFAULT_FONT_SIZE = 2

export const FONT_SIZE_CLASSES = ['text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl'] as const
export const FONT_SIZE_LABELS = ['XS', 'S', 'M', 'L', 'XL'] as const

function getStoredFontSize(): number {
  if (typeof window === 'undefined') return DEFAULT_FONT_SIZE
  try {
    const prefs = localStorage.getItem(PREFS_KEY)
    if (prefs) {
      const parsed = JSON.parse(prefs)
      if (typeof parsed.font_size === 'number' && parsed.font_size >= 0 && parsed.font_size <= 4) {
        return parsed.font_size
      }
    }
    const legacy = localStorage.getItem(LEGACY_KEY)
    if (legacy !== null) {
      const n = parseInt(legacy, 10)
      if (n >= 0 && n <= 4) return n
    }
  } catch {
    // ignore
  }
  return DEFAULT_FONT_SIZE
}

export function useScriptureSettings() {
  const { user } = useAuth()
  const [fontSize, setFontSizeState] = useState(DEFAULT_FONT_SIZE)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setFontSizeState(getStoredFontSize())
  }, [])

  const setFontSize = useCallback((n: number) => {
    if (n < 0 || n > 4) return

    setFontSizeState(n)

    // Save to unified preferences
    try {
      const raw = localStorage.getItem(PREFS_KEY)
      const existing = raw ? JSON.parse(raw) : {}
      localStorage.setItem(PREFS_KEY, JSON.stringify({ ...existing, font_size: n }))
    } catch {
      // ignore
    }
    localStorage.setItem(LEGACY_KEY, String(n))

    // Save to server if logged in
    if (user) {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        fetch('/api/preferences', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ font_size: n }),
        }).catch(() => {})
      }, 500)
    }
  }, [user])

  return { fontSize, setFontSize, fontSizeClass: FONT_SIZE_CLASSES[fontSize] }
}
