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
