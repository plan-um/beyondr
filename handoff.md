# Handoff

## 현재 상태
- **단계**: Next.js 15 전환 완료, 빌드 성공
- **브랜치**: main
- **Next.js**: `pnpm dev` → localhost:3000 (App Router, Turbopack)
- **목업 서버**: `beyondr-mockup/` (Vite, 레거시 — 참조용)
- **빌드**: `pnpm build` 성공 (8 static + 1 dynamic 라우트, First Load JS 101KB shared)
- **Supabase**: 원격 연결 완료 (qolnmdnmfcxxfuigiser), DB push 완료, 시드 데이터 적재 완료

## 최근 작업
### 2026-02-11: Next.js 15 전환 (1,662줄 신규)
- **App.tsx 분리**: 1,543줄 모놀리식 SPA → 7개 라우트 페이지 + 레이아웃 컴포넌트
- **라우팅**: `/` (Landing), `/chat`, `/scriptures`, `/scriptures/[id]`, `/pricing`, `/help`, `/contact`
- **i18n**: React Context 기반 (`useI18n()` 훅, en/ko 번역 301줄)
- **레이아웃**: Header, Footer, ThemeToggle, LangToggle, BackToTop (next-themes 사용)
- **Supabase SSR**: `@supabase/ssr`로 브라우저/서버 클라이언트 구성
- **shadcn/ui**: 14개 컴포넌트 마이그레이션 (badge, button, card, dialog 등)
- **빌드 이슈 해결**: supabase/ Deno import → tsconfig exclude, CookieOptions 타입 수정

### 이전: Edge Functions + DB 인프라 + MVP 프론트엔드
- Edge Functions 8개 (4,323줄): audit, constitution-check, screening, refinement, voting, placement, revision, crawl
- DB 마이그레이션 21개 테이블 (1,223줄), 시드 데이터 4개, TypeScript 타입 476줄
- 서재 500권 스캔, 1,069개 인용구, 5장 59절 경전

### 주요 파일
- `app/` - Next.js 15 App Router 페이지 7개 + 레이아웃
- `components/layout/` - Header, Footer, ThemeToggle, LangToggle, BackToTop
- `components/ui/` - shadcn/ui 14개 컴포넌트
- `lib/i18n.tsx` - i18n 컨텍스트 + 번역 (301줄)
- `lib/scripture-verses.ts` - 인라인 경전 데이터 (407줄)
- `lib/supabase/` - 브라우저/서버 Supabase 클라이언트
- `supabase/functions/*/index.ts` - Edge Function 8개 (4,323줄)
- `supabase/migrations/` - DB 스키마 (1,223줄)

## 알려진 이슈
- Voyage-3.5 임베딩 미연동 (표절 검사, 유사 절 검색, 의미 보존도 측정 TODO)
- 크롤링 어댑터 Bible API만 구현 (Quran, Gita, Sacred Texts 등 TODO)
- Edge Functions 원격 배포 전 (`supabase functions deploy` 필요)
- ANTHROPIC_API_KEY를 Supabase Secrets에 등록 필요
- `lib/scripture-data.ts` (1,841줄 전체 DB) 아직 미사용 — `scripture-verses.ts` 인라인 데이터 사용 중

## 핵심 결정사항
- **통합 경전 컨셉**: "종교 사이의 다리" (10대 헌법 원칙)
- **경전 진화**: 9단계 파이프라인 (수집→심사→정제→투표→등록→개정→로그→배치)
- **투표 시스템**: 인간+AI 공동 투표 (60% 신규, 70% 개정, 80% 삭제)
- **AI 엔티티**: 18개 관점 (8 전통, 5 기능, 3 반대, 2 메타)
- **기술스택**: Next.js 15 + Supabase + Claude API + Voyage-3.5 + Cohere Rerank

## TODO
- [ ] 통합 경전 명칭 최종 확정
- [ ] Edge Functions 원격 배포 (`supabase functions deploy`)
- [ ] ANTHROPIC_API_KEY Supabase Secrets 등록
- [ ] Voyage-3.5 임베딩 파이프라인 연동
- [ ] RAG 파이프라인 + AI 상담 챗봇
- [ ] 결제 시스템 (Stripe/Toss) + 인증
- [ ] 투명성 페이지 (/transparency) UI
- [ ] 경전 진화 UI (제출, 투표, 개정, 투명성 페이지)
- [ ] 배포 + 베타 런칭
- [x] Supabase DB 스키마 생성 + 원격 push
- [x] 시드 데이터 + 경전 데이터 적재
- [x] Edge Functions 8개 전체 구현
- [x] Next.js 15 전환 + 컴포넌트 분리

> 자세한 이력은 CHANGELOG.md 참조
