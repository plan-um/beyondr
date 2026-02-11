export interface CounselingScenario {
  id: string
  name_ko: string
  name_en: string
  description: string
  keywords: string[]
  example_questions: string[]
}

export const COUNSELING_SCENARIOS: CounselingScenario[] = [
  {
    id: 'grief_loss',
    name_ko: '슬픔과 상실',
    name_en: 'Grief and Loss',
    description: 'Coping with death, loss of relationships, endings, letting go',
    keywords: ['death', 'loss', 'grief', 'mourning', 'farewell', 'gone', 'passed away', 'missing'],
    example_questions: [
      '사랑하는 사람을 잃었어요',
      'I lost someone I loved deeply',
      '이별의 아픔을 어떻게 견디나요',
    ],
  },
  {
    id: 'anxiety_fear',
    name_ko: '불안과 두려움',
    name_en: 'Anxiety and Fear',
    description: 'Worry about the future, panic, existential dread, uncertainty',
    keywords: ['anxiety', 'fear', 'worry', 'panic', 'dread', 'uncertain', 'afraid', 'scared'],
    example_questions: [
      '미래가 너무 불안해요',
      'I can\'t stop worrying about everything',
      '두려움을 극복하고 싶어요',
    ],
  },
  {
    id: 'relationships',
    name_ko: '관계 갈등',
    name_en: 'Relationship Struggles',
    description: 'Conflict with family, friends, partners; loneliness; forgiveness',
    keywords: ['relationship', 'conflict', 'family', 'friend', 'partner', 'lonely', 'forgive', 'betrayal'],
    example_questions: [
      '가족과의 갈등이 깊어요',
      'I feel so lonely even around people',
      '용서가 어려워요',
    ],
  },
  {
    id: 'purpose_meaning',
    name_ko: '삶의 의미와 목적',
    name_en: 'Purpose and Meaning',
    description: 'Searching for life purpose, feeling lost, existential questions',
    keywords: ['purpose', 'meaning', 'why', 'point', 'direction', 'lost', 'exist', 'reason'],
    example_questions: [
      '왜 살아야 하는지 모르겠어요',
      'What is the point of all this?',
      '내 삶의 방향을 모르겠어요',
    ],
  },
  {
    id: 'addiction_attachment',
    name_ko: '중독과 집착',
    name_en: 'Addiction and Attachment',
    description: 'Substance abuse, behavioral addiction, unhealthy attachments, letting go',
    keywords: ['addiction', 'attachment', 'obsess', 'crave', 'depend', 'habit', 'control', 'let go'],
    example_questions: [
      '집착을 멈출 수가 없어요',
      'I keep falling back into the same patterns',
      '놓아주는 법을 알고 싶어요',
    ],
  },
  {
    id: 'spiritual_crisis',
    name_ko: '영적 위기',
    name_en: 'Spiritual Crisis',
    description: 'Crisis of faith, doubt, feeling disconnected from the divine',
    keywords: ['faith', 'doubt', 'god', 'believe', 'spiritual', 'prayer', 'divine', 'soul'],
    example_questions: [
      '신이 정말 있는 건지 모르겠어요',
      'I\'ve lost my faith',
      '기도가 더 이상 의미가 없는 것 같아요',
    ],
  },
  {
    id: 'life_transitions',
    name_ko: '삶의 전환기',
    name_en: 'Life Transitions',
    description: 'Major life changes, career shifts, aging, new beginnings',
    keywords: ['change', 'transition', 'new', 'beginning', 'end', 'career', 'aging', 'retire'],
    example_questions: [
      '인생의 큰 변화 앞에서 막막해요',
      'Everything is changing and I can\'t keep up',
      '새로운 시작이 두려워요',
    ],
  },
  {
    id: 'self_acceptance',
    name_ko: '자기 수용과 성장',
    name_en: 'Self-Acceptance and Growth',
    description: 'Self-worth, self-criticism, personal growth, identity',
    keywords: ['self', 'worth', 'accept', 'growth', 'identity', 'enough', 'perfect', 'flaw'],
    example_questions: [
      '나 자신을 좋아할 수가 없어요',
      'I never feel good enough',
      '성장하고 싶은데 어디서부터 시작해야 할지',
    ],
  },
]

// Tagging prompt template for Claude Haiku
export function getCounselingTaggingPrompt(text: string, source: string): string {
  return `You are a counseling content tagger. Analyze the following wisdom text and determine which counseling scenarios it could help with.

Text: "${text}"
Source: ${source}

Available scenarios:
1. grief_loss - Grief and Loss
2. anxiety_fear - Anxiety and Fear
3. relationships - Relationship Struggles
4. purpose_meaning - Purpose and Meaning
5. addiction_attachment - Addiction and Attachment
6. spiritual_crisis - Spiritual Crisis
7. life_transitions - Life Transitions
8. self_acceptance - Self-Acceptance and Growth

Respond with ONLY a JSON object:
{
  "scenarios": ["scenario_id_1", "scenario_id_2"],
  "emotional_tone": "gentle_invitation" | "firm_guidance" | "compassionate_presence" | "philosophical_inquiry" | "poetic_comfort",
  "when_to_use": "Brief description of when to use this text in counseling (in Korean)",
  "counseling_relevance": 0.0
}

Rules:
- Select 1-3 most relevant scenarios
- counseling_relevance is 0-1: how helpful this text would be for someone in emotional distress
- when_to_use should be a single Korean sentence
- emotional_tone describes the feeling the text evokes`
}

export type EmotionalTone = 'gentle_invitation' | 'firm_guidance' | 'compassionate_presence' | 'philosophical_inquiry' | 'poetic_comfort'

export interface CounselingContext {
  scenarios: string[]
  emotional_tone: EmotionalTone
  when_to_use: string
  counseling_relevance: number
}
