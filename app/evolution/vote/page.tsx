'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import type { VoteChoice } from '@/types/evolution'

const t = {
  ko: {
    back: '돌아가기',
    title: '투표 참여하기',
    sub: '커뮤니티가 제출한 지혜를 검토하고 투표하세요. 당신의 한 표가 경전을 만들어요.',
    empty: '현재 진행 중인 투표가 없어요',
    remaining: '남은 시간',
    approval: '찬성률',
    anonymous: '익명',
    showMore: '전체 보기',
    showLess: '접기',
    approve: '찬성',
    reject: '반대',
    reasonPlaceholder: '투표 이유를 적어주세요 (선택)',
    voted: '투표 완료',
    aiVotes: 'AI 심사 의견',
    aiFor: '찬성',
    aiAgainst: '반대',
    aiAbstain: '기권',
    error: '투표에 실패했어요. 다시 시도해주세요.',
  },
  en: {
    back: 'Back',
    title: 'Vote',
    sub: 'Review community wisdom submissions and cast your vote. Every vote shapes the scripture.',
    empty: 'No active voting sessions',
    remaining: 'Time left',
    approval: 'Approval',
    anonymous: 'Anonymous',
    showMore: 'Show full',
    showLess: 'Collapse',
    approve: 'Approve',
    reject: 'Reject',
    reasonPlaceholder: 'Reason for your vote (optional)',
    voted: 'Vote cast',
    aiVotes: 'AI Entity Votes',
    aiFor: 'For',
    aiAgainst: 'Against',
    aiAbstain: 'Abstain',
    error: 'Vote failed. Please try again.',
  },
}

interface AIEntityVote {
  perspective_name: string
  perspective_name_ko: string
  vote: VoteChoice
  reason: string | null
}

interface VotingSession {
  id: string
  title: string
  description: string | null
  approval_rate: number
  ends_at: string
  human_votes_for: number
  human_votes_against: number
  ai_votes_for: number
  ai_votes_against: number
  ai_entities?: AIEntityVote[]
}

function getTimeRemaining(endsAt: string): string {
  const diff = new Date(endsAt).getTime() - Date.now()
  if (diff <= 0) return '0h'
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  if (days > 0) return `${days}d ${hours}h`
  return `${hours}h`
}

function VoteCard({ session, s, lang }: { session: VotingSession; s: typeof t.ko; lang: string }) {
  const [expanded, setExpanded] = useState(false)
  const [reason, setReason] = useState('')
  const [voted, setVoted] = useState(false)
  const [error, setError] = useState('')

  async function castVote(choice: VoteChoice) {
    setError('')
    try {
      const res = await fetch('/api/evolution/voting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: session.id,
          vote: choice,
          reason: reason.trim() || null,
        }),
      })
      if (!res.ok) throw new Error()
      setVoted(true)
    } catch {
      setError(s.error)
    }
  }

  const approvalPct = Math.round(session.approval_rate * 100)

  return (
    <Card>
      <CardContent className="py-5 px-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-2">
          <h3 className="text-sm font-medium">{session.title}</h3>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className="text-[10px]">{s.anonymous}</Badge>
            <span className="text-xs text-muted-foreground">
              {s.remaining}: {getTimeRemaining(session.ends_at)}
            </span>
          </div>
        </div>

        {/* Content preview / full */}
        {session.description && (
          <p className={`text-sm text-muted-foreground mb-3 ${expanded ? '' : 'line-clamp-3'}`}>
            {session.description}
          </p>
        )}
        {session.description && session.description.length > 200 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-gold hover:text-gold/80 mb-3 transition-colors"
          >
            {expanded ? s.showLess : s.showMore}
          </button>
        )}

        {/* Progress bar */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-gold transition-all duration-500"
              style={{ width: `${approvalPct}%` }}
            />
          </div>
          <span className="text-xs font-medium text-gold shrink-0">
            {s.approval} {approvalPct}%
          </span>
        </div>

        {/* AI Entity Votes (expandable) */}
        {expanded && session.ai_entities && session.ai_entities.length > 0 && (
          <div className="mb-4">
            <Separator className="mb-3" />
            <h4 className="text-xs font-medium text-muted-foreground mb-2">{s.aiVotes}</h4>
            <div className="space-y-2">
              {session.ai_entities.map((entity, i) => (
                <div key={i} className="text-xs p-3 rounded-md bg-muted/30 border border-border/50">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">
                      {lang === 'ko' ? entity.perspective_name_ko : entity.perspective_name}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        entity.vote === 'for'
                          ? 'text-emerald-400 border-emerald-500/30'
                          : entity.vote === 'against'
                          ? 'text-red-400 border-red-500/30'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {entity.vote === 'for' ? s.aiFor : entity.vote === 'against' ? s.aiAgainst : s.aiAbstain}
                    </Badge>
                  </div>
                  {entity.reason && (
                    <p className="text-muted-foreground leading-relaxed">{entity.reason}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vote actions */}
        {voted ? (
          <div className="text-center py-3">
            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
              {s.voted}
            </Badge>
          </div>
        ) : (
          <>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={s.reasonPlaceholder}
              rows={2}
              className="resize-none mb-3 text-xs"
            />
            {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
            <div className="flex gap-3">
              <Button
                onClick={() => castVote('for')}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                size="sm"
              >
                {s.approve}
              </Button>
              <Button
                onClick={() => castVote('against')}
                variant="outline"
                className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
                size="sm"
              >
                {s.reject}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default function VotePage() {
  const { lang } = useI18n()
  const s = t[lang]

  const [sessions, setSessions] = useState<VotingSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/evolution/voting')
        if (res.ok) {
          const data = await res.json()
          setSessions(data.sessions ?? [])
        }
      } catch {
        // API not ready
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <main className="pt-14 min-h-screen">
      <div className="max-w-2xl mx-auto px-5 py-12">
        <Link href="/evolution" className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 inline-block">
          &larr; {s.back}
        </Link>

        <h1 className="text-3xl font-semibold mb-2">{s.title}</h1>
        <p className="text-sm text-muted-foreground mb-10">{s.sub}</p>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-40 rounded-lg bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-muted-foreground">{s.empty}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => (
              <VoteCard key={session.id} session={session} s={s} lang={lang} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
