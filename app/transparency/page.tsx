'use client'

import { useState, useEffect } from 'react'
import { useI18n } from '@/lib/i18n'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { ActorType, AuditEventType } from '@/types/evolution'

const t = {
  ko: {
    title: '투명성 로그',
    sub: '모든 결정과 변경은 기록돼요. 누가, 무엇을, 왜 했는지 모두 볼 수 있어요.',
    filterType: '이벤트 유형',
    filterActor: '행위자',
    filterAll: '전체',
    actorTypes: { human: '사람', ai: 'AI', system: '시스템' },
    loadMore: '더 보기',
    empty: '기록이 없어요',
    eventLabels: {
      'submission.created': '제출 생성',
      'submission.submitted': '제출됨',
      'submission.screened': 'AI 심사',
      'submission.refined': '다듬기 완료',
      'submission.approved': '제출 승인',
      'submission.rejected': '제출 반려',
      'vote.cast': '투표',
      'voting_session.created': '투표 세션 생성',
      'voting_session.ended': '투표 종료',
      'scripture.registered': '경전 등록',
      'scripture.revised': '경전 수정',
      'scripture.archived': '경전 보관',
      'principle.amended': '원칙 수정',
      'category.created': '카테고리 생성',
      'council.member_added': '의회 멤버 추가',
      'revision.proposed': '수정 제안',
      'revision.approved': '수정 승인',
      'revision.rejected': '수정 반려',
      'emergency_fix.applied': '긴급 수정',
    } as Record<string, string>,
    showDetails: '상세 보기',
    hideDetails: '접기',
  },
  en: {
    title: 'Transparency Log',
    sub: 'Every decision and change is recorded. See who did what and why.',
    filterType: 'Event Type',
    filterActor: 'Actor',
    filterAll: 'All',
    actorTypes: { human: 'Human', ai: 'AI', system: 'System' },
    loadMore: 'Load More',
    empty: 'No records yet',
    eventLabels: {
      'submission.created': 'Submission Created',
      'submission.submitted': 'Submitted',
      'submission.screened': 'AI Screened',
      'submission.refined': 'Refined',
      'submission.approved': 'Approved',
      'submission.rejected': 'Rejected',
      'vote.cast': 'Vote Cast',
      'voting_session.created': 'Voting Session Created',
      'voting_session.ended': 'Voting Ended',
      'scripture.registered': 'Scripture Registered',
      'scripture.revised': 'Scripture Revised',
      'scripture.archived': 'Scripture Archived',
      'principle.amended': 'Principle Amended',
      'category.created': 'Category Created',
      'council.member_added': 'Council Member Added',
      'revision.proposed': 'Revision Proposed',
      'revision.approved': 'Revision Approved',
      'revision.rejected': 'Revision Rejected',
      'emergency_fix.applied': 'Emergency Fix',
    } as Record<string, string>,
    showDetails: 'Show details',
    hideDetails: 'Hide',
  },
}

const eventTypeOptions: AuditEventType[] = [
  'submission.created', 'submission.submitted', 'submission.screened',
  'submission.approved', 'submission.rejected',
  'vote.cast', 'voting_session.created', 'voting_session.ended',
  'scripture.registered', 'scripture.revised',
  'revision.proposed', 'revision.approved', 'revision.rejected',
]

const actorTypeOptions: ActorType[] = ['human', 'ai', 'system']

interface AuditEntry {
  id: number
  event_type: string
  actor_type: ActorType
  actor_id: string | null
  subject_type: string | null
  subject_id: string | null
  details: Record<string, unknown> | null
  created_at: string
}

function actorBadgeColor(actor: ActorType): string {
  switch (actor) {
    case 'human': return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    case 'ai': return 'bg-violet-500/10 text-violet-400 border-violet-500/20'
    case 'system': return 'bg-muted text-muted-foreground'
  }
}

function eventDotColor(eventType: string): string {
  if (eventType.includes('approved') || eventType.includes('registered')) return 'bg-emerald-400'
  if (eventType.includes('rejected')) return 'bg-red-400'
  if (eventType.includes('vote')) return 'bg-gold'
  return 'bg-muted-foreground'
}

function TimelineEvent({ entry, s, lang }: { entry: AuditEntry; s: typeof t.ko; lang: string }) {
  const [expanded, setExpanded] = useState(false)

  const label = s.eventLabels[entry.event_type] ?? entry.event_type
  const actorLabel = s.actorTypes[entry.actor_type]
  const dateStr = new Date(entry.created_at).toLocaleString(lang === 'ko' ? 'ko-KR' : 'en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="relative pl-8 pb-8 last:pb-0">
      {/* Timeline line */}
      <div className="absolute left-[11px] top-3 bottom-0 w-px bg-border" />
      {/* Timeline dot */}
      <div className={`absolute left-1.5 top-1.5 w-3 h-3 rounded-full ${eventDotColor(entry.event_type)} ring-2 ring-background`} />

      <div>
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-sm font-medium">{label}</span>
          <Badge className={`text-[10px] ${actorBadgeColor(entry.actor_type)}`}>
            {actorLabel}
          </Badge>
          <span className="text-xs text-muted-foreground">{dateStr}</span>
        </div>

        {entry.details && (
          <>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-gold hover:text-gold/80 transition-colors mt-1"
            >
              {expanded ? s.hideDetails : s.showDetails}
            </button>
            {expanded && (
              <Card className="mt-2">
                <CardContent className="py-3 px-4">
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-all">
                    {JSON.stringify(entry.details, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function TransparencyPage() {
  const { lang } = useI18n()
  const s = t[lang]

  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)
  const [filterEventType, setFilterEventType] = useState<string>('')
  const [filterActorType, setFilterActorType] = useState<string>('')

  const limit = 20

  async function loadEntries(reset = false) {
    const currentOffset = reset ? 0 : offset
    if (reset) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }

    try {
      const params = new URLSearchParams({ limit: String(limit), offset: String(currentOffset) })
      if (filterEventType) params.set('event_type', filterEventType)
      if (filterActorType) params.set('actor_type', filterActorType)

      const res = await fetch(`/api/evolution/audit?${params}`)
      if (res.ok) {
        const data = await res.json()
        const newEntries: AuditEntry[] = data.logs ?? []
        if (reset) {
          setEntries(newEntries)
        } else {
          setEntries(prev => [...prev, ...newEntries])
        }
        setHasMore(newEntries.length === limit)
        setOffset(currentOffset + newEntries.length)
      }
    } catch {
      // API not ready
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    loadEntries(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterEventType, filterActorType])

  return (
    <main className="pt-14 min-h-screen">
      <div className="max-w-2xl mx-auto px-5 py-12">
        <h1 className="text-3xl font-semibold mb-2">{s.title}</h1>
        <p className="text-sm text-muted-foreground mb-8">{s.sub}</p>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-8">
          {/* Event type filter */}
          <select
            value={filterEventType}
            onChange={(e) => setFilterEventType(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-md border border-border bg-background text-foreground"
          >
            <option value="">{s.filterType}: {s.filterAll}</option>
            {eventTypeOptions.map(et => (
              <option key={et} value={et}>{s.eventLabels[et] ?? et}</option>
            ))}
          </select>

          {/* Actor type filter */}
          <div className="flex gap-1.5">
            <button
              onClick={() => setFilterActorType('')}
              className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                !filterActorType ? 'border-gold bg-gold/10 text-gold' : 'border-border text-muted-foreground'
              }`}
            >
              {s.filterAll}
            </button>
            {actorTypeOptions.map(at => (
              <button
                key={at}
                onClick={() => setFilterActorType(at)}
                className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                  filterActorType === at ? 'border-gold bg-gold/10 text-gold' : 'border-border text-muted-foreground'
                }`}
              >
                {s.actorTypes[at]}
              </button>
            ))}
          </div>
        </div>

        <Separator className="mb-8" />

        {/* Timeline */}
        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-12 rounded-lg bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm text-muted-foreground">{s.empty}</p>
          </div>
        ) : (
          <div>
            {entries.map((entry) => (
              <TimelineEvent key={entry.id} entry={entry} s={s} lang={lang} />
            ))}

            {hasMore && (
              <div className="text-center mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadEntries(false)}
                  disabled={loadingMore}
                >
                  {loadingMore ? '...' : s.loadMore}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
