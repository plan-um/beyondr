'use client'

import { useState, useEffect } from 'react'

const FONT_SIZE_KEY = 'beyondr-font-size'
const DEFAULT_FONT_SIZE = 2

export const FONT_SIZE_CLASSES = ['text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl'] as const
export const FONT_SIZE_LABELS = ['XS', 'S', 'M', 'L', 'XL'] as const

export function useScriptureSettings() {
  const [fontSize, setFontSizeState] = useState(DEFAULT_FONT_SIZE)

  useEffect(() => {
    const saved = localStorage.getItem(FONT_SIZE_KEY)
    if (saved !== null) {
      const parsed = parseInt(saved, 10)
      if (parsed >= 0 && parsed <= 4) setFontSizeState(parsed)
    }
  }, [])

  const setFontSize = (n: number) => {
    if (n >= 0 && n <= 4) {
      setFontSizeState(n)
      localStorage.setItem(FONT_SIZE_KEY, String(n))
    }
  }

  return { fontSize, setFontSize, fontSizeClass: FONT_SIZE_CLASSES[fontSize] }
}
