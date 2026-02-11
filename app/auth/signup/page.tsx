'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

const t = {
  ko: {
    title: '회원가입',
    googleSignUp: 'Google로 시작하기',
    divider: '또는',
    email: '이메일',
    password: '비밀번호',
    confirmPassword: '비밀번호 확인',
    submit: '가입하기',
    hasAccount: '이미 계정이 있으신가요?',
    login: '로그인',
    success: '확인 이메일을 보냈어요',
    successSub: '이메일을 확인해서 가입을 완료해주세요.',
    mismatch: '비밀번호가 일치하지 않아요',
    tooShort: '비밀번호는 8자 이상이어야 해요',
  },
  en: {
    title: 'Sign Up',
    googleSignUp: 'Sign up with Google',
    divider: 'or',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    submit: 'Sign Up',
    hasAccount: 'Already have an account?',
    login: 'Sign In',
    success: 'Check your email for confirmation',
    successSub: 'We sent a confirmation link to your email.',
    mismatch: 'Passwords do not match',
    tooShort: 'Password must be at least 8 characters',
  },
}

export default function SignupPage() {
  const { lang } = useI18n()
  const s = t[lang]
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleGoogleSignIn = async () => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError(s.tooShort)
      return
    }

    if (password !== confirmPassword) {
      setError(s.mismatch)
      return
    }

    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <main className="pt-14 min-h-screen flex items-center justify-center px-5">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-6">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gold">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">{s.success}</h2>
          <p className="text-sm text-muted-foreground">{s.successSub}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="pt-14 min-h-screen flex items-center justify-center px-5">
      <Card className="w-full max-w-md border-border/40">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{s.title}</CardTitle>
          <CardDescription className="text-muted-foreground/70">
            beyondr
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 text-base font-medium"
            onClick={handleGoogleSignIn}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {s.googleSignUp}
          </Button>

          <div className="flex items-center my-6">
            <div className="flex-1 border-t border-border" />
            <span className="px-4 text-muted-foreground text-sm">{s.divider}</span>
            <div className="flex-1 border-t border-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{s.email}</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{s.password}</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">{s.confirmPassword}</Label>
              <Input
                id="confirm-password"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                s.submit
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {s.hasAccount}{' '}
            <Link href="/auth/login" className="text-primary hover:underline">
              {s.login}
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
