'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

const t = {
  ko: {
    title: '로그인',
    email: '이메일',
    password: '비밀번호',
    submit: '로그인하기',
    noAccount: '계정이 없으신가요?',
    signup: '회원가입',
  },
  en: {
    title: 'Sign In',
    email: 'Email',
    password: 'Password',
    submit: 'Sign In',
    noAccount: "Don't have an account?",
    signup: 'Sign Up',
  },
}

export default function LoginPage() {
  const { lang } = useI18n()
  const s = t[lang]
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/')
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
            {s.noAccount}{' '}
            <Link href="/auth/signup" className="text-primary hover:underline">
              {s.signup}
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
