'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { SUBMISSION_MAX_LENGTHS, type SubmissionType } from '@/types/evolution'

const t = {
  ko: {
    back: '돌아가기',
    title: '지혜 나누기',
    sub: '당신의 지혜를 커뮤니티와 나눠주세요. AI 심사를 거쳐 투표에 올라갈 수 있어요.',
    typeLabel: '유형을 선택하세요',
    types: {
      wisdom: { name: '지혜', desc: '짧고 깊은 통찰', icon: '✦' },
      story: { name: '이야기', desc: '영적 경험이나 배움의 이야기', icon: '📖' },
      reflection: { name: '성찰', desc: '삶에 대한 깊은 생각', icon: '🔍' },
      teaching: { name: '가르침', desc: '전통에서 배운 교훈', icon: '🎓' },
      prayer: { name: '기도', desc: '기도문이나 명상 글', icon: '🙏' },
      poem: { name: '시', desc: '영적 영감을 담은 시', icon: '✍️' },
    },
    titleInput: '제목',
    titlePlaceholder: '지혜의 제목을 입력하세요',
    contentLabel: '내용',
    contentPlaceholder: '당신의 지혜를 나눠주세요...',
    charCount: '글자',
    categoryLabel: '전통 / 카테고리',
    categories: ['불교', '기독교', '이슬람', '힌두교', '도교', '스토아', '보편'],
    categoriesEn: ['Buddhism', 'Christianity', 'Islam', 'Hinduism', 'Taoism', 'Stoicism', 'Universal'],
    draft: '임시저장',
    submit: '제출하기',
    success: '제출이 완료되었어요!',
    successSub: 'AI 심사 후 결과를 알려드릴게요.',
    goBack: '목록으로',
    error: '제출에 실패했어요. 다시 시도해주세요.',
    required: '필수 항목을 모두 입력해주세요.',
  },
  en: {
    back: 'Back',
    title: 'Share Wisdom',
    sub: 'Share your wisdom with the community. It will go through AI screening before being put to vote.',
    typeLabel: 'Choose a type',
    types: {
      wisdom: { name: 'Wisdom', desc: 'A short, deep insight', icon: '✦' },
      story: { name: 'Story', desc: 'A spiritual experience or lesson', icon: '📖' },
      reflection: { name: 'Reflection', desc: 'Deep thoughts on life', icon: '🔍' },
      teaching: { name: 'Teaching', desc: 'A lesson from tradition', icon: '🎓' },
      prayer: { name: 'Prayer', desc: 'A prayer or meditation text', icon: '🙏' },
      poem: { name: 'Poem', desc: 'A spiritually inspired poem', icon: '✍️' },
    },
    titleInput: 'Title',
    titlePlaceholder: 'Give your wisdom a title',
    contentLabel: 'Content',
    contentPlaceholder: 'Share your wisdom...',
    charCount: 'chars',
    categoryLabel: 'Tradition / Category',
    categories: ['Buddhism', 'Christianity', 'Islam', 'Hinduism', 'Taoism', 'Stoicism', 'Universal'],
    categoriesEn: ['Buddhism', 'Christianity', 'Islam', 'Hinduism', 'Taoism', 'Stoicism', 'Universal'],
    draft: 'Save Draft',
    submit: 'Submit',
    success: 'Submission complete!',
    successSub: 'You will be notified after AI screening.',
    goBack: 'Back to list',
    error: 'Submission failed. Please try again.',
    required: 'Please fill in all required fields.',
  },
}

const submissionTypes: SubmissionType[] = ['wisdom', 'story', 'reflection', 'teaching', 'prayer', 'poem']

export default function SubmitPage() {
  const { lang } = useI18n()
  const s = t[lang]
  const router = useRouter()

  const [selectedType, setSelectedType] = useState<SubmissionType | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const maxLen = selectedType ? SUBMISSION_MAX_LENGTHS[selectedType] : 0

  function toggleCategory(cat: string) {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    )
  }

  async function handleSubmit(isDraft: boolean) {
    if (!selectedType || !title.trim() || !content.trim()) {
      setError(s.required)
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/evolution/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType,
          title: title.trim(),
          raw_text: content.trim(),
          categories: selectedCategories,
          status: isDraft ? 'draft' : 'submitted',
        }),
      })
      if (!res.ok) throw new Error()
      setSuccess(true)
    } catch {
      setError(s.error)
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <main className="pt-14 min-h-screen flex items-center justify-center px-5">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4">✦</div>
          <h1 className="text-2xl font-semibold mb-2">{s.success}</h1>
          <p className="text-sm text-muted-foreground mb-8">{s.successSub}</p>
          <Button variant="outline" asChild>
            <Link href="/evolution">{s.goBack}</Link>
          </Button>
        </div>
      </main>
    )
  }

  return (
    <main className="pt-14 min-h-screen">
      <div className="max-w-2xl mx-auto px-5 py-12">
        {/* Back link */}
        <Link href="/evolution" className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 inline-block">
          &larr; {s.back}
        </Link>

        <h1 className="text-3xl font-semibold mb-2">{s.title}</h1>
        <p className="text-sm text-muted-foreground mb-10">{s.sub}</p>

        {/* Type selector - radio cards */}
        <div className="mb-8">
          <label className="text-sm font-medium mb-3 block">{s.typeLabel}</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {submissionTypes.map((type) => {
              const typeInfo = s.types[type]
              const isSelected = selectedType === type
              return (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`relative text-left p-4 rounded-lg border transition-all duration-200 ${
                    isSelected
                      ? 'border-gold bg-gold/5 ring-1 ring-gold/30'
                      : 'border-border hover:border-muted-foreground/30'
                  }`}
                >
                  <div className="text-lg mb-1">{typeInfo.icon}</div>
                  <div className="text-sm font-medium mb-0.5">{typeInfo.name}</div>
                  <div className="text-[11px] text-muted-foreground leading-snug">{typeInfo.desc}</div>
                  <div className="text-[10px] text-muted-foreground mt-1.5">
                    max {SUBMISSION_MAX_LENGTHS[type].toLocaleString()} {s.charCount}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <Separator className="mb-8" />

        {/* Title input */}
        <div className="mb-6">
          <label className="text-sm font-medium mb-2 block">{s.titleInput}</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={s.titlePlaceholder}
            maxLength={200}
          />
        </div>

        {/* Content textarea */}
        <div className="mb-6">
          <label className="text-sm font-medium mb-2 block">{s.contentLabel}</label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, maxLen || 5000))}
            placeholder={s.contentPlaceholder}
            rows={8}
            className="resize-none"
          />
          <div className="flex justify-end mt-1.5">
            <span className={`text-xs ${content.length >= (maxLen || 5000) ? 'text-red-400' : 'text-muted-foreground'}`}>
              {content.length} / {maxLen || '-'} {s.charCount}
            </span>
          </div>
        </div>

        {/* Category multi-select */}
        <div className="mb-8">
          <label className="text-sm font-medium mb-3 block">{s.categoryLabel}</label>
          <div className="flex flex-wrap gap-2">
            {s.categories.map((cat, i) => {
              const catKey = s.categoriesEn[i]
              const isSelected = selectedCategories.includes(catKey)
              return (
                <button
                  key={catKey}
                  onClick={() => toggleCategory(catKey)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-all duration-200 ${
                    isSelected
                      ? 'border-gold bg-gold/10 text-gold'
                      : 'border-border text-muted-foreground hover:border-muted-foreground/50'
                  }`}
                >
                  {cat}
                </button>
              )
            })}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <p className="text-sm text-red-400 mb-4">{error}</p>
        )}

        {/* Submit buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => handleSubmit(true)}
            disabled={submitting}
            className="flex-1"
          >
            {s.draft}
          </Button>
          <Button
            onClick={() => handleSubmit(false)}
            disabled={submitting || !selectedType || !title.trim() || !content.trim()}
            className="flex-1"
          >
            {submitting ? '...' : s.submit}
          </Button>
        </div>
      </div>
    </main>
  )
}
