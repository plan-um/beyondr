'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { SubmissionStatus, SubmissionType, VotingSessionStatus } from '@/types/evolution'

const t = {
  ko: {
    hero: {
      pre: '커뮤니티가 함께 만드는',
      title: '살아있는 경전',
      sub: '지혜를 나누고, 함께 투표하고, 경전을 진화시켜요. 모든 과정은 투명하게 공개돼요.',
    },
    stats: { submissions: '제출된 지혜', activeVotes: '진행 중인 투표', approved: '승인된 항목' },
    recent: { title: '최근 제출', empty: '아직 제출된 지혜가 없어요' },
    voting: { title: '진행 중인 투표', empty: '현재 진행 중인 투표가 없어요', remaining: '남은 시간', approve: '찬성률' },
    cta: { submit: '지혜 나누기', vote: '투표 참여하기' },
    types: { wisdom: '지혜', story: '이야기', reflection: '성찰', teaching: '가르침', prayer: '기도', poem: '시' },
    status: { draft: '임시저장', submitted: '제출됨', screening: '심사 중', screening_passed: '심사 통과', screening_failed: '심사 실패', refining: '다듬기 중', refined: '다듬기 완료', voting: '투표 중', approved: '승인됨', rejected: '반려됨', registered: '등록됨' },
  },
  en: {
    hero: {
      pre: 'Built by the community',
      title: 'Living Scripture',
      sub: 'Share wisdom, vote together, and evolve the scripture. Every step is transparent.',
    },
    stats: { submissions: 'Submissions', activeVotes: 'Active Votes', approved: 'Approved' },
    recent: { title: 'Recent Submissions', empty: 'No submissions yet' },
    voting: { title: 'Active Voting', empty: 'No active voting sessions', remaining: 'Time left', approve: 'Approval' },
    cta: { submit: 'Share Wisdom', vote: 'Vote Now' },
    types: { wisdom: 'Wisdom', story: 'Story', reflection: 'Reflection', teaching: 'Teaching', prayer: 'Prayer', poem: 'Poem' },
    status: { draft: 'Draft', submitted: 'Submitted', screening: 'Screening', screening_passed: 'Passed', screening_failed: 'Failed', refining: 'Refining', refined: 'Refined', voting: 'Voting', approved: 'Approved', rejected: 'Rejected', registered: 'Registered' },
  },
}

interface SubmissionItem {
  id: string
  title: string
  type: SubmissionType
  status: SubmissionStatus
  created_at: string
}

interface VotingItem {
  id: string
  title: string
  description: string | null
  approval_rate: number
  ends_at: string
  status: VotingSessionStatus
}

function getTimeRemaining(endsAt: string): string {
  const diff = new Date(endsAt).getTime() - Date.now()
  if (diff <= 0) return '0h'
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  if (days > 0) return `${days}d ${hours}h`
  return `${hours}h`
}

function statusColor(status: SubmissionStatus): string {
  switch (status) {
    case 'approved':
    case 'registered':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    case 'voting':
    case 'screening':
    case 'refining':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    case 'rejected':
    case 'screening_failed':
      return 'bg-red-500/10 text-red-400 border-red-500/20'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

export default function EvolutionPage() {
  const { lang } = useI18n()
  const s = t[lang]

  const [submissions, setSubmissions] = useState<SubmissionItem[]>([])
  const [votingSessions, setVotingSessions] = useState<VotingItem[]>([])
  const [stats, setStats] = useState({ total: 0, active: 0, approved: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [subRes, voteRes] = await Promise.all([
          fetch('/api/evolution/submissions?limit=5'),
          fetch('/api/evolution/voting'),
        ])
        if (subRes.ok) {
          const data = await subRes.json()
          setSubmissions(data.submissions ?? [])
          setStats({
            total: data.total ?? 0,
            active: data.active_votes ?? 0,
            approved: data.approved ?? 0,
          })
        }
        if (voteRes.ok) {
          const data = await voteRes.json()
          setVotingSessions(data.sessions ?? [])
          if (data.sessions) {
            setStats(prev => ({ ...prev, active: data.sessions.length }))
          }
        }
      } catch {
        // API not ready yet, show empty state
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <main className="pt-14">
      {/* Hero */}
      <section className="min-h-[50vh] flex items-center justify-center px-5 relative overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-gold/5 blur-[120px] pointer-events-none" />
        <div className="max-w-2xl text-center relative z-10">
          <p className="text-xs tracking-[0.3em] uppercase text-muted-foreground mb-6 animate-fade-in">
            {s.hero.pre}
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold leading-[1.15] tracking-tight mb-6 animate-fade-in">
            {s.hero.title}
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-lg mx-auto mb-10 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            {s.hero.sub}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <Button size="lg" className="h-11 px-8 text-sm tracking-wide" asChild>
              <Link href="/evolution/submit">{s.cta.submit}</Link>
            </Button>
            <Button variant="outline" size="lg" className="h-11 px-8 text-sm tracking-wide" asChild>
              <Link href="/evolution/vote">{s.cta.vote}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-5 py-12 max-w-4xl mx-auto">
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: s.stats.submissions, value: stats.total },
            { label: s.stats.activeVotes, value: stats.active },
            { label: s.stats.approved, value: stats.approved },
          ].map((stat) => (
            <Card key={stat.label} className="text-center">
              <CardContent className="pt-6">
                <div className="text-3xl font-semibold text-gold mb-1">
                  {loading ? '-' : stat.value}
                </div>
                <div className="text-xs text-muted-foreground tracking-wide">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Separator className="max-w-4xl mx-auto" />

      {/* Recent Submissions */}
      <section className="px-5 py-12 max-w-4xl mx-auto">
        <h2 className="text-lg font-medium mb-6">{s.recent.title}</h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 rounded-lg bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : submissions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">{s.recent.empty}</p>
        ) : (
          <div className="space-y-3">
            {submissions.map((sub) => (
              <Card key={sub.id}>
                <CardContent className="py-4 px-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      {s.types[sub.type]}
                    </Badge>
                    <span className="text-sm font-medium truncate">{sub.title}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge className={statusColor(sub.status)}>
                      {s.status[sub.status]}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(sub.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Separator className="max-w-4xl mx-auto" />

      {/* Active Voting */}
      <section className="px-5 py-12 max-w-4xl mx-auto">
        <h2 className="text-lg font-medium mb-6">{s.voting.title}</h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-24 rounded-lg bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : votingSessions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">{s.voting.empty}</p>
        ) : (
          <div className="space-y-4">
            {votingSessions.map((session) => (
              <Card key={session.id}>
                <CardContent className="py-5 px-5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <h3 className="text-sm font-medium">{session.title}</h3>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {s.voting.remaining}: {getTimeRemaining(session.ends_at)}
                    </span>
                  </div>
                  {session.description && (
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{session.description}</p>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gold transition-all duration-500"
                        style={{ width: `${Math.round(session.approval_rate * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gold shrink-0">
                      {s.voting.approve} {Math.round(session.approval_rate * 100)}%
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Bottom CTA */}
      <section className="px-5 py-16 text-center">
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button size="lg" className="h-11 px-8 text-sm tracking-wide" asChild>
            <Link href="/evolution/submit">{s.cta.submit}</Link>
          </Button>
          <Button variant="outline" size="lg" className="h-11 px-8 text-sm tracking-wide" asChild>
            <Link href="/evolution/vote">{s.cta.vote}</Link>
          </Button>
        </div>
      </section>
    </main>
  )
}
