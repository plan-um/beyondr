// scripture-database.ts
// Beyondr Unified Scripture Database
// Compiled from: sample unified scripture (37 verses), library quotes (1,069),
// and real religious scripture references

export interface RelatedQuote {
  source: string;
  author?: string;
  text: string;
  tradition?: string;
}

export interface ScriptureVerse {
  id: string;
  chapter: number;
  verse: number;
  text_ko: string;
  text_en: string;
  traditions: string[];
  traditions_en: string[];
  theme: 'awakening' | 'suffering' | 'love' | 'life_death' | 'practice';
  relatedQuotes: RelatedQuote[];
  reflection_ko: string;
  reflection_en: string;

  // Evolution system fields (optional for backward compatibility)
  origin_type?: 'founding' | 'crawled' | 'user_submission' | 'community_revision';
  origin_submission_id?: string;
  voting_session_id?: string;
  version?: number;
  is_archived?: boolean;
}

export interface ScriptureChapter {
  id: number;
  title_ko: string;
  title_en: string;
  theme: string;
  intro_ko: string;
  intro_en: string;
  verses: ScriptureVerse[];
  sort_order?: number;
}

export const chapters: ScriptureChapter[] = [
  // ─────────────────────────────────────────────
  // 1장: 깨어남의 길 — The Path of Awakening
  // ─────────────────────────────────────────────
  {
    id: 1,
    title_ko: '깨어남의 길',
    title_en: 'The Path of Awakening',
    theme: 'awakening',
    intro_ko:
      '깨어남은 어딘가에 도착하는 게 아니에요.\n이미 여기 있는 것을, 다시 보는 거예요.',
    intro_en:
      'Awakening is not arriving somewhere new.\nIt is seeing what has always been here.',
    verses: [
      {
        id: '1:1',
        chapter: 1,
        verse: 1,
        text_ko:
          '눈을 감아보세요. 어둠이 아니라,\n보고 있는 누군가가 느껴질 거예요.\n그게 바로 당신이에요.',
        text_en:
          'Close your eyes. It is not darkness you find.\nYou find someone watching — and that someone is you.',
        traditions: ['불교', '베단타'],
        traditions_en: ['Buddhism', 'Vedanta'],
        theme: 'awakening',
        relatedQuotes: [
          {
            source: 'Brihadaranyaka Upanishad 4.3.6',
            text: 'You could not see the seer of seeing. You could not hear the hearer of hearing. You could not think the thinker of thinking.',
            tradition: 'Hinduism',
          },
          {
            source: 'The Nature of Consciousness',
            author: '앨런 와츠',
            text: '존재하는 모든 것의 깊은 본질인 자아의 의미로서의 신인 것이죠.',
            tradition: 'Vedanta',
          },
        ],
        reflection_ko: '눈을 감으면, 거기서 무엇을 만나나요?',
        reflection_en:
          'When you close your eyes, who is it that you meet?',
      },
      {
        id: '1:2',
        chapter: 1,
        verse: 2,
        text_ko:
          '그 보는 자를 찾았다면, 생각을 멈추려 애쓰지 마세요.\n강물을 막으면 넘치듯이.\n그냥 바라보세요. 생각은 지켜볼 때 스스로 고요해져요.',
        text_en:
          'Now that you have found the watcher, do not try to silence your thoughts.\nA dammed river only overflows.\nJust watch. Thoughts grow quiet on their own when you stop fighting them.',
        traditions: ['선불교', '도교'],
        traditions_en: ['Zen', 'Taoism'],
        theme: 'awakening',
        relatedQuotes: [
          {
            source: '도덕경 76장',
            author: '노자',
            text: '부드럽고 유연한 것이 굳고 강한 것을 이긴다.',
            tradition: 'Taoism',
          },
          {
            source: '마음챙김',
            author: '장현갑',
            text: '마음챙김을 수련한다는 것은 현재 전개되고 있는 경험세계로부터 떨어지는 것이 아니라 생생하게 깨어 접촉하고 있는 밀착감을 말하는 것이다.',
            tradition: 'Buddhism',
          },
        ],
        reflection_ko: '지금 떠오르는 생각을, 싸우지 않고 바라볼 수 있나요?',
        reflection_en:
          'Can you watch the thoughts arising right now without fighting them?',
      },
      {
        id: '1:3',
        chapter: 1,
        verse: 3,
        text_ko:
          '바라보는 법을 알았다면, 이제 멀리 갈 필요 없어요.\n오늘 아침 마신 물 한 잔, 거기에 깨어남이 있어요.',
        text_en:
          'Once you learn to watch, you need not go far.\nThis morning\'s glass of water — awakening is already there.',
        traditions: ['선불교', '수피즘'],
        traditions_en: ['Zen', 'Sufism'],
        theme: 'awakening',
        relatedQuotes: [
          {
            source: 'Zen saying',
            text: 'Before enlightenment, chop wood, carry water. After enlightenment, chop wood, carry water.',
            tradition: 'Zen',
          },
          {
            source: '나를 깨우는 명상',
            text: '완전한 깨달음의 상태란 바로 더 이상 더하거나 덜할 것도 없는 지금 그대의 상태입니다.',
            tradition: 'Buddhism',
          },
        ],
        reflection_ko:
          '가장 평범한 순간에서, 무엇을 발견할 수 있을까요?',
        reflection_en:
          'What can you discover in the most ordinary moment today?',
      },
      {
        id: '1:4',
        chapter: 1,
        verse: 4,
        text_ko:
          '물 한 잔에서도 깨어남을 느꼈다면, 이제 더 깊이 들어가 보세요.\n세상이 시끄러울수록, 내 안은 더 고요해져야 해요.\n깊은 바다는 수면의 폭풍을 몰라요.',
        text_en:
          'If you found awakening in a glass of water, now go deeper.\nThe louder the world, the stiller you must become.\nThe deep ocean knows nothing of the storm above.',
        traditions: ['스토아', '도교'],
        traditions_en: ['Stoicism', 'Taoism'],
        theme: 'awakening',
        relatedQuotes: [
          {
            source: 'Meditations 4.3',
            author: 'Marcus Aurelius',
            text: 'Nowhere can man find a quieter or more untroubled retreat than in his own soul.',
            tradition: 'Stoicism',
          },
          {
            source: '도덕경 16장',
            author: '노자',
            text: '致虚极，守静笃。万物并作，吾以观复。',
            tradition: 'Taoism',
          },
        ],
        reflection_ko: '지금 내 안은 얼마나 깊은 곳에 있나요?',
        reflection_en: 'How deep within yourself can you reach right now?',
      },
      {
        id: '1:5',
        chapter: 1,
        verse: 5,
        text_ko:
          '그 깊은 곳에서 진짜 나를 찾겠다고 결심하는 순간,\n깨어남은 이미 시작된 거예요.\n찾으려는 마음 자체가 첫 번째 빛이에요.',
        text_en:
          'The moment you resolve to find your true self in that depth,\nawakening has already begun.\nThe desire to seek is itself the first light.',
        traditions: ['기독교 신비주의', '불교'],
        traditions_en: ['Christian Mysticism', 'Buddhism'],
        theme: 'awakening',
        relatedQuotes: [
          {
            source: 'Gospel of Thomas 2',
            text: 'Let him who seeks continue seeking until he finds. When he finds, he will become troubled. When he becomes troubled, he will be astonished.',
            tradition: 'Christianity',
          },
          {
            source: '싯다르타',
            author: '헤르만 헤세',
            text: '자아 일체가 초극되고 소멸되었을 때에, 가슴속의 모든 욕구와 충동이 침묵할 때에, 비로소 가장 궁극의 것이 깨어날 것임에 틀림없었다.',
            tradition: 'Buddhism',
          },
        ],
        reflection_ko: '나를 찾으려는 그 마음은, 어디에서 왔을까요?',
        reflection_en:
          'Where does this desire to seek yourself come from?',
      },
      {
        id: '1:6',
        chapter: 1,
        verse: 6,
        text_ko:
          '하지만 찾겠다는 빛만으로는 부족해요.\n아는 것과 사는 것 사이에는 간격이 있어요.\n그 간격을 줄여가는 것, 그게 수행이에요.',
        text_en:
          'But the light of seeking alone is not enough.\nThere is a gap between knowing and living.\nClosing that gap, step by step \u2014 that is practice.',
        traditions: ['유교', '스토아'],
        traditions_en: ['Confucianism', 'Stoicism'],
        theme: 'awakening',
        relatedQuotes: [
          {
            source: '논어',
            author: '공자',
            text: '군자는 말은 어눌하고 행동은 민첩하게 하고자 한다.',
            tradition: 'Confucianism',
          },
          {
            source: 'Discourses 2.9',
            author: 'Epictetus',
            text: 'It is not that we dare not because things are difficult, but things are difficult because we dare not.',
            tradition: 'Stoicism',
          },
        ],
        reflection_ko:
          '알면서도 살지 못하고 있는 것은 무엇인가요?',
        reflection_en: 'What do you know to be true, yet fail to live by?',
      },
      {
        id: '1:7',
        chapter: 1,
        verse: 7,
        text_ko:
          '앎과 삶 사이의 그 간격을 어떻게 줄이냐고요?\n모든 전통이 같은 말을 해요.\n"멈춰봐. 그러면 보일 거야."',
        text_en:
          'How do you close that gap?\nEvery tradition says the same thing:\n"Be still. Then you will see."',
        traditions: ['범전통'],
        traditions_en: ['Universal'],
        theme: 'awakening',
        relatedQuotes: [
          {
            source: 'Psalm 46:10',
            text: 'Be still, and know that I am God.',
            tradition: 'Christianity',
          },
          {
            source: '도덕경 16장',
            author: '노자',
            text: '빈 마음을 극진히 하고, 고요함을 독실히 지켜라.',
            tradition: 'Taoism',
          },
          {
            source: 'Dhammapada 1:1',
            text: 'Mind is the forerunner of all actions. All deeds are led by mind, created by mind.',
            tradition: 'Buddhism',
          },
        ],
        reflection_ko: '오늘 5분만 멈춰본다면, 무엇이 보일까요?',
        reflection_en:
          'If you pause for just five minutes today, what might you see?',
      },
      {
        id: '1:8',
        chapter: 1,
        verse: 8,
        text_ko:
          '멈추고 보면, 종교 너머의 것이 보여요.\n종교 없이 태어날 수는 있어도, 자비 없이 태어나는 사람은 없어요.\n자비야말로 모든 가르침의 시작이에요.',
        text_en:
          'When you stop and look, you see something beyond religion.\nYou can be born without a faith, but not without compassion.\nCompassion is where every teaching begins.',
        traditions: ['불교', '범전통'],
        traditions_en: ['Buddhism', 'Universal'],
        theme: 'awakening',
        relatedQuotes: [
          {
            source: 'Beyond Religion',
            author: '달라이 라마',
            text: 'We are born free of religion, but we are not born free of the need for compassion.',
            tradition: 'Buddhism',
          },
          {
            source: 'Beyond Religion',
            author: '달라이 라마',
            text: 'I do not think that religion is indispensable to the spiritual life.',
            tradition: 'Buddhism',
          },
        ],
        reflection_ko:
          '종교와 상관없이, 내 삶에서 자비는 어떤 모습인가요?',
        reflection_en:
          'Apart from any religion, what does compassion look like in your daily life?',
      },
      {
        id: '1:9',
        chapter: 1,
        verse: 9,
        text_ko:
          '자비가 시작이라면, 평안은 그 열매예요.\n마음의 참된 평안은 욕망을 채울 때가 아니라,\n놓아줄 때 찾아와요.',
        text_en:
          'If compassion is the beginning, peace is its fruit.\nTrue peace comes not when desires are fulfilled,\nbut when you learn to let them go.',
        traditions: ['기독교', '불교'],
        traditions_en: ['Christianity', 'Buddhism'],
        theme: 'awakening',
        relatedQuotes: [
          {
            source: '그리스도를 본받아',
            author: '토마스 아 켐피스',
            text: '마음의 참된 평안은 욕망을 채울 때가 아니라, 욕망을 대적할 때에 찾아옵니다.',
            tradition: 'Christianity',
          },
          {
            source: 'Dhammapada 14:5',
            text: 'Not in the sky, not in the midst of the sea, not by hiding in a mountain cave: no place on earth exists where one can rest beyond the reach of craving.',
            tradition: 'Buddhism',
          },
        ],
        reflection_ko: '지금 꼭 쥐고 있는 것 중에, 놓아줄 수 있는 건 뭘까요?',
        reflection_en:
          'Of everything you hold tight right now, what could you gently release?',
      },
      {
        id: '1:10',
        chapter: 1,
        verse: 10,
        text_ko:
          '놓아줄수록, 경계가 사라져요.\n나와 우주가 따로 있다는 느낌은 착각이에요.\n깊이 보면, 나는 우주가 스스로를 표현하는 한 방식이에요.',
        text_en:
          'The more you release, the more boundaries dissolve.\nFeeling separate from the universe is an illusion.\nLook closely: you are the universe expressing itself.',
        traditions: ['베단타', '현대 영성'],
        traditions_en: ['Vedanta', 'Modern Spirituality'],
        theme: 'awakening',
        relatedQuotes: [
          {
            source: 'The Web of Life',
            author: '앨런 와츠',
            text: '우리 각자가 본질적으로, 깊숙이, 말하자면, 우주의 행위, 기능, 공연, 발현이라는 사실입니다.',
            tradition: 'Vedanta',
          },
          {
            source: 'Chandogya Upanishad 6.8.7',
            text: 'Tat tvam asi \u2014 Thou art That.',
            tradition: 'Hinduism',
          },
        ],
        reflection_ko: '나와 세상 사이에, 진짜 경계가 있을까요?',
        reflection_en:
          'Is there truly a boundary between you and the world?',
      },
      {
        id: '1:11',
        chapter: 1,
        verse: 11,
        text_ko:
          '우주와 하나라는 걸 아는 것으로 끝이 아니에요.\n사랑도, 삶도, 깨어남도 모두 기술이에요.\n기술은 매일의 연습으로 자라요.',
        text_en:
          'Knowing you are one with the universe is not the end.\nLove is an art. Life is an art. Awakening is an art.\nAnd every art grows through daily practice.',
        traditions: ['현대 영성', '유교'],
        traditions_en: ['Modern Spirituality', 'Confucianism'],
        theme: 'awakening',
        relatedQuotes: [
          {
            source: '사랑의 기술',
            author: '에리히 프롬',
            text: '최초의 조치는 삶이 기술인 것과 마찬가지로 사랑도 기술이라는 것을 깨닫는 것이다.',
            tradition: 'Modern Spirituality',
          },
          {
            source: '논어의 발견',
            author: '공자',
            text: '절차탁마切磋琢磨로 유명한 이야기다. 절차탁마는 학문의 완성을 위하여 끊임없이 노력하라.',
            tradition: 'Confucianism',
          },
        ],
        reflection_ko: '깨어남을 위해, 오늘 연습할 수 있는 작은 것은 뭘까요?',
        reflection_en:
          'What small act of awakening can you practice today?',
      },
      {
        id: '1:12',
        chapter: 1,
        verse: 12,
        text_ko:
          '그 연습의 첫걸음은 간단해요.\n잠깐 멈추고, 숨을 깊이 쉬어보세요.\n세상이 나를 흔들어도, 내 마음이 동의하지 않으면 흔들리지 않아요.\n당신의 마음은, 당신의 것이에요.',
        text_en:
          'The first step of that practice is simple.\nPause. Breathe deeply.\nThe world may try to shake you, but you only move when your mind agrees.\nYour mind belongs to you.',
        traditions: ['스토아', '불교'],
        traditions_en: ['Stoicism', 'Buddhism'],
        theme: 'awakening',
        relatedQuotes: [
          {
            source: 'Discourses 1.5',
            author: 'Epictetus',
            text: 'It is not things that disturb us, but our judgments about things.',
            tradition: 'Stoicism',
          },
          {
            source: '그리고 나는 스토아주의자가 되었다',
            text: '맞거나 모욕당하는 것만으로는 해를 입기에 충분치 않다는 것을요, 해를 입으려면 지금 그대가 해를 입고 있다고 믿어야만 하는 겁니다.',
            tradition: 'Stoicism',
          },
        ],
        reflection_ko:
          '최근에 흔들렸을 때, 내 마음이 먼저 동의하지는 않았나요?',
        reflection_en:
          'When you were last shaken, did your own mind first agree to be disturbed?',
      },
    ],
  },

  // ─────────────────────────────────────────────
  // 2장: 고통과 치유 — Suffering and Healing
  // ─────────────────────────────────────────────
  {
    id: 2,
    title_ko: '고통과 치유',
    title_en: 'Suffering and Healing',
    theme: 'suffering',
    intro_ko:
      '누구나 아파요.\n하지만 아픔을 끝까지 통과한 사람은, 전에 없던 빛을 품게 돼요.',
    intro_en:
      'Everyone hurts.\nBut those who walk all the way through their pain carry a light they never had before.',
    verses: [
      {
        id: '2:1',
        chapter: 2,
        verse: 1,
        text_ko:
          '고통은 벌이 아니에요.\n고통은 질문이에요. "지금, 나에게 정말 중요한 건 뭘까?"',
        text_en:
          'Suffering is not punishment.\nIt is a question: "What truly matters to me right now?"',
        traditions: ['불교', '기독교'],
        traditions_en: ['Buddhism', 'Christianity'],
        theme: 'suffering',
        relatedQuotes: [
          {
            source: 'Four Noble Truths',
            author: 'Buddha',
            text: 'Pain is inevitable, but suffering is optional. It arises from craving and attachment.',
            tradition: 'Buddhism',
          },
          {
            source: 'Romans 5:3-4',
            text: 'Suffering produces endurance, and endurance produces character, and character produces hope.',
            tradition: 'Christianity',
          },
        ],
        reflection_ko: '지금 내 고통이 묻고 있는 질문은 무엇인가요?',
        reflection_en:
          'What question is your pain asking you right now?',
      },
      {
        id: '2:2',
        chapter: 2,
        verse: 2,
        text_ko:
          '그 질문 앞에서 우리는 부러져요.\n하지만 부러진 뼈가 더 단단해지듯, 부러진 마음도 더 넓어질 수 있어요.',
        text_en:
          'That question can break us.\nBut as a broken bone grows back stronger, a broken heart can grow back wider.',
        traditions: ['수피즘', '스토아'],
        traditions_en: ['Sufism', 'Stoicism'],
        theme: 'suffering',
        relatedQuotes: [
          {
            source: 'Rumi',
            author: 'Rumi',
            text: 'The wound is the place where the Light enters you.',
            tradition: 'Sufism',
          },
          {
            source: 'Meditations 5.20',
            author: 'Marcus Aurelius',
            text: 'The impediment to action advances action. What stands in the way becomes the way.',
            tradition: 'Stoicism',
          },
        ],
        reflection_ko: '내가 부러진 곳은 어디이고, 거기서 어떤 빛이 들어오나요?',
        reflection_en:
          'Where have you been broken, and what light is entering there?',
      },
      {
        id: '2:3',
        chapter: 2,
        verse: 3,
        text_ko:
          '넓어지려면 먼저 질문을 바꿔야 해요.\n"왜 하필 나에게?"가 아니라, "이게 나에게 뭘 가르치고 있지?"라고요.',
        text_en:
          'To grow wider, first change the question.\nNot "Why me?" but "What is this teaching me?"',
        traditions: ['스토아', '이슬람'],
        traditions_en: ['Stoicism', 'Islam'],
        theme: 'suffering',
        relatedQuotes: [
          {
            source: 'Quran 94:5-6',
            text: 'Indeed, with hardship comes ease. Indeed, with hardship comes ease.',
            tradition: 'Islam',
          },
          {
            source: 'Letters 96.1',
            author: 'Seneca',
            text: 'Disaster is virtue\u2019s opportunity.',
            tradition: 'Stoicism',
          },
        ],
        reflection_ko: '최근 어려움이 내게 가르쳐준 게 있다면 뭘까요?',
        reflection_en: 'What has a recent difficulty taught you?',
      },
      {
        id: '2:4',
        chapter: 2,
        verse: 4,
        text_ko:
          '배움이 시작되면, 눈물이 나올 수 있어요.\n그건 약한 게 아니에요. 얼어붙은 땅이 녹을 때 물이 흐르는 거예요.',
        text_en:
          'When the learning begins, tears may come.\nThat is not weakness. When frozen ground thaws, water flows.',
        traditions: ['기독교', '도교'],
        traditions_en: ['Christianity', 'Taoism'],
        theme: 'suffering',
        relatedQuotes: [
          {
            source: 'Psalm 56:8',
            text: 'You have kept count of my tossings; put my tears in your bottle.',
            tradition: 'Christianity',
          },
          {
            source: '도덕경 78장',
            author: '노자',
            text: '천하에 물보다 부드럽고 약한 것은 없지만, 굳고 강한 것을 공격하는 데 물을 이길 것은 없다.',
            tradition: 'Taoism',
          },
        ],
        reflection_ko: '마지막으로 눈물을 흘린 건 언제예요? 그때 무엇이 녹았나요?',
        reflection_en:
          'When did you last let yourself cry? What thawed inside you?',
      },
      {
        id: '2:5',
        chapter: 2,
        verse: 5,
        text_ko:
          '눈물이 마르면 치유가 시작돼요.\n치유는 잊는 게 아니에요. 기억하면서도 평화로울 수 있다는 걸 배우는 거예요.',
        text_en:
          'When the tears dry, healing begins.\nHealing is not forgetting. It is learning to remember in peace.',
        traditions: ['불교', '현대 심리학'],
        traditions_en: ['Buddhism', 'Modern Psychology'],
        theme: 'suffering',
        relatedQuotes: [
          {
            source: 'The Heart Sutra',
            text: 'Form is emptiness, emptiness is form. There is no suffering, no origin of suffering, no cessation of suffering.',
            tradition: 'Buddhism',
          },
          {
            source: '마음챙김',
            author: '장현갑',
            text: '명상을 하면서 자신이 갖고 있는 문제나 고통을 과거와 다른 시각으로 보게 되어 자연스런 치유가 일어나는 것이 바로 명상을 통한 자기치유라는 것이다.',
            tradition: 'Buddhism',
          },
        ],
        reflection_ko: '기억하면서도 고요할 수 있는 상처가 있나요?',
        reflection_en:
          'Is there a wound you can remember and still feel at peace?',
      },
      {
        id: '2:6',
        chapter: 2,
        verse: 6,
        text_ko:
          '평화롭게 기억할 수 있게 되면, 그 상처는 문이 돼요.\n내 아픔을 통과한 만큼, 다른 사람의 아픔에 닿을 수 있으니까요.',
        text_en:
          'Once you can remember in peace, the wound becomes a door.\nThe deeper you have hurt, the deeper you can reach into another\u2019s pain.',
        traditions: ['기독교', '불교'],
        traditions_en: ['Christianity', 'Buddhism'],
        theme: 'suffering',
        relatedQuotes: [
          {
            source: '2 Corinthians 1:4',
            text: 'He comforts us in all our troubles so that we can comfort others with the same comfort we have received.',
            tradition: 'Christianity',
          },
          {
            source: 'Rumi',
            author: 'Rumi',
            text: 'The wound is the place where the Light enters you.',
            tradition: 'Sufism',
          },
        ],
        reflection_ko: '내 아픔이 누군가에게 위로가 된 적이 있나요?',
        reflection_en:
          'Has your pain ever become comfort for someone else?',
      },
      {
        id: '2:7',
        chapter: 2,
        verse: 7,
        text_ko:
          '다른 사람의 아픔에 닿으려면, 먼저 내 아픔을 피하지 않아야 해요.\n고통을 피하면 커지지만, 안아주면 달라져요.',
        text_en:
          'To reach another\u2019s pain, you must first stop running from your own.\nRun from pain and it grows. Hold it gently, and it transforms.',
        traditions: ['불교', '수피즘'],
        traditions_en: ['Buddhism', 'Sufism'],
        theme: 'suffering',
        relatedQuotes: [
          {
            source: 'Dhammapada 1:2',
            author: 'Buddha',
            text: '증오는 증오로 그치지 않나니, 사랑으로만 그치느니라.',
            tradition: 'Buddhism',
          },
          {
            source: '구본형의 신화 읽는 시간',
            author: '구본형',
            text: '고통을 멎게 해달라고 기도하지 말고, 고통을 이겨낼 가슴을 달라고 기도하게 하소서.',
            tradition: 'Universal',
          },
        ],
        reflection_ko: '지금 피하고 있는 고통이 있다면, 오늘 살짝 안아줄 수 있을까요?',
        reflection_en:
          'Is there a pain you are avoiding? Could you gently hold it today?',
      },
      {
        id: '2:8',
        chapter: 2,
        verse: 8,
        text_ko:
          '안아주고 나면, 밤이 조금씩 걷혀요.\n가장 깊은 밤 뒤에 새벽이 오듯, 가장 깊은 고통 뒤에 이해가 찾아와요.',
        text_en:
          'Once you hold it, the night begins to lift.\nAs dawn follows the deepest dark, understanding follows the deepest pain.',
        traditions: ['이슬람', '기독교', '도교'],
        traditions_en: ['Islam', 'Christianity', 'Taoism'],
        theme: 'suffering',
        relatedQuotes: [
          {
            source: 'Quran 93:3-5',
            text: 'Your Lord has not forsaken you, nor has He become displeased. And the Hereafter is better for you than the first life. And your Lord is going to give you, and you will be satisfied.',
            tradition: 'Islam',
          },
          {
            source: 'Psalm 30:5',
            text: 'Weeping may endure for a night, but joy comes in the morning.',
            tradition: 'Christianity',
          },
        ],
        reflection_ko: '가장 힘들었던 시간이 결국 내게 준 선물은 뭐였나요?',
        reflection_en:
          'What gift did your hardest season eventually bring you?',
      },
      {
        id: '2:9',
        chapter: 2,
        verse: 9,
        text_ko:
          '새벽이 와도 무력감이 남을 수 있어요.\n하지만 기억하세요. 무력감을 키우는 건 고통이 아니라, "나는 이걸 바꿀 수 없어"라는 생각이에요.',
        text_en:
          'Even after dawn, helplessness can linger.\nBut remember: it is not the pain that feeds it. It is the belief, "I cannot change this."',
        traditions: ['스토아', '현대 심리학'],
        traditions_en: ['Stoicism', 'Modern Psychology'],
        theme: 'suffering',
        relatedQuotes: [
          {
            source: '그릿',
            author: '앤절라 더크워스',
            text: '무력감을 낳는 요인은 고통 그 자체가 아니라는 사실을 최초로 입증해줬다. 문제는 자신이 통제할 수 없다고 생각하는 고통이었다.',
            tradition: 'Modern Psychology',
          },
          {
            source: 'Enchiridion 5',
            author: 'Epictetus',
            text: 'Men are disturbed not by things, but by the views which they take of things.',
            tradition: 'Stoicism',
          },
        ],
        reflection_ko:
          '"바꿀 수 없다"고 믿고 있는 것 중, 정말 그런 건가요?',
        reflection_en:
          'Among the things you believe you cannot change, is that truly so?',
      },
      {
        id: '2:10',
        chapter: 2,
        verse: 10,
        text_ko:
          '바꿀 수 있다는 믿음이 돌아오면, 비로소 보여요.\n모든 전통이 말해온 하나의 진리가. 고통에는 끝이 있고, 그 끝에는 이해가 있다는 것.',
        text_en:
          'When the belief that you can change returns, you finally see it.\nThe one truth every tradition has spoken: suffering has an end, and at that end is understanding.',
        traditions: ['불교', '범전통'],
        traditions_en: ['Buddhism', 'Universal'],
        theme: 'suffering',
        relatedQuotes: [
          {
            source: '다석 마지막 강의',
            author: '류영모',
            text: '내게 이제는 기독교가 유일의 참 종교도 아니요 성경만 완전한 진리도 아니다. 모든 종교는 따지고 들어가면 결국 하나요 그 알짬이 되는 참에서는 다름이 없다.',
            tradition: 'Universal',
          },
          {
            source: 'Third Noble Truth',
            author: 'Buddha',
            text: 'There is cessation of suffering. This is the noble truth of the cessation of suffering.',
            tradition: 'Buddhism',
          },
        ],
        reflection_ko: '고통의 끝에서 이해하게 된 것이 있나요?',
        reflection_en:
          'At the far side of your suffering, what did you come to understand?',
      },
      {
        id: '2:11',
        chapter: 2,
        verse: 11,
        text_ko:
          '그 이해 안에서 깨닫게 돼요.\n사랑과 고통은 한 쌍이라는 걸. 사랑하지 않으면 아프지 않고, 아파보지 않으면 깊이 사랑할 수 없어요.',
        text_en:
          'Inside that understanding, you realize:\nlove and suffering are a pair. Without love there is no pain, and without pain there is no depth of love.',
        traditions: ['수피즘', '기독교'],
        traditions_en: ['Sufism', 'Christianity'],
        theme: 'suffering',
        relatedQuotes: [
          {
            source: '무경계',
            author: '켄 윌버',
            text: '모든 것이 한 쌍의 대극 중 한 극이라는 사실을 주목해보라. 선/악, 삶/죽음, 즐거움/고통, 신/악마, 자유/속박...',
            tradition: 'Integral',
          },
          {
            source: 'Rumi',
            author: 'Rumi',
            text: 'Grief can be the garden of compassion. If you keep your heart open through everything, your pain can become your greatest ally.',
            tradition: 'Sufism',
          },
        ],
        reflection_ko: '내 가장 큰 아픔은, 가장 큰 사랑과 이어져 있나요?',
        reflection_en:
          'Is your deepest pain connected to your deepest love?',
      },
      {
        id: '2:12',
        chapter: 2,
        verse: 12,
        text_ko:
          '그러니 고통 앞에서 도망치지 마세요.\n존엄하게 견디는 것이, 수치스럽게 기쁨을 쫓는 것보다 나아요.\n그것이 고통을 통과한 사람의 빛이에요.',
        text_en:
          'So do not run from pain.\nTo endure it with dignity is better than to chase joy without it.\nThat is the light of those who have walked through suffering.',
        traditions: ['스토아', '유교'],
        traditions_en: ['Stoicism', 'Confucianism'],
        theme: 'suffering',
        relatedQuotes: [
          {
            source: '그리고 나는 스토아주의자가 되었다',
            text: '수치스런 방식으로 기쁨을 추구하느니 존경스런 방식으로 고통을 감내하는 편이 더 낫다.',
            tradition: 'Stoicism',
          },
          {
            source: '논어 15:9',
            author: '공자',
            text: '뜻있는 선비와 어진 사람은 살기 위해 인을 해치는 일이 없고, 몸을 죽여 인을 이루는 일은 있다.',
            tradition: 'Confucianism',
          },
        ],
        reflection_ko: '고통 앞에서, 나는 존엄을 지킬 수 있나요?',
        reflection_en:
          'In the face of pain, can you hold on to your dignity?',
      },
    ],
  },

  // ─────────────────────────────────────────────
  // 3장: 사랑과 연결 — Love and Connection
  // ─────────────────────────────────────────────
  {
    id: 3,
    title_ko: '사랑과 연결',
    title_en: 'Love and Connection',
    theme: 'love',
    intro_ko: '사랑은 이해하는 게 아니에요.\n사랑은 그 안으로 들어가는 거예요.',
    intro_en: 'Love is not something you understand.\nIt is something you enter.',
    verses: [
      {
        id: '3:1',
        chapter: 3,
        verse: 1,
        text_ko:
          '사랑한다는 건, 상대를 고치려는 게 아니에요.\n있는 그대로 바라보는 거예요.\n그 시선 자체가 사랑이에요.',
        text_en:
          'To love is not to fix someone.\nIt is to see them as they are.\nThat gaze itself is love.',
        traditions: ['불교', '기독교'],
        traditions_en: ['Buddhism', 'Christianity'],
        theme: 'love',
        relatedQuotes: [
          {
            source: '1 Corinthians 13:4-7',
            text: 'Love is patient, love is kind. It does not envy, it does not boast. It bears all things, believes all things, hopes all things.',
            tradition: 'Christianity',
          },
          {
            source: 'Beyond Religion',
            author: '달라이 라마',
            text: 'Genuine compassion, therefore, is directed not at people\u2019s behavior but at the people themselves.',
            tradition: 'Buddhism',
          },
        ],
        reflection_ko: '내가 사랑하는 사람을, 고치려 하지 않고 바라본 적이 있나요?',
        reflection_en:
          'Have you ever looked at someone you love without wanting to change them?',
      },
      {
        id: '3:2',
        chapter: 3,
        verse: 2,
        text_ko:
          '그런데 누군가를 있는 그대로 보려면,\n먼저 나를 있는 그대로 볼 수 있어야 해요.\n자기 안에 뿌리 내리지 못한 사랑은 오래가지 못해요.',
        text_en:
          'But to see someone as they are,\nyou must first see yourself as you are.\nLove that has no roots within you cannot last.',
        traditions: ['베단타', '현대 영성'],
        traditions_en: ['Vedanta', 'Modern Spirituality'],
        theme: 'love',
        relatedQuotes: [
          {
            source: '사랑의 기술',
            author: '에리히 프롬',
            text: '나 자신의 자아에 대한 사랑은 다른 존재에 대한 사랑과 불가분의 관계를 갖고 있다.',
            tradition: 'Modern Spirituality',
          },
          {
            source: 'Upanishads',
            text: 'The Self in you is the same Self in all beings. When you see this oneness, where is sorrow, where is delusion?',
            tradition: 'Hinduism',
          },
        ],
        reflection_ko: '나 자신을, 있는 그대로 바라보고 있나요?',
        reflection_en:
          'Are you seeing yourself as you truly are?',
      },
      {
        id: '3:3',
        chapter: 3,
        verse: 3,
        text_ko:
          '나를 알고 나면, 다른 사람이 보여요.\n같은 생각을 하지 않아도 손을 잡을 수 있어요.\n다름이 벽이 아니라 다리가 돼요.',
        text_en:
          'Once you know yourself, you begin to see others.\nYou can hold hands without thinking alike.\nDifference becomes a bridge, not a wall.',
        traditions: ['유교', '기독교'],
        traditions_en: ['Confucianism', 'Christianity'],
        theme: 'love',
        relatedQuotes: [
          {
            source: '논어 13:23',
            author: '공자',
            text: '군자는 여러 사람들과 조화를 이루면서도 당파를 이루지는 않고, 소인은 당파를 형성하여 여러 사람들과 조화를 이루지 못한다.',
            tradition: 'Confucianism',
          },
          {
            source: 'Ephesians 4:2-3',
            text: 'Be completely humble and gentle; be patient, bearing with one another in love. Make every effort to keep the unity of the Spirit through the bond of peace.',
            tradition: 'Christianity',
          },
        ],
        reflection_ko: '나와 다른 사람의 손을, 오늘 잡아볼 수 있나요?',
        reflection_en:
          'Can you reach for the hand of someone different from you today?',
      },
      {
        id: '3:4',
        chapter: 3,
        verse: 4,
        text_ko:
          '다름을 건너려면 자비가 필요해요.\n자비는 위에서 내려다보는 동정이 아니에요.\n"나도 저럴 수 있었어"라는 겸손한 인식이에요.',
        text_en:
          'Crossing difference takes compassion.\nCompassion is not pity looking down.\nIt is the humble recognition: "I could have been there too."',
        traditions: ['불교', '이슬람'],
        traditions_en: ['Buddhism', 'Islam'],
        theme: 'love',
        relatedQuotes: [
          {
            source: 'Quran 1:1',
            text: 'Bismillah ir-Rahman ir-Rahim \u2014 In the name of God, the Most Compassionate, the Most Merciful.',
            tradition: 'Islam',
          },
          {
            source: 'Metta Sutta',
            author: 'Buddha',
            text: 'Just as a mother would protect her only child with her life, even so let one cultivate a boundless love towards all beings.',
            tradition: 'Buddhism',
          },
        ],
        reflection_ko:
          '오늘 누군가를 보며 "나도 저럴 수 있었어"라고 느낀 적 있나요?',
        reflection_en:
          'Did you look at someone today and feel, "I could have been there too"?',
      },
      {
        id: '3:5',
        chapter: 3,
        verse: 5,
        text_ko:
          '자비로 바라보면, 용서도 가능해져요.\n용서는 상대를 위한 게 아니에요.\n나를 묶고 있는 사슬을 푸는 거예요.',
        text_en:
          'When you see with compassion, forgiveness becomes possible.\nForgiveness is not for them.\nIt is unlocking the chain that binds you.',
        traditions: ['기독교', '스토아'],
        traditions_en: ['Christianity', 'Stoicism'],
        theme: 'love',
        relatedQuotes: [
          {
            source: 'Beyond Religion',
            author: '달라이 라마',
            text: 'Forgiveness is an essential part of a compassionate attitude, but it is a virtue that is easily misunderstood. To forgive is not the same as to forget.',
            tradition: 'Buddhism',
          },
          {
            source: 'Matthew 18:21-22',
            text: 'Lord, how many times shall I forgive? Jesus answered, I tell you, not seven times, but seventy-seven times.',
            tradition: 'Christianity',
          },
        ],
        reflection_ko: '아직 용서하지 못한 것이 있다면, 그것이 나를 묶고 있진 않나요?',
        reflection_en:
          'If there is something you have not forgiven, is it still binding you?',
      },
      {
        id: '3:6',
        chapter: 3,
        verse: 6,
        text_ko:
          '용서가 시작되면, 판단이 내려가요.\n판단은 귀를 막지만, 열린 마음은 귀를 열어요.\n그때 비로소 상대가 들려요.',
        text_en:
          'When forgiveness begins, judgment falls away.\nJudgment closes the ears, but an open heart opens them.\nOnly then can you truly hear the other.',
        traditions: ['유교', '수피즘'],
        traditions_en: ['Confucianism', 'Sufism'],
        theme: 'love',
        relatedQuotes: [
          {
            source: '논어 4:17',
            author: '공자',
            text: '어진 이를 보면 그와 같아질 것을 생각하고, 어질지 못한 이를 보면 자신 또한 그렇지 않은지를 반성한다.',
            tradition: 'Confucianism',
          },
          {
            source: 'Masnavi',
            author: 'Rumi',
            text: 'Out beyond ideas of wrongdoing and rightdoing, there is a field. I\u2019ll meet you there.',
            tradition: 'Sufism',
          },
        ],
        reflection_ko: '누군가에 대한 판단을 내려놓으면, 무엇이 들리나요?',
        reflection_en:
          'If you set down your judgment of someone, what do you hear?',
      },
      {
        id: '3:7',
        chapter: 3,
        verse: 7,
        text_ko:
          '판단 없이 듣다 보면, 경계가 흐려져요.\n나와 너 사이의 벽이 사라지면,\n우리가 같은 바다의 파도였다는 걸 알게 돼요.',
        text_en:
          'Listen without judgment, and the boundaries blur.\nWhen the wall between you and me dissolves,\nyou see that we were always waves of the same ocean.',
        traditions: ['베단타', '수피즘', '도교'],
        traditions_en: ['Vedanta', 'Sufism', 'Taoism'],
        theme: 'love',
        relatedQuotes: [
          {
            source: 'Chandogya Upanishad',
            text: 'Just as rivers flowing from all directions merge into the sea and lose their individual names and forms, so all beings merge into the one infinite existence.',
            tradition: 'Hinduism',
          },
          {
            source: '슈뢰딩거 나의 세계관',
            author: '에르빈 슈뢰딩거',
            text: '우리 모두가 실은 일자의 다양한 측면이라는 이른바 동일성 교설 \u2014 우리 생명체들은 모두 유일한 존재의 측면들이나 양상들이므로 우리는 서로에게 속해 있다.',
            tradition: 'Vedanta',
          },
        ],
        reflection_ko: '내 옆의 사람과 나는 어떤 바다를 함께 이루고 있나요?',
        reflection_en:
          'What ocean do you and the person beside you share?',
      },
      {
        id: '3:8',
        chapter: 3,
        verse: 8,
        text_ko:
          '같은 바다라는 걸 알면, 한 사람을 향한 사랑이 세상 전체로 퍼져요.\n사랑은 한 곳에서 시작하지만, 거기서 멈추지 않아요.',
        text_en:
          'Once you know we share one ocean, love for one person ripples out to the whole world.\nLove begins in one place, but it never stays there.',
        traditions: ['기독교', '현대 영성'],
        traditions_en: ['Christianity', 'Modern Spirituality'],
        theme: 'love',
        relatedQuotes: [
          {
            source: '사랑의 기술',
            author: '에리히 프롬',
            text: '내가 참으로 한 사람을 사랑한다면 나는 모든 사람을 사랑하고 세계를 사랑하고 삶을 사랑하게 된다.',
            tradition: 'Modern Spirituality',
          },
          {
            source: '1 John 4:20',
            text: 'Whoever does not love their brother and sister, whom they have seen, cannot love God, whom they have not seen.',
            tradition: 'Christianity',
          },
        ],
        reflection_ko: '한 사람을 깊이 사랑해본 적 있나요? 그 사랑이 어디까지 퍼졌나요?',
        reflection_en:
          'Have you loved one person deeply? How far did that love travel?',
      },
      {
        id: '3:9',
        chapter: 3,
        verse: 9,
        text_ko:
          '세상의 모든 지식을 갖고 있어도, 사랑이 없으면 텅 빈 거예요.\n사랑이 지식에 숨을 불어넣어야, 지식이 살아 움직여요.',
        text_en:
          'You can hold all the knowledge in the world, but without love it is empty.\nLove breathes life into knowledge. Only then does it move.',
        traditions: ['기독교', '불교'],
        traditions_en: ['Christianity', 'Buddhism'],
        theme: 'love',
        relatedQuotes: [
          {
            source: '그리스도를 본받아',
            author: '토마스 아 켐피스',
            text: '어떤 사람이 성경 전체를 줄줄이 다 꿰고 있을 뿐만 아니라, 모든 철학자들의 금언들도 빠짐없이 다 암송하고 있다고 해도, 그 사람에게 사랑과 은혜가 없다면, 그 모든 것이 다 무슨 소용이 있겠습니까?',
            tradition: 'Christianity',
          },
          {
            source: '1 Corinthians 13:2',
            text: 'If I have the gift of prophecy and can fathom all mysteries, but do not have love, I am nothing.',
            tradition: 'Christianity',
          },
        ],
        reflection_ko: '내가 아는 것들 속에, 사랑이 숨 쉬고 있나요?',
        reflection_en:
          'Is love breathing inside the things you know?',
      },
      {
        id: '3:10',
        chapter: 3,
        verse: 10,
        text_ko:
          '사랑이 지식보다 앞서는 이유가 있어요.\n조건 없는 사랑이야말로 모든 경전이 가리키는 하나의 진리이기 때문이에요.\n그 사랑 앞에서, 모든 가르침은 하나가 돼요.',
        text_en:
          'There is a reason love comes before knowledge.\nUnconditional love is the single truth every scripture points to.\nBefore that love, all teachings become one.',
        traditions: ['기독교', '수피즘', '범전통'],
        traditions_en: ['Christianity', 'Sufism', 'Universal'],
        theme: 'love',
        relatedQuotes: [
          {
            source: '예수는 없다',
            author: '오강남',
            text: '성경 이야기에서 가장 근본적인 진리가 있다면 그것은 하나님이 우리와 세상을 조건 없이 사랑하신다는 것.',
            tradition: 'Christianity',
          },
          {
            source: 'Masnavi',
            author: 'Rumi',
            text: 'Love is the bridge between you and everything.',
            tradition: 'Sufism',
          },
        ],
        reflection_ko: '조건 없이 사랑받았다고 느낀 순간이 있나요?',
        reflection_en:
          'Was there a moment you felt loved without any conditions?',
      },
      {
        id: '3:11',
        chapter: 3,
        verse: 11,
        text_ko:
          '그래서 사랑은 역설이에요.\n둘이 하나가 되면서도, 둘로 남아 있어요.\n이 말이 머리로 이해되지 않아도 괜찮아요.\n사랑 안에 들어가 보면, 그냥 알게 돼요.',
        text_en:
          'And so love is a paradox.\nTwo become one, yet remain two.\nIt is all right if this does not make sense to your mind.\nStep inside love, and you will simply know.',
        traditions: ['현대 영성', '수피즘'],
        traditions_en: ['Modern Spirituality', 'Sufism'],
        theme: 'love',
        relatedQuotes: [
          {
            source: '사랑의 기술',
            author: '에리히 프롬',
            text: '사랑에서는 두 존재가 하나로 되면서도 둘로 남아 있다는 역설이 성립한다.',
            tradition: 'Modern Spirituality',
          },
          {
            source: 'The Prophet',
            author: 'Kahlil Gibran',
            text: 'Let there be spaces in your togetherness, and let the winds of the heavens dance between you.',
            tradition: 'Universal',
          },
        ],
        reflection_ko:
          '사랑 안에서, 하나이면서 나로 남아 있는 순간을 느낀 적 있나요?',
        reflection_en:
          'Have you ever felt both one with someone and fully yourself at the same time?',
      },
    ],
  },

  // ─────────────────────────────────────────────
  // 4장: 삶과 죽음 — Life and Death
  // ─────────────────────────────────────────────
  {
    id: 4,
    title_ko: '삶과 죽음',
    title_en: 'Life and Death',
    theme: 'life_death',
    intro_ko:
      '삶과 죽음은 서로 다른 게 아니에요.\n같은 강물의 물결과 바다예요.',
    intro_en:
      'Life and death are not two different things.\nThey are the wave and the ocean of the same water.',
    verses: [
      {
        id: '4:1',
        chapter: 4,
        verse: 1,
        text_ko:
          '꽃은 지면서 열매를 준비해요.\n놓아야 할 것을 놓을 때, 새로운 것이 익어가요.',
        text_en:
          'A flower falls to make way for fruit.\nWhen you release what must go, something new ripens.',
        traditions: ['불교', '도교'],
        traditions_en: ['Buddhism', 'Taoism'],
        theme: 'life_death',
        relatedQuotes: [
          {
            source: '도덕경 76장',
            author: '노자',
            text: '만물은 초목과 같다. 살아 있을 때는 부드럽고 연하지만, 죽으면 마르고 딱딱해진다.',
            tradition: 'Taoism',
          },
          {
            source: 'Dhammapada 277',
            author: 'Buddha',
            text: 'All conditioned things are impermanent. When one sees this with wisdom, one turns away from suffering.',
            tradition: 'Buddhism',
          },
        ],
        reflection_ko: '지금 놓아야 할 것은 무엇인가요? 그것이 떠나면 무엇이 익을까요?',
        reflection_en:
          'What do you need to release right now? What might ripen once it falls away?',
      },
      {
        id: '4:2',
        chapter: 4,
        verse: 2,
        text_ko:
          '이렇게 무언가 익어가는 동안에도, 매 순간은 작은 탄생이자 작은 죽음이에요.\n들숨과 날숨 사이에, 삶 전체가 들어 있어요.',
        text_en:
          'Even as something ripens, each moment is a small birth and a small death.\nYour whole life fits between one inhale and one exhale.',
        traditions: ['이슬람', '스토아'],
        traditions_en: ['Islam', 'Stoicism'],
        theme: 'life_death',
        relatedQuotes: [
          {
            source: 'Quran 3:185',
            text: 'Every soul will taste death. And only on the Day of Resurrection will you be paid your full reward.',
            tradition: 'Islam',
          },
          {
            source: 'Meditations 2.4',
            author: 'Marcus Aurelius',
            text: 'Think of yourself as dead. You have lived your life. Now, take what\u2019s left and live it properly.',
            tradition: 'Stoicism',
          },
        ],
        reflection_ko: '지금 이 숨이 마지막이라면, 무엇을 하고 싶나요?',
        reflection_en:
          'If this breath were your last, what would you want to be doing right now?',
      },
      {
        id: '4:3',
        chapter: 4,
        verse: 3,
        text_ko:
          '그런데 우리는 이 숨을 당연하게 여기며 미뤄요.\n영원히 살 것처럼 미루고, 내일 죽을 것처럼 두려워해요.\n그 사이에서 오늘이 빠져나가요.',
        text_en:
          'Yet we take this breath for granted and keep postponing.\nWe delay as if we live forever, and fear as if we die tomorrow.\nIn between, today slips away.',
        traditions: ['스토아', '불교'],
        traditions_en: ['Stoicism', 'Buddhism'],
        theme: 'life_death',
        relatedQuotes: [
          {
            source: 'On the Shortness of Life',
            author: 'Seneca',
            text: 'It is not that we have a short time to live, but that we waste a great deal of it.',
            tradition: 'Stoicism',
          },
          {
            source: '가치 있는 삶',
            text: '삶이 금방이라도 끝날 수 있다는 인식은 불안을 일으키기에 현실에 안주한다는 것은 본질적으로 인간의 삶에 적절치 않다. 어떤 면에서는 삶 자체보다 죽음에 대한 전망이 우리를 더욱 충만하게 살게끔 한다.',
            tradition: 'Stoicism',
          },
        ],
        reflection_ko: '오늘이 빠져나가기 전에, 지금 시작할 수 있는 것은 무엇인가요?',
        reflection_en:
          'Before today slips away, what is one thing you could begin right now?',
      },
      {
        id: '4:4',
        chapter: 4,
        verse: 4,
        text_ko:
          '오늘을 놓치지 않겠다고 결심하면, 떠나간 사람들도 다르게 보여요.\n그들은 사라진 게 아니에요. 비가 되어 내리고, 바람이 되어 불어와요.',
        text_en:
          'When you choose not to lose today, even those who have gone look different.\nThey have not vanished. They fall as rain. They blow as wind.',
        traditions: ['불교', '원주민 영성'],
        traditions_en: ['Buddhism', 'Indigenous Spirituality'],
        theme: 'life_death',
        relatedQuotes: [
          {
            source: 'No Death, No Fear',
            author: 'Thich Nhat Hanh',
            text: 'Our beloved one has not gone. They have just transformed. A cloud cannot die. It can only become rain, snow, or ice.',
            tradition: 'Buddhism',
          },
          {
            source: 'Lakota Prayer',
            text: 'We are all related. When someone passes, they return to the earth, the sky, the water \u2014 they become part of everything.',
            tradition: 'Indigenous Spirituality',
          },
        ],
        reflection_ko: '떠나간 사람의 바람이 불어올 때, 어디에서 느끼나요?',
        reflection_en:
          'When the wind of someone who has passed blows through, where do you feel it?',
      },
      {
        id: '4:5',
        chapter: 4,
        verse: 5,
        text_ko:
          '그 바람을 느끼려면, 죽음을 바라볼 줄 알아야 해요.\n죽음을 바라보는 건 우울한 게 아니에요.\n삶의 윤곽을 선명하게 해주는 빛이에요.',
        text_en:
          'To feel that wind, you need to learn to face death.\nFacing death is not morbid.\nIt is the light that sharpens the outline of life.',
        traditions: ['스토아', '불교', '기독교'],
        traditions_en: ['Stoicism', 'Buddhism', 'Christianity'],
        theme: 'life_death',
        relatedQuotes: [
          {
            source: 'Meditations 6.15',
            author: 'Marcus Aurelius',
            text: 'The happiness of your life depends upon the quality of your thoughts.',
            tradition: 'Stoicism',
          },
          {
            source: '그리고 나는 스토아주의자가 되었다',
            text: '인간은 잘 죽는 법을 알지 못하는 한 잘 살 수 없다.',
            tradition: 'Stoicism',
          },
        ],
        reflection_ko: '죽음을 바라볼 때, 지금 이 삶은 어떤 모습으로 보이나요?',
        reflection_en:
          'When you look at death, how does this life appear to you?',
      },
      {
        id: '4:6',
        chapter: 4,
        verse: 6,
        text_ko:
          '그 빛 아래에서 보면, 끝은 진짜 끝이 아니에요.\n씨앗은 어둠 속에서 깨져야 싹이 트여요.\n끝이라고 느끼는 바로 그 순간이, 시작이에요.',
        text_en:
          'Under that light, an ending is never truly the end.\nA seed must crack open in darkness to sprout.\nThe very moment that feels like an ending is a beginning.',
        traditions: ['기독교', '수피즘'],
        traditions_en: ['Christianity', 'Sufism'],
        theme: 'life_death',
        relatedQuotes: [
          {
            source: 'John 12:24',
            text: 'Unless a grain of wheat falls into the earth and dies, it remains alone; but if it dies, it bears much fruit.',
            tradition: 'Christianity',
          },
          {
            source: 'Rumi',
            author: 'Rumi',
            text: 'Be like the sun for grace and mercy. Be like the night to cover others\u2019 faults. Be like a stream for generosity. Be like death for rage and anger. Be like the earth for modesty.',
            tradition: 'Sufism',
          },
        ],
        reflection_ko: '지금 끝나고 있는 무언가 속에서, 어떤 시작이 보이나요?',
        reflection_en:
          'In something that is ending right now, what beginning can you see?',
      },
      {
        id: '4:7',
        chapter: 4,
        verse: 7,
        text_ko:
          '끝과 시작이 하나라면, 존재 자체가 기적이에요.\n수십억 년의 별먼지가 모여 지금의 당신이 되었어요.',
        text_en:
          'If endings and beginnings are one, then existence itself is a miracle.\nBillions of years of stardust gathered to become you.',
        traditions: ['현대 영성', '힌두교'],
        traditions_en: ['Modern Spirituality', 'Hinduism'],
        theme: 'life_death',
        relatedQuotes: [
          {
            source: 'Cosmos',
            author: 'Carl Sagan',
            text: 'The nitrogen in our DNA, the calcium in our teeth, the iron in our blood, the carbon in our apple pies were made in the interiors of collapsing stars. We are made of starstuff.',
            tradition: 'Modern Spirituality',
          },
          {
            source: 'Bhagavad Gita 2:20',
            text: 'For the soul there is neither birth nor death at any time. It is not born, nor does it die. It is unborn, eternal, ever-existing, and primeval.',
            tradition: 'Hinduism',
          },
        ],
        reflection_ko: '별먼지였던 내가 지금 여기 있다는 사실이, 오늘은 얼마나 놀라운가요?',
        reflection_en: 'You were once stardust. How miraculous does your existence feel today?',
      },
      {
        id: '4:8',
        chapter: 4,
        verse: 8,
        text_ko:
          '별먼지가 사람이 되었듯, 삶과 죽음도 떼어놓을 수 없어요.\n소리와 침묵처럼, 하나가 없으면 다른 하나도 없어요.',
        text_en:
          'Just as stardust became a person, life and death cannot be pulled apart.\nLike sound and silence \u2014 without one, the other cannot exist.',
        traditions: ['도교', '베단타'],
        traditions_en: ['Taoism', 'Vedanta'],
        theme: 'life_death',
        relatedQuotes: [
          {
            source: 'The Web of Life',
            author: '앨런 와츠',
            text: '켜짐과 꺼짐, 존재와 비존재, 즉 삶과 죽음의 대비가 존재를 구성합니다.',
            tradition: 'Taoism',
          },
          {
            source: '도덕경 2장',
            author: '노자',
            text: '有无相生，难易相成，长短相形，高下相倾 \u2014 있음과 없음은 서로를 낳는다.',
            tradition: 'Taoism',
          },
        ],
        reflection_ko: '삶의 소리와 죽음의 침묵 사이에서, 무엇이 들리나요?',
        reflection_en:
          'Between the sound of living and the silence of death, what do you hear?',
      },
      {
        id: '4:9',
        chapter: 4,
        verse: 9,
        text_ko:
          '그 소리와 침묵이 함께이기에, 삶은 덧없어도 가치가 줄지 않아요.\n오히려 더 빛나요.\n운명을 사랑한다는 건, 이 덧없음까지 사랑한다는 뜻이에요.',
        text_en:
          'Because sound and silence are together, life does not lose its worth by being brief.\nIt shines brighter.\nTo love your fate means loving its impermanence too.',
        traditions: ['스토아', '불교'],
        traditions_en: ['Stoicism', 'Buddhism'],
        theme: 'life_death',
        relatedQuotes: [
          {
            source: '가치 있는 삶',
            text: '삶의 덧없음은 삶의 가치를 깎아내리지 않고 드높인다. 운명을 사랑한다는 것은 무엇보다도 삶의 덧없음을 사랑한다는 의미다.',
            tradition: 'Stoicism',
          },
          {
            source: 'Nicomachean Ethics',
            author: 'Aristotle',
            text: 'Amor fati \u2014 love of one\u2019s fate, even the suffering and loss.',
            tradition: 'Stoicism',
          },
        ],
        reflection_ko: '덧없기에 오히려 더 소중하게 느껴지는 것은 무엇인가요?',
        reflection_en:
          'What feels more precious to you precisely because it will not last?',
      },
      {
        id: '4:10',
        chapter: 4,
        verse: 10,
        text_ko:
          '덧없음을 사랑할 수 있다면, 변화도 두렵지 않아요.\n사람은 몸에서 마음으로, 마음에서 정신으로, 정신에서 영혼으로 바뀌어가는 존재예요.',
        text_en:
          'If you can love impermanence, change holds no fear.\nA person transforms \u2014 from body to mind, mind to spirit, spirit to soul.',
        traditions: ['한국 영성', '베단타'],
        traditions_en: ['Korean Spirituality', 'Vedanta'],
        theme: 'life_death',
        relatedQuotes: [
          {
            source: '다석 류영모',
            author: '박영호',
            text: '인간은 몸에서 마음으로 마음에서 정신으로 정신에서 영혼으로 바뀌어가는 존재이다.',
            tradition: 'Korean Spirituality',
          },
          {
            source: 'Katha Upanishad 1.2.20',
            text: 'The Self is subtler than the subtle, greater than the great. It is hidden in the heart of every creature.',
            tradition: 'Hinduism',
          },
        ],
        reflection_ko: '지금 나는 몸, 마음, 정신, 영혼 중 어디쯤에 있나요?',
        reflection_en:
          'Where are you now along that path \u2014 body, mind, spirit, or soul?',
      },
      {
        id: '4:11',
        chapter: 4,
        verse: 11,
        text_ko:
          '영혼으로 나아갈수록 경계가 사라져요.\n나와 세상 사이에 분리란 없다는 것,\n이것이 모든 시대의 현자들이 말해온 핵심이에요.',
        text_en:
          'The closer you move toward soul, the more boundaries dissolve.\nThere is no separation between you and the world \u2014\nthis is the one truth sages of every age have spoken.',
        traditions: ['불교', '베단타', '현대 물리학'],
        traditions_en: ['Buddhism', 'Vedanta', 'Modern Physics'],
        theme: 'life_death',
        relatedQuotes: [
          {
            source: '무경계',
            author: '켄 윌버',
            text: '분리된 나란 없다는 통찰이야말로 모든 시대의 신비가와 현자들이 단언해온 것이며, 영원의 철학의 핵심이기도 하다.',
            tradition: 'Integral',
          },
          {
            source: '나 없이는 존재하지 않는 세상',
            text: '우리 존재의 참된 본질이라고 할 궁극적이거나 신비로운 본질은 존재하지 않습니다. 나라는 것은 광대하고 서로 연결된 현상들의 집합일 뿐입니다.',
            tradition: 'Buddhism',
          },
        ],
        reflection_ko: '나와 세상 사이의 경계가 사라진다면, 무엇이 남을까요?',
        reflection_en: 'If the boundary between you and the world dissolves, what remains?',
      },
      {
        id: '4:12',
        chapter: 4,
        verse: 12,
        text_ko:
          '경계가 사라진 자리에는 평화가 있어요.\n새로 생겨나는 것도 없고, 사라지는 것도 없어요.\n지금 이 순간이, 이미 절대적인 평화예요.',
        text_en:
          'Where boundaries dissolve, peace remains.\nNothing truly arises, and nothing truly ceases.\nThis very moment is already absolute peace.',
        traditions: ['선불교', '베단타'],
        traditions_en: ['Zen', 'Vedanta'],
        theme: 'life_death',
        relatedQuotes: [
          {
            source: '육조단경',
            text: '이 순간에 새롭게 생겨나는 것이란 아무것도 없다. 존재하기를 멈추는 것도 없다. 고로, 종말을 초래할 탄생과 죽음이란 없다. 따라서 지금 이 순간은 절대적인 평화이다.',
            tradition: 'Zen',
          },
          {
            source: 'Heart Sutra',
            text: 'Form is emptiness, emptiness is form. No birth, no death, no being, no non-being.',
            tradition: 'Buddhism',
          },
        ],
        reflection_ko: '아무것도 오지 않고 가지 않는다면, 지금 이 순간은 어떤 느낌인가요?',
        reflection_en:
          'If nothing comes and nothing goes, what does this very moment feel like?',
      },
    ],
  },

  // ─────────────────────────────────────────────
  // 5장: 고요와 수행 — Stillness and Practice
  // ─────────────────────────────────────────────
  {
    id: 5,
    title_ko: '고요와 수행',
    title_en: 'Stillness and Practice',
    theme: 'practice',
    intro_ko:
      '평화를 알았다면, 이제 그 안에 머무는 법을 배울 차례예요.\n수행은 거창한 것이 아니에요. 매 순간 자기 자신에게 돌아오는 거예요.',
    intro_en:
      'If you have glimpsed peace, now it is time to learn to stay there.\nPractice is not grand. It is returning to yourself, moment by moment.',
    verses: [
      {
        id: '5:1',
        chapter: 5,
        verse: 1,
        text_ko:
          '하루에 5분만 아무것도 하지 않고 앉아 보세요.\n할 일을 멈추는 것, 그것이 가장 깊은 수행의 시작이에요.',
        text_en:
          'Sit for just five minutes a day and do nothing.\nTo stop doing is where the deepest practice begins.',
        traditions: ['선불교', '도교'],
        traditions_en: ['Zen', 'Taoism'],
        theme: 'practice',
        relatedQuotes: [
          {
            source: '도덕경 48장',
            author: '노자',
            text: '為學日益，為道日損 \u2014 학문은 날로 더하고, 도는 날로 덜어낸다. 덜고 또 덜어 무위에 이른다.',
            tradition: 'Taoism',
          },
          {
            source: 'Zen saying',
            text: 'Sitting quietly, doing nothing, spring comes, and the grass grows by itself.',
            tradition: 'Zen',
          },
        ],
        reflection_ko: '오늘 5분, 아무것도 하지 않는 시간을 자신에게 줄 수 있나요?',
        reflection_en:
          'Can you give yourself five minutes of pure stillness today?',
      },
      {
        id: '5:2',
        chapter: 5,
        verse: 2,
        text_ko:
          '고요히 앉아 있으면 무언가가 들려오기 시작해요.\n기도는 말하는 것이 아니라, 듣는 것이에요.',
        text_en:
          'When you sit in stillness, something begins to speak.\nPrayer is not talking. It is listening.',
        traditions: ['기독교 신비주의', '수피즘'],
        traditions_en: ['Christian Mysticism', 'Sufism'],
        theme: 'practice',
        relatedQuotes: [
          {
            source: 'Meister Eckhart',
            author: 'Meister Eckhart',
            text: 'If the only prayer you ever say in your entire life is thank you, it will be enough.',
            tradition: 'Christianity',
          },
          {
            source: 'Rumi',
            author: 'Rumi',
            text: 'Silence is the language of God, all else is poor translation.',
            tradition: 'Sufism',
          },
        ],
        reflection_ko: '말을 멈추고 귀를 기울이면, 무엇이 들리나요?',
        reflection_en:
          'If you stop speaking and truly listen, what do you hear?',
      },
      {
        id: '5:3',
        chapter: 5,
        verse: 3,
        text_ko:
          '들리지 않는 날도 있어요. 마음이 흩어지는 날도 있어요.\n그래도 다시 앉는 것, 그것이 수행이에요. 완벽할 필요는 없어요.',
        text_en:
          'Some days you hear nothing. Some days the mind scatters.\nSitting down again anyway \u2014 that is the practice. It does not need to be perfect.',
        traditions: ['불교', '스토아'],
        traditions_en: ['Buddhism', 'Stoicism'],
        theme: 'practice',
        relatedQuotes: [
          {
            source: '마음챙김 명상 멘토링',
            author: '장현갑',
            text: '역설적이게도 명상을 잘하려면 잘하려고 하는 마음을 내려놓아야 한다. 오직 할 뿐이라는 마음가짐이 좋다.',
            tradition: 'Buddhism',
          },
          {
            source: 'Meditations 7.9',
            author: 'Marcus Aurelius',
            text: 'Not to feel exasperated, or defeated, or despondent because your days aren\u2019t packed with wise or moral actions. But to get back up when you fail.',
            tradition: 'Stoicism',
          },
        ],
        reflection_ko: '마음이 흩어진 날, 자신을 다그치지 않고 다시 시작할 수 있나요?',
        reflection_en: 'On a scattered day, can you begin again without judging yourself?',
      },
      {
        id: '5:4',
        chapter: 5,
        verse: 4,
        text_ko:
          '다시 앉을 때, 호흡부터 시작해 보세요.\n들이쉴 때 세상을 받아들이고, 내쉴 때 나를 내려놓으세요.',
        text_en:
          'When you sit down again, start with breath.\nBreathe in and receive the world. Breathe out and release yourself.',
        traditions: ['불교', '힌두교'],
        traditions_en: ['Buddhism', 'Hinduism'],
        theme: 'practice',
        relatedQuotes: [
          {
            source: 'Anapanasati Sutta',
            author: 'Buddha',
            text: 'Breathing in, I calm my body. Breathing out, I smile. Dwelling in the present moment, I know this is a wonderful moment.',
            tradition: 'Buddhism',
          },
          {
            source: 'Bhagavad Gita 4:29',
            text: 'Some offer the out-going breath into the in-coming, and the in-coming into the out-going, restraining the course of both, absorbed in the restraint of breath.',
            tradition: 'Hinduism',
          },
        ],
        reflection_ko: '지금 이 자리에서 숨을 한 번 깊이 쉬어 보세요. 무엇이 달라지나요?',
        reflection_en:
          'Right where you are, take one deep breath. What shifts?',
      },
      {
        id: '5:5',
        chapter: 5,
        verse: 5,
        text_ko:
          '호흡은 앉아 있을 때만의 것이 아니에요.\n설거지를 하면서도, 길을 걸으면서도 숨을 느낄 수 있어요.\n수행은 특별한 장소에 있지 않아요.',
        text_en:
          'Breath is not only for sitting.\nYou can feel it while washing dishes, while walking down the street.\nPractice lives in no special place.',
        traditions: ['선불교', '이슬람'],
        traditions_en: ['Zen', 'Islam'],
        theme: 'practice',
        relatedQuotes: [
          {
            source: 'The Miracle of Mindfulness',
            author: 'Thich Nhat Hanh',
            text: 'Wash the dishes to wash the dishes. The fact that I am standing there washing them is a wondrous reality.',
            tradition: 'Buddhism',
          },
          {
            source: 'Hadith (Ihya Ulum al-Din)',
            text: 'God does not look at your forms and possessions, but He looks at your hearts and your deeds.',
            tradition: 'Islam',
          },
        ],
        reflection_ko: '오늘 가장 평범한 순간에 숨을 한 번 느껴볼 수 있나요?',
        reflection_en:
          'In the most ordinary moment today, can you pause and feel one breath?',
      },
      {
        id: '5:6',
        chapter: 5,
        verse: 6,
        text_ko:
          '일상의 수행은 몸에서 시작돼요.\n몸은 마음이 사는 집이에요. 집을 돌보지 않으면, 안에 있는 이도 편하지 않아요.',
        text_en:
          'Everyday practice begins with the body.\nThe body is the home where the mind lives. Neglect the house, and the one within suffers.',
        traditions: ['요가', '유교'],
        traditions_en: ['Yoga', 'Confucianism'],
        theme: 'practice',
        relatedQuotes: [
          {
            source: 'Yoga Sutras 2.46',
            author: 'Patanjali',
            text: 'Sthira sukham asanam \u2014 The posture should be steady and comfortable.',
            tradition: 'Yoga',
          },
          {
            source: '논어 10:8',
            author: '공자',
            text: '음식은 정결한 것을 취하고, 고기는 잘게 썬 것을 취한다 \u2014 몸을 돌보는 것이 수양의 시작이다.',
            tradition: 'Confucianism',
          },
        ],
        reflection_ko: '오늘 내 몸에게 작은 돌봄 하나를 선물할 수 있나요?',
        reflection_en: 'What small act of care can you offer your body today?',
      },
      {
        id: '5:7',
        chapter: 5,
        verse: 7,
        text_ko:
          '몸을 돌보았다면, 가끔은 밖으로 나가 보세요.\n나무는 그냥 서 있는 법을 가르쳐주고, 바람은 놓아주는 법을 보여줘요.',
        text_en:
          'Once you have cared for the body, step outside now and then.\nTrees teach how to simply stand; wind shows how to let go.',
        traditions: ['도교', '원주민 영성'],
        traditions_en: ['Taoism', 'Indigenous Spirituality'],
        theme: 'practice',
        relatedQuotes: [
          {
            source: '도덕경 8장',
            author: '노자',
            text: '上善若水 \u2014 최고의 선은 물과 같다. 물은 만물을 이롭게 하면서도 다투지 않는다.',
            tradition: 'Taoism',
          },
          {
            source: 'Black Elk',
            author: 'Black Elk',
            text: 'All things are our relatives; what we do to everything, we do to ourselves.',
            tradition: 'Indigenous Spirituality',
          },
        ],
        reflection_ko: '마지막으로 하늘을 올려다보며 가만히 선 건 언제인가요?',
        reflection_en: 'When did you last look up at the sky and simply stand still?',
      },
      {
        id: '5:8',
        chapter: 5,
        verse: 8,
        text_ko:
          '자연이 가르쳐주듯, 수행에는 끝이 없어요.\n끝이 없다는 것이 아름다운 거예요. 매일이 첫날이에요.',
        text_en:
          'As nature teaches, practice has no finish line.\nThat it never ends is what makes it beautiful. Every day is day one.',
        traditions: ['불교', '수피즘', '스토아'],
        traditions_en: ['Buddhism', 'Sufism', 'Stoicism'],
        theme: 'practice',
        relatedQuotes: [
          {
            source: 'Shunryu Suzuki',
            author: 'Shunryu Suzuki',
            text: 'In the beginner\u2019s mind there are many possibilities, but in the expert\u2019s mind there are few.',
            tradition: 'Zen',
          },
          {
            source: 'Meditations 2.1',
            author: 'Marcus Aurelius',
            text: 'When you arise in the morning, think of what a privilege it is to be alive \u2014 to think, to enjoy, to love.',
            tradition: 'Stoicism',
          },
        ],
        reflection_ko: '오늘이 수행의 첫날이라면, 무엇부터 해보겠어요?',
        reflection_en:
          'If today were the very first day of your practice, what would you do?',
      },
      {
        id: '5:9',
        chapter: 5,
        verse: 9,
        text_ko:
          '매일이 첫날이라면, 많은 것이 필요하지 않아요.\n덜어내고, 또 덜어내세요. 진짜 풍요는 비울 때 찾아와요.',
        text_en:
          'If every day is the first day, you do not need much.\nLet go, and let go again. True richness arrives when you empty.',
        traditions: ['도교', '기독교 신비주의'],
        traditions_en: ['Taoism', 'Christian Mysticism'],
        theme: 'practice',
        relatedQuotes: [
          {
            source: '다석 마지막 강의',
            author: '류영모',
            text: '간소화하고 간소화하라. 진정한 정신적인 부를 누릴 수 있는 가난, 나는 그것을 바란다.',
            tradition: 'Korean Spirituality',
          },
          {
            source: 'Walden',
            author: 'Henry David Thoreau',
            text: 'Our life is frittered away by detail. Simplify, simplify.',
            tradition: 'Transcendentalism',
          },
        ],
        reflection_ko: '내 삶에서 하나만 덜어낸다면, 무엇을 놓겠어요?',
        reflection_en: 'If you could let go of just one thing in your life, what would it be?',
      },
      {
        id: '5:10',
        chapter: 5,
        verse: 10,
        text_ko:
          '비워낸 자리에 누군가가 대신 채워주지는 않아요.\n예수도 대신 기도해주지 않았고, 석가도 대신 명상해주지 않았어요.\n이 길은 스스로 걸어야 해요.',
        text_en:
          'No one can fill the space you have emptied for you.\nJesus did not pray in his disciples’ place. Buddha did not meditate for them.\nThis path, you must walk yourself.',
        traditions: ['기독교', '불교'],
        traditions_en: ['Christianity', 'Buddhism'],
        theme: 'practice',
        relatedQuotes: [
          {
            source: '다석 류영모의 생각과 믿음',
            author: '박영호',
            text: '예수가 언제 제자들에게 대신 기도를 해주고 석가가 언제 제자들에게 대신 명상을 하여 주었는가.',
            tradition: 'Korean Spirituality',
          },
          {
            source: 'Dhammapada 276',
            author: 'Buddha',
            text: 'You must make the effort yourselves. The Buddhas only point the way.',
            tradition: 'Buddhism',
          },
        ],
        reflection_ko: '내 수행을 대신해 줄 사람은 없다는 것을 받아들일 수 있나요?',
        reflection_en:
          'Can you accept that no one else can do your practice for you?',
      },
      {
        id: '5:11',
        chapter: 5,
        verse: 11,
        text_ko:
          '스스로 걷기 시작하면, 모든 것이 수행이 돼요.\n접시를 닦는 것도, 길을 걷는 것도, 누군가의 말에 귀 기울이는 것도.',
        text_en:
          'Once you start walking on your own, everything becomes practice.\nWashing a dish, walking a road, truly listening to someone.',
        traditions: ['선불교', '기독교 신비주의'],
        traditions_en: ['Zen', 'Christian Mysticism'],
        theme: 'practice',
        relatedQuotes: [
          {
            source: '무경계',
            author: '켄 윌버',
            text: '우리가 하는 모든 것이 곧 수행이자 본래 깨달음의 표현이 된다. 모든 행동은 영원으로부터, 무경계로부터 일어난다.',
            tradition: 'Integral',
          },
          {
            source: 'Brother Lawrence',
            author: 'Brother Lawrence',
            text: 'The time of business does not differ from the time of prayer; and in the noise and clatter of my kitchen, I possess God in as great tranquility as if I were upon my knees.',
            tradition: 'Christianity',
          },
        ],
        reflection_ko:
          '지금 이 순간 하고 있는 일을, 온 마음으로 할 수 있나요?',
        reflection_en:
          'Can you do what you are doing right now with your whole heart?',
      },
      {
        id: '5:12',
        chapter: 5,
        verse: 12,
        text_ko:
          '모든 것이 수행이라면, 마지막으로 남는 건 이거예요.\n싫어하는 것도, 좋아하는 것도 내려놓고 다만 깨어 있는 것.\n그것이 수행의 삶이에요.',
        text_en:
          'If everything is practice, then what remains is this:\nLet go of what you resist and what you cling to, and simply stay awake.\nThat is the life of practice.',
        traditions: ['불교', '스토아'],
        traditions_en: ['Buddhism', 'Stoicism'],
        theme: 'practice',
        relatedQuotes: [
          {
            source: '마음챙김 명상 멘토링',
            author: '장현갑',
            text: '싫어하는 것뿐만 아니라 좋아하는 것도 내려놓고 마음챙김하는 것. 자신의 손해를 최소화하고 이익을 최대화하려는 욕구를 내려놓고 사는 삶. 그것이 수행의 삶이다.',
            tradition: 'Buddhism',
          },
          {
            source: 'Bhagavad Gita 2:47',
            text: 'You have a right to perform your prescribed duties, but you are not entitled to the fruits of your actions.',
            tradition: 'Hinduism',
          },
        ],
        reflection_ko:
          '좋아하는 것에 대한 집착까지도, 내려놓을 준비가 되었나요?',
        reflection_en:
          'Are you ready to release even your attachment to the things you love?',
      },
    ],
  },
];

// ─────────────────────────────────────────────
// Utility functions
// ─────────────────────────────────────────────

export const getChapterByTheme = (theme: string): ScriptureChapter | undefined =>
  chapters.find((c) => c.theme === theme);

export const getVerseById = (id: string): ScriptureVerse | null => {
  for (const ch of chapters) {
    const v = ch.verses.find((v) => v.id === id);
    if (v) return v;
  }
  return null;
};

export const getAllVerses = (): ScriptureVerse[] =>
  chapters.flatMap((c) => c.verses);

export const getVersesByTheme = (
  theme: 'awakening' | 'suffering' | 'love' | 'life_death' | 'practice',
): ScriptureVerse[] => getAllVerses().filter((v) => v.theme === theme);

export const getRandomVerse = (): ScriptureVerse => {
  const all = getAllVerses();
  return all[Math.floor(Math.random() * all.length)];
};

export const searchVerses = (query: string): ScriptureVerse[] => {
  const q = query.toLowerCase();
  return getAllVerses().filter(
    (v) =>
      v.text_ko.toLowerCase().includes(q) ||
      v.text_en.toLowerCase().includes(q) ||
      v.traditions.some((t) => t.toLowerCase().includes(q)) ||
      v.traditions_en.some((t) => t.toLowerCase().includes(q)),
  );
};

// Re-export evolution types for convenience
export type { ScriptureChunkEvolution, ScriptureVersion, RevisionProposal } from '../types/evolution';
