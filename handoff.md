# Handoff

## 현재 상태
- **단계**: 베타 배포 완료
- **프로덕션 URL**: https://beyondr.vercel.app
- **GitHub**: https://github.com/plan-um/beyondr
- **브랜치**: main
- **Next.js**: 15.5.12 (App Router, Turbopack)
- **빌드**: 26페이지 (17 static + 9 dynamic), 0 에러
- **Supabase**: qolnmdnmfcxxfuigiser, Edge Functions 8개 배포, ANTHROPIC_API_KEY + VOYAGE_API_KEY 등록 완료
- **Vercel 환경변수**: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY
- **Google OAuth**: 활성화 (beyondr-app 프로젝트, Supabase Auth provider 연동)
- **DB 콘텐츠**: scripture_chunks 1,247건 (임베딩 100%, 상담 태깅 100%)
- **DB 테이블**: user_preferences 추가 (language, theme, font_size per user)

## 최근 작업
### 2026-02-14: 경전 콘텐츠 전면 개편 + 사용자별 설정 저장
**경전 콘텐츠 리라이팅 (5장 59절)**
- ✅ 5개 챕터 전체 내러티브 연결 (각 절이 다음 절로 자연스럽게 이어짐)
- ✅ 한국어 비문 전면 수정: 해요체 통일, 번역체 제거, 자연스러운 구어체
- ✅ 영어 문법/스타일 개선: 능동태, 짧은 문장, 대화체
- ✅ scripture-data.ts (59절) + scripture-verses.ts (37절 fallback) 동기화
- ✅ 챕터별 4부 서사 구조: 도입→전개→심화→마무리
- 변경 파일: `lib/scripture-data.ts`, `lib/scripture-verses.ts`

**사용자별 설정 저장 (언어, 테마, 폰트 크기)**
- ✅ Supabase `user_preferences` 테이블 생성 (RLS 정책 3개)
- ✅ `/api/preferences` GET/PUT 엔드포인트 (인증 + 유효성 검사 + upsert)
- ✅ PreferencesSync 컴포넌트: 로그인 시 서버↔클라이언트 양방향 동기화
- ✅ 디바운스 저장 (500ms), 비로그인 시 localStorage 폴백 (`beyondr-preferences`)
- ✅ i18n.tsx: localStorage에서 언어 설정 읽기/저장
- ✅ use-scripture-settings.ts: 통합 프리퍼런스 키 사용 + 서버 저장
- 신규 파일: `supabase/migrations/20260214000000_user_preferences.sql`, `app/api/preferences/route.ts`, `components/preferences-sync.tsx`
- 변경 파일: `lib/i18n.tsx`, `lib/use-scripture-settings.ts`, `app/layout-content.tsx`

### 2026-02-12: Scriptures Public API 추가
- ✅ `/api/scriptures` GET 엔드포인트, 테마/전통/검색 필터, 캐시 헤더
- 신규 파일: `app/api/scriptures/route.ts`

### 2026-02-12: 경전 전체 브라우저 + 폰트 크기 조절
- ✅ 인라인 표시, 키워드 검색, 5단계 폰트 크기, 단일 언어 표시, Lora 세리프

### 이전 작업
- Google OAuth 로그인 (2026-02-11)
- 콘텐츠 파이프라인 실행 완료 (1,247건 임포트+임베딩+태깅)
- 풀스택 베타 구축 + 배포

### 주요 파일
- `app/` - 22페이지 (auth, chat, evolution, payment, scriptures 등)
- `app/api/` - API 라우트 8개 (chat, embeddings, import, curate, preferences, scriptures, submissions, voting, audit)
- `components/` - auth, layout, scripture, ui (14개 shadcn/ui), preferences-sync
- `lib/` - i18n, auth-context, paddle, rate-limit, supabase, scripture, voyage, counseling-scenarios, use-scripture-settings
- `middleware.ts` - Supabase Auth 미들웨어
- `supabase/functions/` - Edge Function 8개

## 알려진 이슈
- VOYAGE_API_KEY 결제수단 미등록 (3 RPM / 10K TPM 제한, voyageai.com 빌링 설정 필요)
- Paddle 실연동 미완 (계정 가입 후 NEXT_PUBLIC_PADDLE_CLIENT_TOKEN 설정 필요)
- crawl full 모드: Edge Function 타임아웃으로 실행 불가 (장시간 워커 필요)
- CSRF 토큰 미적용 (SameSite 쿠키로 기본 보호만)

## 핵심 결정사항
- **통합 경전 컨셉**: "종교 사이의 다리" (10대 헌법 원칙)
- **경전 진화**: 9단계 파이프라인 (수집→심사→정제→투표→등록→개정→로그→배치)
- **투표 시스템**: 인간+AI 공동 투표 (60% 신규, 70% 개정, 80% 삭제)
- **AI 엔티티**: 18개 관점 (8 전통, 5 기능, 3 반대, 2 메타)
- **결제**: Paddle (가입 후 연동 예정)
- **기술스택**: Next.js 15 + Supabase + Claude API + Voyage-3.5 + Cohere Rerank

## TODO
- [x] 콘텐츠 확장 실행: ① DB 마이그레이션 ② 1,247건 임포트 ③ 임베딩 1,247건 ④ 상담 태깅 1,247건
- [x] 경전 콘텐츠 리라이팅 (5장 59절 내러티브 연결 + 비문 수정)
- [x] 사용자별 설정 저장 (언어, 테마, 폰트 크기 per user ID)
- [ ] crawl full 모드 실행 (Edge Function 타임아웃 대안 필요)
- [x] Vercel에 VOYAGE_API_KEY 환경변수 추가
- [x] 경전 전체 브라우저 (인라인 표시 + 검색 + 필터 + 폰트 크기 + 단일 언어)
- [ ] 통합 경전 명칭 최종 확정
- [ ] Paddle 계정 가입 + 실연동
- [x] Voyage-3.5 임베딩 파이프라인 연동 (VOYAGE_API_KEY 설정 시 활성화)
- [x] 크롤링 어댑터 확장 (Bible + Quran + Gita + Sacred Texts + Gutenberg)
- [x] 경전 콘텐츠 3Phase 구현 (임포트 API + 전체 수집 모드 + AI 큐레이션)
- [ ] 커스텀 도메인 설정
- [ ] Supabase Auth 이메일 템플릿 커스텀
- [ ] 경전 개정(revision) UI
- [ ] Upstash Redis rate limiting (프로덕션 스케일)
- [x] Supabase DB 스키마 + 시드 데이터
- [x] Edge Functions 8개 구현 + 배포
- [x] Next.js 15 전환 + 컴포넌트 분리
- [x] Google OAuth 로그인 (Google Cloud + Supabase Auth 연동)
- [x] Supabase Auth (로그인/회원가입)
- [x] AI 채팅 (Claude API + 경전 RAG)
- [x] 경전 진화 UI (제출/투표/투명성)
- [x] Paddle 결제 준비
- [x] 보안 검수 (12건 수정)
- [x] Vercel 프로덕션 배포

> 자세한 이력은 CHANGELOG.md 참조
