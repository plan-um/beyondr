'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useI18n, type Lang } from '@/lib/i18n'
import { useTheme } from 'next-themes'

const PREFS_KEY = 'beyondr-preferences'

interface ServerPreferences {
  language: Lang
  theme: string
  font_size: number
}

function debouncedSave(
  ref: React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
  update: Record<string, unknown>
) {
  if (ref.current) clearTimeout(ref.current)
  ref.current = setTimeout(() => {
    fetch('/api/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    }).catch(() => {})
  }, 500)
}

/**
 * Syncs user preferences from Supabase to local contexts on login.
 * Also saves theme/language changes back to the server.
 * Must be rendered inside AuthProvider, I18nProvider, and ThemeProvider.
 */
export function PreferencesSync() {
  const { user } = useAuth()
  const { lang, setLang } = useI18n()
  const { theme, setTheme } = useTheme()
  const loadedRef = useRef(false)
  const prevUserRef = useRef<string | null>(null)
  const themeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const langDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load preferences from server when user logs in
  useEffect(() => {
    if (!user) {
      loadedRef.current = false
      prevUserRef.current = null
      return
    }

    // Skip if already loaded for this user
    if (prevUserRef.current === user.id) return
    prevUserRef.current = user.id

    fetch('/api/preferences')
      .then((r) => {
        if (!r.ok) throw new Error('Failed')
        return r.json()
      })
      .then((data: ServerPreferences) => {
        // Apply language
        if (data.language && data.language !== lang) {
          setLang(data.language)
        }

        // Apply theme
        if (data.theme && data.theme !== theme) {
          setTheme(data.theme)
        }

        // Apply font size to localStorage (useScriptureSettings reads from here)
        try {
          const raw = localStorage.getItem(PREFS_KEY)
          const existing = raw ? JSON.parse(raw) : {}
          localStorage.setItem(PREFS_KEY, JSON.stringify({
            ...existing,
            language: data.language,
            theme: data.theme,
            font_size: data.font_size,
          }))
          localStorage.setItem('beyondr-font-size', String(data.font_size))
        } catch {
          // ignore
        }

        // Mark loaded AFTER applying values to avoid re-save loops
        loadedRef.current = true
      })
      .catch(() => {
        loadedRef.current = true
      })
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  // Save theme changes to server
  useEffect(() => {
    if (!user || !loadedRef.current || !theme) return
    debouncedSave(themeDebounceRef, { theme })
  }, [theme, user])

  // Save language changes to server
  useEffect(() => {
    if (!user || !loadedRef.current) return
    debouncedSave(langDebounceRef, { language: lang })
  }, [lang, user])

  return null
}
