-- ============================================================================
-- 크롤링 소스 시드 데이터
-- ============================================================================
-- 비욘더 Living Scripture Evolution System의 초기 데이터 소스
-- API, 웹 데이터셋, 학술 자료, 기존 서재 등
-- ============================================================================

-- UUID 확장 활성화

-- 크롤링 소스 삽입
INSERT INTO crawl_sources (
  id,
  name,
  source_type,
  url,
  copyright_status,
  api_config,
  schedule_cron,
  is_active,
  created_at,
  updated_at
) VALUES
  -- 1. Bible API (성경)
  (
    gen_random_uuid(),
    'Bible API',
    'religious_api',
    'https://bible-api.com',
    'public_domain',
    jsonb_build_object(
      'api_type', 'REST',
      'format', 'JSON',
      'translation', 'KJV',
      'estimated_verses', 31000,
      'rate_limit', 'none',
      'auth_required', false,
      'notes', 'King James Version (1611) - Public Domain'
    ),
    'weekly',
    TRUE,
    NOW(),
    NOW()
  ),

  -- 2. Quran Cloud API (코란)
  (
    gen_random_uuid(),
    'Quran Cloud API',
    'religious_api',
    'https://api.alquran.cloud',
    'public_domain',
    jsonb_build_object(
      'api_type', 'REST',
      'format', 'JSON',
      'translation', 'Pickthall',
      'estimated_verses', 6236,
      'rate_limit', '1000/hour',
      'auth_required', false,
      'notes', 'Pickthall translation (1930) - Public Domain'
    ),
    'weekly',
    TRUE,
    NOW(),
    NOW()
  ),

  -- 3. Bhagavad Gita API (바가바드 기타)
  (
    gen_random_uuid(),
    'Bhagavad Gita API',
    'religious_api',
    'https://bhagavadgitaapi.in',
    'public_domain',
    jsonb_build_object(
      'api_type', 'REST',
      'format', 'JSON',
      'translation', 'multiple',
      'estimated_verses', 700,
      'rate_limit', 'none',
      'auth_required', false,
      'notes', 'Multiple translations available'
    ),
    'weekly',
    TRUE,
    NOW(),
    NOW()
  ),

  -- 4. Sacred Texts Archive (종교 고전 아카이브)
  (
    gen_random_uuid(),
    'Sacred Texts Archive',
    'web_dataset',
    'https://sacred-texts.com',
    'public_domain',
    jsonb_build_object(
      'crawl_type', 'Scrapy',
      'format', 'HTML',
      'targets', jsonb_build_array(
        'Buddhism (Dhammapada, Pali Canon selections)',
        'Hinduism (Upanishads, Yoga Sutras)',
        'Taoism (Tao Te Ching, Zhuangzi)',
        'Confucianism (Analects, Mencius)'
      ),
      'estimated_texts', 40,
      'rate_limit', 'polite_crawl',
      'notes', 'Pre-1930 translations only for public domain safety'
    ),
    'weekly',
    TRUE,
    NOW(),
    NOW()
  ),

  -- 5. Project Gutenberg (철학/영성 고전)
  (
    gen_random_uuid(),
    'Project Gutenberg',
    'web_dataset',
    'https://www.gutenberg.org',
    'public_domain',
    jsonb_build_object(
      'api_type', 'Gutendex API',
      'format', 'TXT/HTML',
      'targets', jsonb_build_array(
        'Plato dialogues',
        'Marcus Aurelius Meditations',
        'Epictetus Enchiridion',
        'Seneca Letters',
        'Confucius Analects',
        'Lao Tzu Tao Te Ching'
      ),
      'estimated_texts', 20,
      'rate_limit', 'none',
      'notes', 'All works pre-1928, confirmed public domain'
    ),
    'weekly',
    TRUE,
    NOW(),
    NOW()
  ),

  -- 6. Stanford Encyclopedia of Philosophy (철학 백과)
  (
    gen_random_uuid(),
    'Stanford Encyclopedia of Philosophy',
    'academic',
    'https://plato.stanford.edu',
    'cc_by_nc',
    jsonb_build_object(
      'crawl_type', 'targeted_scraping',
      'format', 'HTML',
      'license', 'CC BY-NC 4.0',
      'targets', jsonb_build_array(
        'Ethics articles',
        'Philosophy of religion',
        'Metaphysics',
        'Eastern philosophy'
      ),
      'estimated_articles', 50,
      'rate_limit', 'polite_crawl',
      'usage_restriction', 'non_commercial_only_in_beta',
      'notes', 'Must review commercial licensing before public launch'
    ),
    'weekly',
    TRUE,
    NOW(),
    NOW()
  ),

  -- 7. 기존 서재 500권 (수동 추가)
  (
    gen_random_uuid(),
    '기존 서재 500권',
    'modern_spiritual',
    NULL, -- 수동 추가이므로 URL 없음
    'manual_review',
    jsonb_build_object(
      'source_type', 'personal_collection',
      'estimated_books', 500,
      'categories', jsonb_build_array(
        'Modern spiritual writings',
        'Contemporary philosophy',
        'Interfaith dialogue',
        'Mindfulness and psychology'
      ),
      'copyright_status', 'requires_individual_review',
      'priority', 'phase_2',
      'notes', 'Each book requires copyright verification before inclusion. Authors: Thich Nhat Hanh, Rumi (Coleman Barks translation), Eckhart Tolle, etc. Focus on public domain or explicitly licensed works for MVP.'
    ),
    'weekly',
    FALSE, -- 초기에는 비활성, 수동 검토 후 활성화
    NOW(),
    NOW()
  )
ON CONFLICT (name) DO UPDATE SET
  url = EXCLUDED.url,
  api_config = EXCLUDED.api_config,
  updated_at = NOW();

-- 삽입된 행 수 확인
DO $$
DECLARE
  api_count INTEGER;
  web_count INTEGER;
  academic_count INTEGER;
  modern_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO api_count FROM crawl_sources WHERE source_type = 'religious_api';
  SELECT COUNT(*) INTO web_count FROM crawl_sources WHERE source_type = 'web_dataset';
  SELECT COUNT(*) INTO academic_count FROM crawl_sources WHERE source_type = 'academic';
  SELECT COUNT(*) INTO modern_count FROM crawl_sources WHERE source_type = 'modern_spiritual';

  RAISE NOTICE '크롤링 소스 적재 완료: API % 개, 웹 데이터셋 % 개, 학술 % 개, 현대영성 % 개 (총 % 개)',
    api_count, web_count, academic_count, modern_count,
    api_count + web_count + academic_count + modern_count;
END $$;
