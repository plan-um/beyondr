# Handoff

## 현재 상태
- **단계**: 베타 배포 완료
- **프로덕션 URL**: https://beyondr.vercel.app
- **GitHub**: https://github.com/plan-um/beyondr
- **브랜치**: main
- **Next.js**: 15.5.12 (App Router, Turbopack)
- **빌드**: 25페이지 (17 static + 8 dynamic), 0 에러
- **Supabase**: qolnmdnmfcxxfuigiser, Edge Functions 8개 배포, ANTHROPIC_API_KEY + VOYAGE_API_KEY 등록 완료
- **Vercel 환경변수**: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY
- **Google OAuth**: 활성화 (beyondr-app 프로젝트, Supabase Auth provider 연동)
- **DB 콘텐츠**: scripture_chunks 1,247건 (임베딩 100%, 상담 태깅 100%)

## 최근 작업
### 2026-02-12: Scriptures Public API 추가
- ✅ `/api/scriptures` GET 엔드포인트 생성: DB에서 전체 scripture_chunks 조회
- ✅ 테마별 구조화 응답: canonical (founding) + extended 분리
- ✅ 검색 필터: `?search=keyword` (text_ko, text_en 대상 case-insensitive)
- ✅ 테마 필터: `?theme=awakening|suffering|love|life_death|practice`
- ✅ 전통 필터: `?tradition=Buddhism|Christianity|...` (traditions 배열 검색)
- ✅ 캐시 헤더: 5분 s-maxage + 10분 stale-while-revalidate
- ✅ Fallback: Supabase 장애 시 정적 데이터 반환 (`lib/scripture-verses`)
- ✅ 인증 불필요: Public API (service role client 사용)
- ✅ 테스트 완료: 모든 필터 조합 (한글/영어 검색 포함)
- 신규 파일: `app/api/scriptures/route.ts`

### 2026-02-12: 경전 전체 브라우저 + 폰트 크기 조절
- ✅ 경전 페이지 전면 개편: 37절 전체를 한 페이지에 인라인 표시 (카드→상세 네비게이션 불필요)
- ✅ 키워드 검색: 구절 텍스트 + 장 제목 대상 전문 검색
- ✅ 주제별 필터: 깨어남, 고통, 사랑, 삶과죽음, 수행 (6개 칩)
- ✅ 전통별 필터: 불교, 기독교, 이슬람 등 16개 전통 드롭다운
- ✅ 언어 전용 표시: 선택 언어(EN/KO)만 표시, 이중 언어 제거
- ✅ 5단계 폰트 크기 조절 (XS/S/M/L/XL, localStorage 저장)
- ✅ Lora 세리프 폰트 적용 (경전 읽기 경험 향상)
- ✅ 스티키 툴바: 검색 + 필터 + 폰트 크기 컨트롤
- ✅ 상세 페이지도 동일 적용 (단일 언어 + 폰트 크기)
- ✅ 무료 요금제 전체 경전 접근 가능 (인증 불필요)
- 변경 파일: `app/scriptures/page.tsx`, `app/scriptures/[id]/page.tsx`, `lib/i18n.tsx`
- 신규 파일: `components/scripture/font-size-control.tsx`, `lib/use-scripture-settings.ts`

### 2026-02-11: Google OAuth 로그인 추가
- ✅ Google Cloud 프로젝트 `beyondr-app` 생성 (project #1072091898732)
- ✅ OAuth 2.0 클라이언트 생성 (Client ID: `1072091898732-simfjagjc09h064s867i7bri3dvukdlf`)
- ✅ Supabase Auth에 Google provider 설정 (`config push` 완료)
- ✅ Supabase secrets: `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` 등록
- ✅ 로그인/회원가입 페이지에 "Google로 로그인" 버튼 추가 (i18n 한/영)
- ✅ 프로덕션 배포 확인: 버튼 표시 + Google 리다이렉트 정상
- ⏳ 일반 브라우저에서 E2E 테스트 필요 (자동화 브라우저는 Google이 차단)
- 변경 파일: `app/auth/login/page.tsx`, `app/auth/signup/page.tsx`, `app/auth/callback/route.ts`, `supabase/config.toml`
- Google Cloud redirect URI: `https://qolnmdnmfcxxfuigiser.supabase.co/auth/v1/callback`

### 2026-02-11: 콘텐츠 파이프라인 실행 완료
**실행 결과**
- ✅ DB 마이그레이션: metadata JSONB + GIN 인덱스 + match_scripture_chunks RPC 업데이트
- ✅ 벌크 임포트: 1,069 서재 + 119 관련인용구 + 59 기존경전 = **1,247건** → scripture_chunks
- ✅ Voyage-3.5 임베딩: 1,247건 전체 생성 (1024차원, rate limit 대응 로직 추가)
- ✅ 상담 태깅: 1,247건 전체 Claude Haiku 태깅 (8개 시나리오, emotional_tone, when_to_use)
- ✅ 시맨틱 검색 E2E 테스트 통과 (threshold=0.2, 유사도 0.46~0.47)

**크롤링 전체 수집 모드 (코드 완성, 실행 보류)**
- Edge Function 타임아웃(60s)으로 full 모드 실행 불가
- 대안 필요: 장시간 실행 워커 또는 로컬 스크립트

### 이전: 경전 콘텐츠 3Phase 코드 구현
**Phase 1** — `/api/import`: library-quotes + relatedQuotes 벌크 임포트 API
**Phase 2** — crawl Edge Function: full 모드, Gutenberg 어댑터, 3차원 품질 필터
**Phase 3** — `/api/curate` + `lib/counseling-scenarios.ts`: 8개 시나리오 태깅

### 이전: Voyage-3.5 임베딩 + 크롤링 어댑터 확장
- **Voyage-3.5 임베딩**: lib/voyage.ts (1024차원), /api/embeddings 라우트, match_scripture_chunks RPC
- **채팅 시맨틱 검색**: 3단계 전략 (semantic → keyword → inline fallback)
- **표절 검사**: screening Edge Function에 임베딩 유사도 기반 검출 (>0.95 표절, >0.85 경고)
- **의미 보존도 측정**: refinement Edge Function에 코사인 유사도 (<0.90 시 플래그)
- **크롤링 4개 어댑터**: Bible + Quran (alquran.cloud) + Gita + Sacred Texts (도교/불교/스토아/수피)
- **공유 파이프라인**: SHA-256 중복방지 + AI 품질 필터 + 임베딩 생성
- **VOYAGE_API_KEY 미설정 시 graceful degradation** (키워드 검색으로 폴백)

### 이전: 풀스택 베타 구축 + 배포
- Auth, AI 채팅 (4 페르소나), 경전 진화 UI, Paddle 플레이스홀더, 보안 12건 수정

### 이전 작업
- Next.js 15 전환: 1,543줄 SPA → 22페이지 App Router
- Edge Functions 8개 (4,323줄), DB 21개 테이블 (1,223줄), 시드 데이터 4개
- 서재 500권 스캔, 1,069개 인용구, 5장 59절 경전

### 주요 파일
- `app/` - 22페이지 (auth, chat, evolution, payment, scriptures 등)
- `app/api/` - API 라우트 7개 (chat, embeddings, import, curate, submissions, voting, audit)
- `components/` - auth, layout, scripture, ui (14개 shadcn/ui)
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
