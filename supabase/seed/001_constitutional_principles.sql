-- ============================================================================
-- 헌법 원칙 시드 데이터
-- ============================================================================
-- 비욘더 Living Scripture Evolution System의 10대 헌법 원칙
-- 우선순위 1 (최고) ~ 10 (최저)
-- 가중치는 역비례 정규화: (11 - priority) / 55
-- ============================================================================

-- UUID 확장 활성화 (이미 활성화되어 있으면 무시됨)

-- 헌법 원칙 데이터 삽입 (멱등성 보장)
INSERT INTO constitutional_principles (
  priority,
  code,
  name_ko,
  name_en,
  description_ko,
  description_en,
  weight,
  created_at,
  updated_at
) VALUES
  -- 1. 안전 (최우선)
  (
    1,
    'SAFETY',
    '안전',
    'Safety',
    '폭력, 자해, 착취를 조장하지 않을 것',
    'Must not promote violence, self-harm, or exploitation',
    0.1818,
    NOW(),
    NOW()
  ),

  -- 2. 보편 인류애
  (
    2,
    'UNIVERSAL_HUMANITY',
    '보편 인류애',
    'Universal Humanity',
    '특정 종파 배타성이 아닌 공유된 인류 가치 반영',
    'Reflect shared human values, not sectarian exclusivity',
    0.1636,
    NOW(),
    NOW()
  ),

  -- 3. 합리성
  (
    3,
    'RATIONALITY',
    '합리성',
    'Rationality',
    '논리적으로 일관될 것, 불가능한 것을 믿으라고 강요하지 않을 것',
    'Be logically consistent; never demand belief in the impossible',
    0.1455,
    NOW(),
    NOW()
  ),

  -- 4. 도덕성
  (
    4,
    'MORALITY',
    '도덕성',
    'Morality',
    '윤리적 행동과 양심을 고양할 것',
    'Uplift ethical behavior and conscience',
    0.1273,
    NOW(),
    NOW()
  ),

  -- 5. 양심
  (
    5,
    'CONSCIENCE',
    '양심',
    'Conscience',
    '개인의 사상과 양심의 자유를 존중할 것',
    'Respect individual freedom of thought and conscience',
    0.1091,
    NOW(),
    NOW()
  ),

  -- 6. 지혜
  (
    6,
    'WISDOM',
    '지혜',
    'Wisdom',
    '진정한 통찰을 제공할 것, 상투적 표현이나 선전이 아닌',
    'Offer genuine insight, not platitudes or propaganda',
    0.0909,
    NOW(),
    NOW()
  ),

  -- 7. 과학적 정합성
  (
    7,
    'SCIENTIFIC',
    '과학적 정합성',
    'Scientific Consistency',
    '확립된 과학적 합의와 모순되지 않을 것',
    'Must not contradict established scientific consensus',
    0.0727,
    NOW(),
    NOW()
  ),

  -- 8. 원전 존중
  (
    8,
    'SOURCE_RESPECT',
    '원전 존중',
    'Source Respect',
    '지혜의 출처 전통을 존중하고 밝힐 것',
    'Respect and credit the source tradition of wisdom',
    0.0545,
    NOW(),
    NOW()
  ),

  -- 9. 겸손
  (
    9,
    'HUMILITY',
    '겸손',
    'Humility',
    '절대적 권위를 주장하지 않고 한계를 인정할 것',
    'Acknowledge limitations without claiming absolute authority',
    0.0364,
    NOW(),
    NOW()
  ),

  -- 10. 진화
  (
    10,
    'EVOLUTION',
    '진화',
    'Evolution',
    '새로운 이해에 비추어 성장과 수정을 허용할 것',
    'Allow growth and revision in light of new understanding',
    0.0182,
    NOW(),
    NOW()
  )
ON CONFLICT (code) DO NOTHING;

-- 삽입된 행 수 확인
DO $$
DECLARE
  inserted_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO inserted_count FROM constitutional_principles;
  RAISE NOTICE '헌법 원칙 % 개 적재 완료', inserted_count;
END $$;
