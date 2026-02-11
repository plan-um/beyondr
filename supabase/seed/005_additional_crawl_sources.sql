-- ============================================================================
-- 추가 크롤링 소스 시드 데이터 (보강)
-- ============================================================================
-- 004_crawl_sources.sql에 이미 Quran, Gita, Sacred Texts 소스가 존재하므로
-- 이 파일은 crawl adapter 매칭에 필요한 api_config를 UPDATE로 보강한다.
-- INSERT는 WHERE NOT EXISTS 패턴으로 멱등성을 보장한다.
-- ============================================================================

-- 1. Quran Cloud API: Sahih International 번역으로 api_config 갱신
UPDATE crawl_sources
SET
  url = 'https://api.alquran.cloud/v1/',
  api_config = jsonb_build_object(
    'api_type', 'REST',
    'format', 'JSON',
    'translation', 'en.sahih',
    'estimated_verses', 6236,
    'rate_limit', '1000/hour',
    'auth_required', false,
    'notes', 'Sahih International translation - Public Domain'
  ),
  updated_at = NOW()
WHERE name = 'Quran Cloud API';

-- 만약 존재하지 않으면 삽입
INSERT INTO crawl_sources (
  id, name, source_type, url, copyright_status, api_config,
  schedule_cron, is_active, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  'Quran Cloud API',
  'religious_api',
  'https://api.alquran.cloud/v1/',
  'public_domain',
  jsonb_build_object(
    'api_type', 'REST',
    'format', 'JSON',
    'translation', 'en.sahih',
    'estimated_verses', 6236,
    'rate_limit', '1000/hour',
    'auth_required', false,
    'notes', 'Sahih International translation - Public Domain'
  ),
  'weekly',
  TRUE,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM crawl_sources WHERE name = 'Quran Cloud API'
);

-- 2. Bhagavad Gita API: curated + API fallback 설정 갱신
UPDATE crawl_sources
SET
  url = 'https://vedicscriptures.github.io/',
  api_config = jsonb_build_object(
    'api_type', 'REST',
    'format', 'JSON',
    'source', 'curated_with_api_fallback',
    'estimated_verses', 700,
    'rate_limit', 'none',
    'auth_required', false,
    'notes', 'Curated public domain translations with Vedic Scriptures API fallback'
  ),
  updated_at = NOW()
WHERE name = 'Bhagavad Gita API';

INSERT INTO crawl_sources (
  id, name, source_type, url, copyright_status, api_config,
  schedule_cron, is_active, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  'Bhagavad Gita API',
  'religious_api',
  'https://vedicscriptures.github.io/',
  'public_domain',
  jsonb_build_object(
    'api_type', 'REST',
    'format', 'JSON',
    'source', 'curated_with_api_fallback',
    'estimated_verses', 700,
    'rate_limit', 'none',
    'auth_required', false,
    'notes', 'Curated public domain translations with Vedic Scriptures API fallback'
  ),
  'weekly',
  TRUE,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM crawl_sources WHERE name = 'Bhagavad Gita API'
);

-- 3. Sacred Texts Archive: 큐레이션 컬렉션 (도교, 불교, 스토아, 수피) 설정 갱신
UPDATE crawl_sources
SET
  api_config = jsonb_build_object(
    'crawl_type', 'curated_collection',
    'format', 'inline',
    'traditions', jsonb_build_array('Taoism', 'Buddhism', 'Stoicism', 'Sufism'),
    'estimated_texts', 13,
    'rate_limit', 'none',
    'notes', 'Curated public domain wisdom from Lao Tzu, Dhammapada, Marcus Aurelius, Epictetus, Rumi. All pre-1930 or public domain.'
  ),
  updated_at = NOW()
WHERE name = 'Sacred Texts Archive';

INSERT INTO crawl_sources (
  id, name, source_type, url, copyright_status, api_config,
  schedule_cron, is_active, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  'Sacred Texts Archive',
  'web_dataset',
  'https://sacred-texts.com',
  'public_domain',
  jsonb_build_object(
    'crawl_type', 'curated_collection',
    'format', 'inline',
    'traditions', jsonb_build_array('Taoism', 'Buddhism', 'Stoicism', 'Sufism'),
    'estimated_texts', 13,
    'rate_limit', 'none',
    'notes', 'Curated public domain wisdom from Lao Tzu, Dhammapada, Marcus Aurelius, Epictetus, Rumi. All pre-1930 or public domain.'
  ),
  'weekly',
  TRUE,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM crawl_sources WHERE name = 'Sacred Texts Archive'
);
