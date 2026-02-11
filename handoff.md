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
- **DB 콘텐츠**: scripture_chunks 1,247건 (임베딩 100%, 상담 태깅 100%)

## 최근 작업
### 2026-02-11: 콘텐츠 파이프라인 실행 완료
**실행 결과**
- ✅ DB 마이그레이션: metadata JSONB + GIN 인덱스 + match_scripture_chunks RPC 업데이트
- ✅ 벌크 임포트: 1,069 서재 + 119 관련인용구 + 59 기존경전 = **1,247건** → scripture_chunks
- ✅ Voyage-3.5 임베딩: 1,247건 전체 생성 (1024차원, rate limit 대응 로직 추가)
- ✅ 상담 태깅: 1,247건 전체 Claude Haiku 태깅 (8개 시나리오, emotional_tone, when_to_use)
- ✅ 시맨틱 검색 E2E 테스트 통과 (threshold=0.2, 유사도 0.46~0.47)
- Supabase 시크릿 수정: ANTHROPIC_API_KEY 재설정 (빈 값 → 실제 키), VOYAGE_API_KEY 추가
- middleware.ts: API 라우트 쿠키 인증 바이패스 (`/api/` 퍼블릭 경로 추가)
- API 라우트 Bearer 토큰 인증 추가: embeddings, curate
- voyage.ts rate limit 대응: 429 재시도 + 배치간 22초 딜레이

**크롤링 전체 수집 모드 (코드 완성, 실행 보류)**
- Edge Function 타임아웃(60s)으로 full 모드 실행 불가
- sample 모드로 ~54건 crawled_content 추가 확인
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
- `components/` - auth, layout, ui (14개 shadcn/ui)
- `lib/` - i18n, auth-context, paddle, rate-limit, supabase, scripture, voyage, counseling-scenarios
- `middleware.ts` - Supabase Auth 미들웨어
- `supabase/functions/` - Edge Function 8개

## 알려진 이슈
- VOYAGE_API_KEY 결제수단 미등록 (3 RPM / 10K TPM 제한, voyageai.com 빌링 설정 필요)
- Vercel 환경변수에 VOYAGE_API_KEY 미설정 (프로덕션 시맨틱 검색 활성화 필요)
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
- [x] Supabase Auth (로그인/회원가입)
- [x] AI 채팅 (Claude API + 경전 RAG)
- [x] 경전 진화 UI (제출/투표/투명성)
- [x] Paddle 결제 준비
- [x] 보안 검수 (12건 수정)
- [x] Vercel 프로덕션 배포

> 자세한 이력은 CHANGELOG.md 참조
