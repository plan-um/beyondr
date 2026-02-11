# Handoff

## 현재 상태
- **단계**: 베타 배포 완료
- **프로덕션 URL**: https://beyondr.vercel.app
- **GitHub**: https://github.com/plan-um/beyondr
- **브랜치**: main
- **Next.js**: 15.5.12 (App Router, Turbopack)
- **빌드**: 22페이지 (15 static + 7 dynamic), First Load JS 102KB shared, 0 에러
- **Supabase**: qolnmdnmfcxxfuigiser, Edge Functions 8개 배포 완료, ANTHROPIC_API_KEY 등록 완료
- **Vercel 환경변수**: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY

## 최근 작업
### 2026-02-11: 풀스택 베타 구축 + 배포
- **Auth**: Supabase Auth (로그인/회원가입/미들웨어/AuthContext)
- **AI 채팅**: Claude API 스트리밍, 4개 페르소나 (선승/수피시인/스토아철학자/통합안내자), 경전 RAG
- **경전 진화 UI**: 제출 폼 (6가지 유형), 투표 세션, 투명성 타임라인
- **Paddle 결제**: 플레이스홀더 준비 (lib/paddle.ts, 성공/취소 페이지)
- **보안 강화**: 12건 수정 (SQL injection, auth, rate limit, 보안 헤더, 입력 검증)
- **배포**: Edge Functions 8개 원격 배포, Vercel 프로덕션 배포

### 이전 작업
- Next.js 15 전환: 1,543줄 SPA → 22페이지 App Router
- Edge Functions 8개 (4,323줄), DB 21개 테이블 (1,223줄), 시드 데이터 4개
- 서재 500권 스캔, 1,069개 인용구, 5장 59절 경전

### 주요 파일
- `app/` - 22페이지 (auth, chat, evolution, payment, scriptures 등)
- `app/api/` - API 라우트 4개 (chat, submissions, voting, audit)
- `components/` - auth, layout, ui (14개 shadcn/ui)
- `lib/` - i18n, auth-context, paddle, rate-limit, supabase, scripture
- `middleware.ts` - Supabase Auth 미들웨어
- `supabase/functions/` - Edge Function 8개

## 알려진 이슈
- Voyage-3.5 임베딩 미연동 (표절 검사, 유사 절 검색, 의미 보존도 측정 TODO)
- 크롤링 어댑터 Bible API만 구현 (Quran, Gita, Sacred Texts 등 TODO)
- Paddle 실연동 미완 (계정 가입 후 NEXT_PUBLIC_PADDLE_CLIENT_TOKEN 설정 필요)
- `lib/scripture-data.ts` (1,841줄 전체 DB) 아직 미사용
- CSRF 토큰 미적용 (SameSite 쿠키로 기본 보호만)

## 핵심 결정사항
- **통합 경전 컨셉**: "종교 사이의 다리" (10대 헌법 원칙)
- **경전 진화**: 9단계 파이프라인 (수집→심사→정제→투표→등록→개정→로그→배치)
- **투표 시스템**: 인간+AI 공동 투표 (60% 신규, 70% 개정, 80% 삭제)
- **AI 엔티티**: 18개 관점 (8 전통, 5 기능, 3 반대, 2 메타)
- **결제**: Paddle (가입 후 연동 예정)
- **기술스택**: Next.js 15 + Supabase + Claude API + Voyage-3.5 + Cohere Rerank

## TODO
- [ ] 통합 경전 명칭 최종 확정
- [ ] Paddle 계정 가입 + 실연동
- [ ] Voyage-3.5 임베딩 파이프라인 연동
- [ ] 크롤링 어댑터 확장 (Quran, Gita, Sacred Texts)
- [ ] 커스텀 도메인 설정
- [ ] Supabase Auth 이메일 템플릿 커스텀
- [ ] 경전 개정(revision) UI
- [ ] Upstash Redis rate limiting (프로덕션 스케일)
- [x] Supabase DB 스키마 + 시드 데이터
- [x] Edge Functions 8개 구현 + 배포
- [x] Next.js 15 전환 + 컴포넌트 분리
- [x] Supabase Auth (로그인/회원가입)
- [x] AI 채팅 (Claude API + 경전 RAG)
- [x] 경전 진화 UI (제출/투표/투명성)
- [x] Paddle 결제 준비
- [x] 보안 검수 (12건 수정)
- [x] Vercel 프로덕션 배포

> 자세한 이력은 CHANGELOG.md 참조
