'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useI18n, type Lang } from '@/lib/i18n'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { LangToggle } from '@/components/layout/lang-toggle'

const navItems: { key: string; href: string; label?: Record<Lang, string> }[] = [
  { key: 'chat', href: '/chat' },
  { key: 'scriptures', href: '/scriptures' },
  { key: 'evolution', href: '/evolution', label: { ko: '진화', en: 'Evolution' } },
  { key: 'pricing', href: '/pricing' },
  { key: 'help', href: '/help' },
]

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { lang, setLang, t } = useI18n()
  const { user, loading: authLoading, signOut } = useAuth()

  const isActive = (href: string) => pathname === href

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')
  const toggleLang = () => setLang(lang === 'en' ? 'ko' : 'en')

  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/40">
      <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-lg font-medium tracking-[0.2em] uppercase group-hover:text-gold transition-colors duration-300">
            beyondr
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={`text-sm tracking-wide transition-colors duration-200 ${
                isActive(item.href) ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {item.label ? item.label[lang] : t.nav[item.key as keyof typeof t.nav]}
            </Link>
          ))}
        </nav>

        {/* Right controls */}
        <div className="hidden md:flex items-center gap-3">
          <LangToggle lang={lang} toggle={toggleLang} />
          <ThemeToggle dark={theme === 'dark'} toggle={toggleTheme} />
          <Separator orientation="vertical" className="h-5 mx-1" />
          {!authLoading && user ? (
            <>
              <span className="text-sm text-muted-foreground truncate max-w-[120px]">
                {user.user_metadata?.full_name || user.email?.split('@')[0]}
              </span>
              <Button size="sm" variant="ghost" className="h-8 px-3 text-xs" onClick={async () => { await signOut(); router.push('/') }}>
                {lang === 'ko' ? '로그아웃' : 'Sign out'}
              </Button>
            </>
          ) : (
            <>
              <button className="text-sm text-muted-foreground hover:text-foreground transition-colors" onClick={() => router.push('/auth/login')}>{t.nav.login}</button>
              <Button size="sm" className="h-8 px-4 text-xs tracking-wide" onClick={() => router.push('/chat')}>
                {t.nav.start}
              </Button>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden items-center gap-2">
          <LangToggle lang={lang} toggle={toggleLang} />
          <ThemeToggle dark={theme === 'dark'} toggle={toggleTheme} />
          <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              {mobileOpen ? <path d="M18 6L6 18M6 6l12 12" /> : <path d="M4 8h16M4 16h16" />}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border/40 bg-background/95 backdrop-blur-xl animate-fade-in">
          <div className="px-5 py-4 flex flex-col gap-3">
            {navItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="text-left py-2 text-sm tracking-wide text-muted-foreground hover:text-foreground"
              >
                {item.label ? item.label[lang] : t.nav[item.key as keyof typeof t.nav]}
              </Link>
            ))}
            <Separator className="my-1" />
            {!authLoading && user ? (
              <>
                <span className="py-2 text-sm text-muted-foreground truncate">
                  {user.user_metadata?.full_name || user.email?.split('@')[0]}
                </span>
                <Button size="sm" variant="ghost" className="w-full mt-1" onClick={async () => { await signOut(); setMobileOpen(false); router.push('/') }}>
                  {lang === 'ko' ? '로그아웃' : 'Sign out'}
                </Button>
              </>
            ) : (
              <>
                <button className="text-left py-2 text-sm text-muted-foreground" onClick={() => { router.push('/auth/login'); setMobileOpen(false) }}>{t.nav.login}</button>
                <Button size="sm" className="w-full mt-1" onClick={() => { router.push('/chat'); setMobileOpen(false) }}>
                  {t.nav.start}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
