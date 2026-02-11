-- ============================================================================
-- 카테고리 시드 데이터
-- ============================================================================
-- 비욘더 Living Scripture Evolution System의 계층적 카테고리
-- Depth 0: 주제 (Themes) - governance_level='constitutional'
-- Depth 1: 하위 주제 (Subtopics) - governance_level='council'
-- ============================================================================

-- UUID 확장 활성화

-- 기존 카테고리 임시 저장을 위한 CTE 활용
WITH theme_inserts AS (
  -- Depth 0: 주제 (Themes)
  INSERT INTO categories (
    id,
    name_ko,
    name_en,
    description_ko,
    description_en,
    parent_id,
    depth,
    governance_level,
    created_at,
    updated_at
  ) VALUES
    -- 1. 깨어남
    (
      gen_random_uuid(),
      '깨어남',
      'Awakening',
      '의식, 자각, 깨달음 관련',
      'Related to consciousness, awareness, and enlightenment',
      NULL,
      0,
      'constitutional',
      NOW(),
      NOW()
    ),

    -- 2. 고통과 치유
    (
      gen_random_uuid(),
      '고통과 치유',
      'Suffering & Healing',
      '슬픔, 회복력, 변환 관련',
      'Related to grief, resilience, and transformation',
      NULL,
      0,
      'constitutional',
      NOW(),
      NOW()
    ),

    -- 3. 사랑과 연결
    (
      gen_random_uuid(),
      '사랑과 연결',
      'Love & Connection',
      '자비, 용서, 관계 관련',
      'Related to compassion, forgiveness, and relationships',
      NULL,
      0,
      'constitutional',
      NOW(),
      NOW()
    ),

    -- 4. 삶과 죽음
    (
      gen_random_uuid(),
      '삶과 죽음',
      'Life & Death',
      '생사, 무상, 변화 관련',
      'Related to life, death, impermanence, and change',
      NULL,
      0,
      'constitutional',
      NOW(),
      NOW()
    ),

    -- 5. 고요와 수행
    (
      gen_random_uuid(),
      '고요와 수행',
      'Stillness & Practice',
      '명상, 수행, 내면 관련',
      'Related to meditation, practice, and inner work',
      NULL,
      0,
      'constitutional',
      NOW(),
      NOW()
    )
  ON CONFLICT (name_en, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::UUID))
  DO UPDATE SET updated_at = NOW()
  RETURNING id, name_ko, name_en
)

-- Depth 1: 하위 주제 (Subtopics)
, subtopic_inserts AS (
  INSERT INTO categories (
    id,
    name_ko,
    name_en,
    description_ko,
    description_en,
    parent_id,
    depth,
    governance_level,
    created_at,
    updated_at
  )
  SELECT
    gen_random_uuid(),
    sub.name_ko,
    sub.name_en,
    sub.description_ko,
    sub.description_en,
    t.id,
    1,
    'council',
    NOW(),
    NOW()
  FROM theme_inserts t
  CROSS JOIN LATERAL (
    VALUES
      -- 깨어남 하위
      ('의식', 'Consciousness', '의식의 본성과 확장', 'Nature and expansion of consciousness'),
      ('명상', 'Meditation', '명상과 마음챙김 수행', 'Meditation and mindfulness practice'),
      ('자기탐구', 'Self-Inquiry', '자아의 탐구와 깨달음', 'Exploration of self and realization')
  ) AS sub(name_ko, name_en, description_ko, description_en)
  WHERE t.name_ko = '깨어남'

  UNION ALL

  SELECT
    gen_random_uuid(),
    sub.name_ko,
    sub.name_en,
    sub.description_ko,
    sub.description_en,
    t.id,
    1,
    'council',
    NOW(),
    NOW()
  FROM theme_inserts t
  CROSS JOIN LATERAL (
    VALUES
      -- 고통과 치유 하위
      ('슬픔', 'Grief', '상실과 슬픔의 과정', 'Process of loss and grief'),
      ('회복력', 'Resilience', '역경과 회복의 힘', 'Strength in adversity and recovery'),
      ('무상', 'Impermanence', '변화와 무상의 이해', 'Understanding change and impermanence')
  ) AS sub(name_ko, name_en, description_ko, description_en)
  WHERE t.name_ko = '고통과 치유'

  UNION ALL

  SELECT
    gen_random_uuid(),
    sub.name_ko,
    sub.name_en,
    sub.description_ko,
    sub.description_en,
    t.id,
    1,
    'council',
    NOW(),
    NOW()
  FROM theme_inserts t
  CROSS JOIN LATERAL (
    VALUES
      -- 사랑과 연결 하위
      ('자비', 'Compassion', '자비와 연민의 실천', 'Practice of compassion and empathy'),
      ('용서', 'Forgiveness', '용서와 화해의 길', 'Path of forgiveness and reconciliation'),
      ('봉사', 'Service', '이타적 봉사와 나눔', 'Altruistic service and giving')
  ) AS sub(name_ko, name_en, description_ko, description_en)
  WHERE t.name_ko = '사랑과 연결'

  UNION ALL

  SELECT
    gen_random_uuid(),
    sub.name_ko,
    sub.name_en,
    sub.description_ko,
    sub.description_en,
    t.id,
    1,
    'council',
    NOW(),
    NOW()
  FROM theme_inserts t
  CROSS JOIN LATERAL (
    VALUES
      -- 삶과 죽음 하위
      ('죽음', 'Death', '죽음과 초월에 대한 이해', 'Understanding death and transcendence'),
      ('환생', 'Rebirth/Transformation', '재탄생과 변화의 과정', 'Process of rebirth and transformation'),
      ('무상함', 'Transience', '덧없음과 순간의 가치', 'Transience and value of the moment')
  ) AS sub(name_ko, name_en, description_ko, description_en)
  WHERE t.name_ko = '삶과 죽음'

  UNION ALL

  SELECT
    gen_random_uuid(),
    sub.name_ko,
    sub.name_en,
    sub.description_ko,
    sub.description_en,
    t.id,
    1,
    'council',
    NOW(),
    NOW()
  FROM theme_inserts t
  CROSS JOIN LATERAL (
    VALUES
      -- 고요와 수행 하위
      ('기도', 'Prayer', '기도와 명상의 실천', 'Practice of prayer and contemplation'),
      ('명상수행', 'Meditation Practice', '체계적 명상 훈련', 'Systematic meditation training'),
      ('일상수행', 'Daily Practice', '일상 속 영적 실천', 'Spiritual practice in daily life')
  ) AS sub(name_ko, name_en, description_ko, description_en)
  WHERE t.name_ko = '고요와 수행'

  ON CONFLICT (name_en, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::UUID))
  DO UPDATE SET updated_at = NOW()
  RETURNING id, name_ko, name_en, parent_id
)

-- 결과 출력
SELECT
  (SELECT COUNT(*) FROM categories WHERE depth = 0) AS theme_count,
  (SELECT COUNT(*) FROM categories WHERE depth = 1) AS subtopic_count,
  (SELECT COUNT(*) FROM categories) AS total_count;

-- 최종 확인 메시지
DO $$
DECLARE
  theme_count INTEGER;
  subtopic_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO theme_count FROM categories WHERE depth = 0;
  SELECT COUNT(*) INTO subtopic_count FROM categories WHERE depth = 1;
  RAISE NOTICE '카테고리 적재 완료: 주제 % 개, 하위주제 % 개 (총 % 개)',
    theme_count, subtopic_count, theme_count + subtopic_count;
END $$;
