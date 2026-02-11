// supabase/functions/crawl/index.ts
// Periodic crawling of wisdom sources
// Triggered by: pg_cron (weekly) or manual invocation
//
// Pipeline:
// 1. Fetch active crawl_sources
// 2. For each source, collect new content via adapter
// 3. SHA-256 hash for dedup
// 4. AI quality filter (relevance >= 0.6, quality >= 0.5)
// 5. Passed items -> refinement queue
//
// Adapters:
// - Bible API (bible-api.com)
// - Quran Cloud API (api.alquran.cloud)
// - Bhagavad Gita (curated / vedicscriptures.github.io fallback)
// - Sacred Texts Collection (Taoism, Buddhism, Stoicism, Sufism)

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// ============================================================================
// TYPES
// ============================================================================

interface CrawlRequest {
  source_id?: string  // Optional: crawl specific source only
  force_recrawl?: boolean  // Optional: ignore last_crawl_at
  mode?: 'sample' | 'full'  // Optional: 'sample' (default curated lists) or 'full' (expanded collections)
}

interface CrawlResult {
  sources_processed: number
  items_collected: number
  items_deduped: number
  items_passed: number
  items_failed: number
  errors: string[]
}

interface BibleVerse {
  reference: string
  text: string
  translation_name: string
}

interface CrawledItem {
  reference: string
  text: string
  original_language: string
  author: string
  source_url: string | null
  copyright_status: string
}

// ============================================================================
// CURATED PASSAGE LISTS
// ============================================================================

// Bible wisdom passages
const BIBLE_WISDOM_PASSAGES = [
  "proverbs+3:5-6",
  "proverbs+16:9",
  "proverbs+22:6",
  "ecclesiastes+3:1-8",
  "ecclesiastes+12:13",
  "psalm+23:1-6",
  "psalm+46:1",
  "psalm+91:1-2",
  "matthew+5:3-12",
  "matthew+6:33",
  "matthew+7:7",
  "john+3:16",
  "john+14:6",
  "romans+8:28",
  "romans+12:2",
  "philippians+4:6-7",
  "philippians+4:13",
  "james+1:2-4",
  "1corinthians+13:4-8",
  "colossians+3:23",
]

// Quran wisdom passages (surah:ayah format)
const QURAN_WISDOM_PASSAGES = [
  "2:255",    // Ayat al-Kursi (Throne Verse)
  "2:286",    // Allah does not burden a soul beyond its capacity
  "3:139",    // Do not weaken and do not grieve
  "5:32",     // Whoever saves a life, saves all of humanity
  "13:28",    // In the remembrance of Allah do hearts find rest
  "16:90",    // Allah commands justice and good conduct
  "21:87",    // There is no deity except You; exalted are You
  "24:35",    // Allah is the Light of the heavens and earth (Light Verse)
  "31:17",    // Luqman's advice (part 1)
  "31:18",    // Luqman's advice (part 2)
  "39:53",    // Do not despair of the mercy of Allah
  "49:13",    // Created you into nations and tribes to know one another
  "55:1",     // The Most Merciful (Ar-Rahman start)
  "55:2",     // Taught the Quran
  "55:3",     // Created man
  "55:4",     // Taught him eloquence
  "93:1",     // Surah Ad-Duha verse 1
  "93:2",     // Surah Ad-Duha verse 2
  "93:3",     // Surah Ad-Duha verse 3
  "93:4",     // Surah Ad-Duha verse 4
  "93:5",     // Surah Ad-Duha verse 5
  "93:6",     // Surah Ad-Duha verse 6
  "93:7",     // Surah Ad-Duha verse 7
  "93:8",     // Surah Ad-Duha verse 8
  "94:5",     // With hardship comes ease (1)
  "94:6",     // With hardship comes ease (2)
  "112:1",    // Surah Al-Ikhlas verse 1
  "112:2",    // Surah Al-Ikhlas verse 2
  "112:3",    // Surah Al-Ikhlas verse 3
  "112:4",    // Surah Al-Ikhlas verse 4
]

// Bhagavad Gita curated wisdom (public domain translations)
const GITA_WISDOM: CrawledItem[] = [
  {
    reference: "Bhagavad Gita 2:47",
    text: "You have a right to perform your prescribed duties, but you are not entitled to the fruits of your actions.",
    original_language: "sa",
    author: "Bhagavad Gita (translation)",
    source_url: null,
    copyright_status: "public_domain",
  },
  {
    reference: "Bhagavad Gita 2:14",
    text: "The contacts of the senses with their objects, which give rise to the feelings of heat and cold, pleasure and pain, are transient. Bear them patiently.",
    original_language: "sa",
    author: "Bhagavad Gita (translation)",
    source_url: null,
    copyright_status: "public_domain",
  },
  {
    reference: "Bhagavad Gita 2:22",
    text: "As a person puts on new garments, giving up old ones, the soul similarly accepts new material bodies, giving up the old and useless ones.",
    original_language: "sa",
    author: "Bhagavad Gita (translation)",
    source_url: null,
    copyright_status: "public_domain",
  },
  {
    reference: "Bhagavad Gita 4:7",
    text: "Whenever there is a decline in righteousness and an increase in unrighteousness, at that time I manifest myself.",
    original_language: "sa",
    author: "Bhagavad Gita (translation)",
    source_url: null,
    copyright_status: "public_domain",
  },
  {
    reference: "Bhagavad Gita 6:5",
    text: "Elevate yourself through the power of your mind, and not degrade yourself, for the mind can be the friend and also the enemy of the self.",
    original_language: "sa",
    author: "Bhagavad Gita (translation)",
    source_url: null,
    copyright_status: "public_domain",
  },
  {
    reference: "Bhagavad Gita 9:22",
    text: "To those who worship Me alone, thinking of no other, I secure what they lack and preserve what they have.",
    original_language: "sa",
    author: "Bhagavad Gita (translation)",
    source_url: null,
    copyright_status: "public_domain",
  },
  {
    reference: "Bhagavad Gita 11:32",
    text: "I am mighty Time, the source of destruction that comes forth to annihilate the worlds.",
    original_language: "sa",
    author: "Bhagavad Gita (translation)",
    source_url: null,
    copyright_status: "public_domain",
  },
  {
    reference: "Bhagavad Gita 18:66",
    text: "Abandon all varieties of dharma and simply surrender unto me alone. I shall liberate you from all sinful reactions; do not fear.",
    original_language: "sa",
    author: "Bhagavad Gita (translation)",
    source_url: null,
    copyright_status: "public_domain",
  },
]

// Sacred Texts Collection: Taoism, Buddhism, Stoicism, Sufism
const SACRED_WISDOM: CrawledItem[] = [
  // Tao Te Ching (Lao Tzu) — original ~6th century BCE, public domain
  {
    reference: "Tao Te Ching, Chapter 1",
    text: "The Tao that can be told is not the eternal Tao. The name that can be named is not the eternal name.",
    original_language: "zh",
    author: "Lao Tzu",
    source_url: null,
    copyright_status: "public_domain",
  },
  {
    reference: "Tao Te Ching, Chapter 8",
    text: "The supreme good is like water, which nourishes all things without trying to. It is content with the low places that people disdain.",
    original_language: "zh",
    author: "Lao Tzu",
    source_url: null,
    copyright_status: "public_domain",
  },
  {
    reference: "Tao Te Ching, Chapter 33",
    text: "Knowing others is intelligence; knowing yourself is true wisdom. Mastering others is strength; mastering yourself is true power.",
    original_language: "zh",
    author: "Lao Tzu",
    source_url: null,
    copyright_status: "public_domain",
  },
  {
    reference: "Tao Te Ching, Chapter 76",
    text: "The stiff and unbending is the disciple of death. The soft and yielding is the disciple of life.",
    original_language: "zh",
    author: "Lao Tzu",
    source_url: null,
    copyright_status: "public_domain",
  },
  // Dhammapada (Buddhism) — ~3rd century BCE, public domain
  {
    reference: "Dhammapada, Verse 1",
    text: "All that we are is the result of what we have thought. The mind is everything. What we think we become.",
    original_language: "pi",
    author: "Dhammapada",
    source_url: null,
    copyright_status: "public_domain",
  },
  {
    reference: "Dhammapada, Verse 183",
    text: "To avoid all evil, to cultivate good, and to purify one's mind — this is the teaching of the Buddhas.",
    original_language: "pi",
    author: "Dhammapada",
    source_url: null,
    copyright_status: "public_domain",
  },
  {
    reference: "Dhammapada, Verse 223",
    text: "Overcome anger by love, overcome evil by good. Overcome the miser by generosity, the liar by truth.",
    original_language: "pi",
    author: "Dhammapada",
    source_url: null,
    copyright_status: "public_domain",
  },
  // Marcus Aurelius — Meditations (~180 CE), public domain
  {
    reference: "Meditations, Book IV, 3",
    text: "Everything we hear is an opinion, not a fact. Everything we see is a perspective, not the truth.",
    original_language: "grc",
    author: "Marcus Aurelius",
    source_url: null,
    copyright_status: "public_domain",
  },
  {
    reference: "Meditations, Book II, 1",
    text: "When you arise in the morning, think of what a precious privilege it is to be alive — to breathe, to think, to enjoy, to love.",
    original_language: "grc",
    author: "Marcus Aurelius",
    source_url: null,
    copyright_status: "public_domain",
  },
  // Epictetus — Enchiridion (~135 CE), public domain
  {
    reference: "Enchiridion, Chapter 1",
    text: "Some things are in our control and others not. Things in our control are opinion, pursuit, desire, aversion.",
    original_language: "grc",
    author: "Epictetus",
    source_url: null,
    copyright_status: "public_domain",
  },
  // Rumi (Sufism) — 13th century, public domain
  {
    reference: "Rumi, Selected Verse 1",
    text: "The wound is the place where the Light enters you.",
    original_language: "fa",
    author: "Rumi",
    source_url: null,
    copyright_status: "public_domain",
  },
  {
    reference: "Rumi, Selected Verse 2",
    text: "What you seek is seeking you.",
    original_language: "fa",
    author: "Rumi",
    source_url: null,
    copyright_status: "public_domain",
  },
  {
    reference: "Rumi, Selected Verse 3",
    text: "Yesterday I was clever, so I wanted to change the world. Today I am wise, so I am changing myself.",
    original_language: "fa",
    author: "Rumi",
    source_url: null,
    copyright_status: "public_domain",
  },
]

// ============================================================================
// FULL COLLECTION CONSTANTS (mode='full')
// ============================================================================

const BIBLE_FULL_BOOKS = [
  { book: 'matthew', chapters: [5,6,7,10,13,18,22,25] },
  { book: 'mark', chapters: [4,10,12] },
  { book: 'luke', chapters: [6,10,12,15] },
  { book: 'john', chapters: [1,3,4,8,10,13,14,15,17] },
  { book: 'psalms', chapters: Array.from({length:50}, (_,i) => i+1) },
  { book: 'proverbs', chapters: Array.from({length:31}, (_,i) => i+1) },
  { book: 'ecclesiastes', chapters: Array.from({length:12}, (_,i) => i+1) },
]

const QURAN_FULL_SURAHS = [1,2,12,18,19,31,36,55,56,67,73,76,87,89,90,91,93,94,95,96,97,99,103,108,109,110,112,113,114]

const GITA_CHAPTERS = [
  {ch:1,v:47},{ch:2,v:72},{ch:3,v:43},{ch:4,v:42},{ch:5,v:29},{ch:6,v:47},
  {ch:7,v:30},{ch:8,v:28},{ch:9,v:34},{ch:10,v:42},{ch:11,v:55},{ch:12,v:20},
  {ch:13,v:35},{ch:14,v:27},{ch:15,v:20},{ch:16,v:24},{ch:17,v:28},{ch:18,v:78},
]

const GUTENBERG_BOOKS = [
  { id: 2680, title: 'Meditations', author: 'Marcus Aurelius', lang: 'grc' },
  { id: 10661, title: 'Discourses of Epictetus', author: 'Epictetus', lang: 'grc' },
]

const SACRED_WISDOM_FULL: CrawledItem[] = [
  // --- Tao Te Ching (Lao Tzu) — 22 chapters ---
  {
    reference: "Tao Te Ching, Chapter 2",
    text: "When people see some things as beautiful, other things become ugly. When people see some things as good, other things become bad. Being and non-being create each other. Difficult and easy support each other.",
    original_language: "zh", author: "Lao Tzu", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Tao Te Ching, Chapter 4",
    text: "The Tao is like a well: used but never used up. It is like the eternal void: filled with infinite possibilities. It is hidden but always present.",
    original_language: "zh", author: "Lao Tzu", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Tao Te Ching, Chapter 5",
    text: "Heaven and earth are impartial; they see the ten thousand things as straw dogs. The wise are impartial; they see the people as straw dogs.",
    original_language: "zh", author: "Lao Tzu", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Tao Te Ching, Chapter 11",
    text: "We join spokes together in a wheel, but it is the center hole that makes the wagon move. We shape clay into a pot, but it is the emptiness inside that holds whatever we want.",
    original_language: "zh", author: "Lao Tzu", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Tao Te Ching, Chapter 16",
    text: "Empty your mind of all thoughts. Let your heart be at peace. Watch the turmoil of beings, but contemplate their return. Returning to the source is stillness, which is the way of nature.",
    original_language: "zh", author: "Lao Tzu", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Tao Te Ching, Chapter 17",
    text: "The best leaders are those the people hardly know exist. The next best is a leader who is loved and praised. Next comes one who is feared. The worst is one who is despised.",
    original_language: "zh", author: "Lao Tzu", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Tao Te Ching, Chapter 22",
    text: "If you want to become whole, let yourself be partial. If you want to become straight, let yourself be crooked. If you want to become full, let yourself be empty.",
    original_language: "zh", author: "Lao Tzu", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Tao Te Ching, Chapter 25",
    text: "There was something formless and perfect before the universe was born. It is serene. Empty. Solitary. Unchanging. Infinite. Eternally present. It is the mother of the universe.",
    original_language: "zh", author: "Lao Tzu", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Tao Te Ching, Chapter 29",
    text: "Do you want to improve the world? I do not think it can be done. The world is sacred. It cannot be improved. If you tamper with it, you will ruin it. If you treat it like an object, you will lose it.",
    original_language: "zh", author: "Lao Tzu", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Tao Te Ching, Chapter 37",
    text: "The Tao never does anything, yet through it all things are done. If powerful men and women could center themselves in it, the whole world would be transformed by itself, in its natural rhythms.",
    original_language: "zh", author: "Lao Tzu", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Tao Te Ching, Chapter 40",
    text: "Return is the movement of the Tao. Yielding is the way of the Tao. All things are born of being. Being is born of non-being.",
    original_language: "zh", author: "Lao Tzu", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Tao Te Ching, Chapter 42",
    text: "The Tao gives birth to One. One gives birth to Two. Two gives birth to Three. Three gives birth to all things. All things carry yin and embrace yang, achieving harmony through their interaction.",
    original_language: "zh", author: "Lao Tzu", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Tao Te Ching, Chapter 44",
    text: "Fame or integrity: which is more important? Money or happiness: which is more valuable? Success or failure: which is more destructive? If you look to others for fulfillment, you will never truly be fulfilled.",
    original_language: "zh", author: "Lao Tzu", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Tao Te Ching, Chapter 48",
    text: "In pursuit of learning, every day something is acquired. In pursuit of Tao, every day something is dropped. Less and less do you need to force things, until finally you arrive at non-action.",
    original_language: "zh", author: "Lao Tzu", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Tao Te Ching, Chapter 63",
    text: "Practice not-doing, and everything will fall into place. Act without acting. Work without effort. Think of the small as large and the few as many. Confront the difficult while it is still easy.",
    original_language: "zh", author: "Lao Tzu", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Tao Te Ching, Chapter 64",
    text: "A journey of a thousand miles begins with a single step. A tree that fills a man's embrace grows from a seedling. A tower nine stories high starts with a single brick.",
    original_language: "zh", author: "Lao Tzu", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Tao Te Ching, Chapter 78",
    text: "Nothing in the world is as soft and yielding as water. Yet for dissolving the hard and inflexible, nothing can surpass it. The soft overcomes the hard; the gentle overcomes the rigid.",
    original_language: "zh", author: "Lao Tzu", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Tao Te Ching, Chapter 80",
    text: "Let there be small communities with few people. Let them have tools but not use them. Let them regard death seriously and not travel far. Even though they have boats and carriages, let no one ride in them.",
    original_language: "zh", author: "Lao Tzu", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Tao Te Ching, Chapter 81",
    text: "True words are not beautiful; beautiful words are not true. Good people do not argue; those who argue are not good. Those who know are not learned; the learned do not know.",
    original_language: "zh", author: "Lao Tzu", source_url: null, copyright_status: "public_domain",
  },
  // --- Dhammapada (Buddhism) — 22 verses ---
  {
    reference: "Dhammapada, Verse 5",
    text: "Hatred does not cease by hatred, but only by love; this is the eternal rule.",
    original_language: "pi", author: "Dhammapada", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Dhammapada, Verse 21",
    text: "Earnestness is the path of immortality; thoughtlessness the path of death. Those who are in earnest do not die; those who are thoughtless are as if dead already.",
    original_language: "pi", author: "Dhammapada", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Dhammapada, Verse 50",
    text: "Let none find fault with others; let none see the omissions and commissions of others. But let one see one's own acts, done and undone.",
    original_language: "pi", author: "Dhammapada", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Dhammapada, Verse 76",
    text: "Look upon the one who shows you your faults as a revealer of treasure; associate with such a wise person. It is better, never worse, to associate with such a one.",
    original_language: "pi", author: "Dhammapada", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Dhammapada, Verse 100",
    text: "Better than a thousand hollow words is one word that brings peace.",
    original_language: "pi", author: "Dhammapada", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Dhammapada, Verse 103",
    text: "Though one should conquer a million men in battle, he who conquers himself is the greatest warrior.",
    original_language: "pi", author: "Dhammapada", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Dhammapada, Verse 127",
    text: "Neither in the sky nor in the depths of the sea, nor in a mountain cave, is there a place on earth where one can escape from the consequences of an evil deed.",
    original_language: "pi", author: "Dhammapada", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Dhammapada, Verse 153",
    text: "Through many a birth in samsara have I wandered in vain, seeking the builder of this house. Repeated birth is suffering! O house-builder, you are seen! You will not build this house again.",
    original_language: "pi", author: "Dhammapada", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Dhammapada, Verse 165",
    text: "By oneself is evil done; by oneself is one defiled. By oneself is evil left undone; by oneself is one made pure. Purity and impurity depend on oneself; no one can purify another.",
    original_language: "pi", author: "Dhammapada", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Dhammapada, Verse 167",
    text: "Do not follow ignoble ways; do not live in heedlessness; do not embrace false views; do not be one who prolongs worldly existence.",
    original_language: "pi", author: "Dhammapada", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Dhammapada, Verse 170",
    text: "Look upon the world as a bubble, look upon it as a mirage. The King of Death does not see one who thus looks upon the world.",
    original_language: "pi", author: "Dhammapada", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Dhammapada, Verse 277",
    text: "All conditioned things are impermanent — when one sees this with wisdom, one turns away from suffering. This is the path to purification.",
    original_language: "pi", author: "Dhammapada", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Dhammapada, Verse 278",
    text: "All conditioned things are unsatisfactory — when one sees this with wisdom, one turns away from suffering. This is the path to purification.",
    original_language: "pi", author: "Dhammapada", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Dhammapada, Verse 279",
    text: "All things are not-self — when one sees this with wisdom, one turns away from suffering. This is the path to purification.",
    original_language: "pi", author: "Dhammapada", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Dhammapada, Verse 280",
    text: "The one who does not rouse oneself when it is time to rise, who though capable is full of sloth, whose will and thought are weak — that lazy and idle person will never find the way to wisdom.",
    original_language: "pi", author: "Dhammapada", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Dhammapada, Verse 381",
    text: "A bhikkhu who delights in earnestness, who looks with fear on thoughtlessness, moves about like fire, burning all his fetters, small or large.",
    original_language: "pi", author: "Dhammapada", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Dhammapada, Verse 382",
    text: "A bhikkhu who delights in earnestness, who looks with fear on thoughtlessness, cannot fall away from the path — he is close to Nibbana.",
    original_language: "pi", author: "Dhammapada", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Dhammapada, Verse 383",
    text: "Cut down the forest of desire, not the forest of trees. From the forest of desire spring danger. Having cut down the forest and the undergrowth, be free from the forest of desire.",
    original_language: "pi", author: "Dhammapada", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Dhammapada, Verse 423",
    text: "He who knows his former lives, who sees the heavens and the states of woe, who has reached the end of births, who has perfected himself in knowledge — him I call a Brahmin.",
    original_language: "pi", author: "Dhammapada", source_url: null, copyright_status: "public_domain",
  },
  // --- Marcus Aurelius, Meditations — 15 passages ---
  {
    reference: "Meditations, Book II, 14",
    text: "Even if you were to live three thousand years or thirty thousand, remember that no one loses any other life than the one now being lived, and no one lives any other life than the one now being lost.",
    original_language: "grc", author: "Marcus Aurelius", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Meditations, Book III, 10",
    text: "Throw away your thirst for books, so that you do not die murmuring, but in true peace, and grateful to the gods from the bottom of your heart.",
    original_language: "grc", author: "Marcus Aurelius", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Meditations, Book IV, 26",
    text: "Think of the life you have lived until now as over and done. From this moment you may begin a new life, as a dead man beginning a new existence.",
    original_language: "grc", author: "Marcus Aurelius", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Meditations, Book V, 16",
    text: "The soul becomes dyed with the color of its thoughts. Soak it then in such trains of thought as: Where life is possible at all, a right life is possible.",
    original_language: "grc", author: "Marcus Aurelius", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Meditations, Book V, 20",
    text: "The impediment to action advances action. What stands in the way becomes the way.",
    original_language: "grc", author: "Marcus Aurelius", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Meditations, Book VI, 6",
    text: "The best revenge is not to be like your enemy.",
    original_language: "grc", author: "Marcus Aurelius", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Meditations, Book VI, 15",
    text: "Look within. Within is the fountain of good, and it will ever bubble up, if you will ever dig.",
    original_language: "grc", author: "Marcus Aurelius", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Meditations, Book VII, 8",
    text: "The happiness of your life depends upon the quality of your thoughts: therefore guard accordingly.",
    original_language: "grc", author: "Marcus Aurelius", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Meditations, Book VII, 59",
    text: "Never value anything as profitable that compels you to break your promise, to lose your self-respect, to hate any man, to suspect, to curse, to act the hypocrite.",
    original_language: "grc", author: "Marcus Aurelius", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Meditations, Book VIII, 47",
    text: "If you are distressed by anything external, the pain is not due to the thing itself, but to your estimate of it; and this you have the power to revoke at any moment.",
    original_language: "grc", author: "Marcus Aurelius", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Meditations, Book IX, 4",
    text: "He who does wrong does wrong against himself. He who acts unjustly acts unjustly to himself, because he makes himself bad.",
    original_language: "grc", author: "Marcus Aurelius", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Meditations, Book X, 16",
    text: "No longer talk about what a good person should be. Be one.",
    original_language: "grc", author: "Marcus Aurelius", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Meditations, Book XI, 18",
    text: "How much more grievous are the consequences of anger than the causes of it.",
    original_language: "grc", author: "Marcus Aurelius", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Meditations, Book XII, 4",
    text: "The object of life is not to be on the side of the majority, but to escape finding oneself in the ranks of the insane.",
    original_language: "grc", author: "Marcus Aurelius", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Meditations, Book XII, 26",
    text: "When you are troubled about anything, you have forgotten that all things happen according to the universal nature, and that a person's wrongful act is nothing to you.",
    original_language: "grc", author: "Marcus Aurelius", source_url: null, copyright_status: "public_domain",
  },
  // --- Epictetus, Enchiridion — 11 chapters ---
  {
    reference: "Enchiridion, Chapter 2",
    text: "Remember that desire promises the attainment of what you desire, and aversion promises the avoidance of what you are averse to. He who fails to obtain the object of his desire is disappointed, and he who incurs the object of his aversion is wretched.",
    original_language: "grc", author: "Epictetus", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Enchiridion, Chapter 5",
    text: "Men are disturbed not by things, but by the views which they take of things. Thus death is nothing terrible, but the terror consists in our notion of death.",
    original_language: "grc", author: "Epictetus", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Enchiridion, Chapter 8",
    text: "Do not seek to have everything that happens happen as you wish, but wish for everything to happen as it actually does happen, and your life will be serene.",
    original_language: "grc", author: "Epictetus", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Enchiridion, Chapter 11",
    text: "Never say about anything, 'I have lost it,' but only 'I have given it back.' Is your child dead? It has been given back. Is your wife dead? She has been given back.",
    original_language: "grc", author: "Epictetus", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Enchiridion, Chapter 15",
    text: "Remember that you must behave in life as at a dinner party. Is anything brought around to you? Put out your hand and take your share with moderation. Does it not yet come to you? Do not desire it.",
    original_language: "grc", author: "Epictetus", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Enchiridion, Chapter 33",
    text: "Immediately prescribe some character and form of behavior for yourself, which you may observe both when alone and in company.",
    original_language: "grc", author: "Epictetus", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Enchiridion, Chapter 46",
    text: "Never call yourself a philosopher, nor talk a great deal among the unlearned about theorems, but act conformably to them. At a feast, do not say how food ought to be eaten, but eat as you ought.",
    original_language: "grc", author: "Epictetus", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Enchiridion, Chapter 48",
    text: "The condition and characteristic of an uninstructed person is this: he never expects from himself profit nor harm, but from externals. The condition of a philosopher is this: he expects all profit and harm from himself.",
    original_language: "grc", author: "Epictetus", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Enchiridion, Chapter 50",
    text: "Whatever rules you have adopted, abide by them as laws, and as if you would be impious to transgress them; and do not regard what anyone says of you, for this is no concern of yours.",
    original_language: "grc", author: "Epictetus", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Enchiridion, Chapter 52",
    text: "The first and most necessary topic in philosophy is the practical application of principles, as 'We ought not to lie.' The second is that of demonstrations, as 'Why we ought not to lie.' The third, 'Why this is a demonstration.'",
    original_language: "grc", author: "Epictetus", source_url: null, copyright_status: "public_domain",
  },
  // --- Rumi (Sufism) — 10 more verses ---
  {
    reference: "Rumi, Selected Verse 4",
    text: "Do not be satisfied with the stories that come before you. Unfold your own myth.",
    original_language: "fa", author: "Rumi", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Rumi, Selected Verse 5",
    text: "Silence is the language of God, all else is poor translation.",
    original_language: "fa", author: "Rumi", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Rumi, Selected Verse 6",
    text: "Let yourself be silently drawn by the strange pull of what you really love. It will not lead you astray.",
    original_language: "fa", author: "Rumi", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Rumi, Selected Verse 7",
    text: "You were born with wings, why prefer to crawl through life?",
    original_language: "fa", author: "Rumi", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Rumi, Selected Verse 8",
    text: "Raise your words, not voice. It is rain that grows flowers, not thunder.",
    original_language: "fa", author: "Rumi", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Rumi, Selected Verse 9",
    text: "The garden of the world has no limits, except in your mind. Its presence is more beautiful than the stars with no name.",
    original_language: "fa", author: "Rumi", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Rumi, Selected Verse 10",
    text: "Respond to every call that excites your spirit.",
    original_language: "fa", author: "Rumi", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Rumi, Selected Verse 11",
    text: "In each moment the fire rages, it will burn away a hundred veils. And carry you a thousand steps toward your goal.",
    original_language: "fa", author: "Rumi", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Rumi, Selected Verse 12",
    text: "Be like the sun for grace and mercy. Be like the night to cover others' faults. Be like running water for generosity. Be like death for rage and anger. Be like the earth for modesty.",
    original_language: "fa", author: "Rumi", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Rumi, Selected Verse 13",
    text: "If you are irritated by every rub, how will your mirror be polished?",
    original_language: "fa", author: "Rumi", source_url: null, copyright_status: "public_domain",
  },
  // --- Hafiz (Sufism) — 5 verses ---
  {
    reference: "Hafiz, Selected Verse 1",
    text: "I wish I could show you, when you are lonely or in darkness, the astonishing light of your own being.",
    original_language: "fa", author: "Hafiz", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Hafiz, Selected Verse 2",
    text: "Fear is the cheapest room in the house. I would like to see you living in better conditions.",
    original_language: "fa", author: "Hafiz", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Hafiz, Selected Verse 3",
    text: "Ever since happiness heard your name, it has been running through the streets trying to find you.",
    original_language: "fa", author: "Hafiz", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Hafiz, Selected Verse 4",
    text: "Even after all this time, the sun never says to the earth, 'You owe me.' Look what happens with a love like that. It lights the whole sky.",
    original_language: "fa", author: "Hafiz", source_url: null, copyright_status: "public_domain",
  },
  {
    reference: "Hafiz, Selected Verse 5",
    text: "The small man builds cages for everyone he knows. While the sage, who has to duck his head when the moon is low, keeps dropping keys all night long for the beautiful, rowdy prisoners.",
    original_language: "fa", author: "Hafiz", source_url: null, copyright_status: "public_domain",
  },
]

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

async function computeHash(text: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("")
}

/**
 * Generate and store an embedding for a crawled_content row using Voyage-3.5.
 * Fire-and-forget style: logs errors but does not throw.
 */
async function generateEmbedding(
  text: string,
  rowId: string,
  reference: string,
  supabase: ReturnType<typeof createClient>,
): Promise<void> {
  const voyageKey = Deno.env.get("VOYAGE_API_KEY")
  if (!voyageKey) return

  try {
    const embRes = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${voyageKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "voyage-3.5",
        input: [text],
        input_type: "document",
      }),
    })

    if (embRes.ok) {
      const embData = await embRes.json()
      const embedding = embData.data?.[0]?.embedding
      if (embedding) {
        const { error: embUpdateErr } = await supabase
          .from("crawled_content")
          .update({ embedding: JSON.stringify(embedding) })
          .eq("id", rowId)

        if (embUpdateErr) {
          console.error(`Embedding update failed for ${reference}:`, embUpdateErr.message)
        }
      }
    } else {
      const errText = await embRes.text()
      console.error(`Voyage API error for ${reference}: ${embRes.status} ${errText}`)
    }
  } catch (embErr) {
    console.error(`Embedding generation failed for ${reference}:`, embErr)
  }
}

// ============================================================================
// SOURCE ADAPTERS
// ============================================================================

// --- Bible API adapter ---
async function fetchBibleVerse(reference: string): Promise<BibleVerse | null> {
  try {
    const response = await fetch(`https://bible-api.com/${reference}`)
    if (!response.ok) return null
    const data = await response.json()
    return {
      reference: data.reference,
      text: data.text,
      translation_name: data.translation_name || "KJV",
    }
  } catch (error) {
    console.error(`Failed to fetch Bible ${reference}:`, error)
    return null
  }
}

// --- Quran Cloud API adapter ---
async function fetchQuranAyah(reference: string): Promise<CrawledItem | null> {
  try {
    const url = `https://api.alquran.cloud/v1/ayah/${reference}/en.sahih`
    const response = await fetch(url)
    if (!response.ok) {
      console.error(`Quran API returned ${response.status} for ${reference}`)
      return null
    }
    const data = await response.json()
    if (data.code !== 200 || !data.data) {
      console.error(`Quran API unexpected response for ${reference}:`, data)
      return null
    }
    const ayah = data.data
    const surahName = ayah.surah?.englishName || ""
    return {
      reference: `Quran ${surahName} ${reference}`,
      text: ayah.text,
      original_language: "ar",
      author: "Sahih International",
      source_url: url,
      copyright_status: "public_domain",
    }
  } catch (error) {
    console.error(`Failed to fetch Quran ${reference}:`, error)
    return null
  }
}

// --- Bhagavad Gita adapter ---
// Attempts the Vedic Scriptures API first; falls back to inline curated data.
async function fetchGitaVerse(chapter: number, verse: number): Promise<CrawledItem | null> {
  try {
    const url = `https://vedicscriptures.github.io/slpiversion/chapter/${chapter}/sloka/${verse}`
    const response = await fetch(url)
    if (!response.ok) return null
    const data = await response.json()
    const text = data.translation || data.transliteration || null
    if (!text) return null
    return {
      reference: `Bhagavad Gita ${chapter}:${verse}`,
      text,
      original_language: "sa",
      author: "Bhagavad Gita (translation)",
      source_url: url,
      copyright_status: "public_domain",
    }
  } catch {
    return null
  }
}

// --- Full mode: Bible chapter fetch ---
function chunkText(text: string, baseRef: string, sourceUrl: string): CrawledItem[] {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 10)
  const items: CrawledItem[] = []
  let current = ''
  let idx = 1
  for (const s of sentences) {
    if (current.length + s.length > 500 && current.length > 100) {
      items.push({
        reference: `${baseRef} (passage ${idx})`,
        text: current.trim(),
        original_language: 'en',
        author: 'KJV',
        source_url: sourceUrl,
        copyright_status: 'public_domain',
      })
      current = s
      idx++
    } else {
      current += (current ? ' ' : '') + s
    }
  }
  if (current.trim().length > 30) {
    items.push({
      reference: `${baseRef} (passage ${idx})`,
      text: current.trim(),
      original_language: 'en',
      author: 'KJV',
      source_url: sourceUrl,
      copyright_status: 'public_domain',
    })
  }
  return items
}

async function fetchBibleChapter(book: string, chapter: number): Promise<CrawledItem[]> {
  try {
    const url = `https://bible-api.com/${book}+${chapter}`
    const response = await fetch(url)
    if (!response.ok) return []
    const data = await response.json()
    return chunkText(data.text || '', data.reference || `${book} ${chapter}`, url)
  } catch (error) {
    console.error(`Failed to fetch Bible ${book} ${chapter}:`, error)
    return []
  }
}

async function fetchQuranSurah(surahNumber: number): Promise<CrawledItem[]> {
  try {
    const url = `https://api.alquran.cloud/v1/surah/${surahNumber}/en.sahih`
    const response = await fetch(url)
    if (!response.ok) return []
    const data = await response.json()
    if (data.code !== 200 || !data.data?.ayahs) return []
    const surahName = data.data.englishName || `Surah ${surahNumber}`
    const items: CrawledItem[] = []
    const ayahs = data.data.ayahs
    for (let i = 0; i < ayahs.length; i += 3) {
      const chunk = ayahs.slice(i, i + 3)
      const text = chunk.map((a: { text: string }) => a.text).join(' ')
      const start = chunk[0].numberInSurah
      const end = chunk[chunk.length - 1].numberInSurah
      items.push({
        reference: `Quran ${surahName} ${surahNumber}:${start}-${end}`,
        text,
        original_language: 'ar',
        author: 'Sahih International',
        source_url: url,
        copyright_status: 'public_domain',
      })
    }
    return items
  } catch (error) {
    console.error(`Failed to fetch Quran surah ${surahNumber}:`, error)
    return []
  }
}

async function fetchGitaChapter(chapter: number, verseCount: number): Promise<CrawledItem[]> {
  const items: CrawledItem[] = []
  for (let v = 1; v <= verseCount; v++) {
    const item = await fetchGitaVerse(chapter, v)
    if (item) items.push(item)
    await new Promise(r => setTimeout(r, 100))
  }
  return items
}

async function fetchGutenberg(bookId: number, title: string, author: string, lang: string): Promise<CrawledItem[]> {
  try {
    const url = `https://www.gutenberg.org/cache/epub/${bookId}/pg${bookId}.txt`
    const response = await fetch(url)
    if (!response.ok) return []
    const fullText = await response.text()
    const startMarker = '*** START OF THE PROJECT GUTENBERG EBOOK'
    const endMarker = '*** END OF THE PROJECT GUTENBERG EBOOK'
    const si = fullText.indexOf(startMarker)
    const ei = fullText.indexOf(endMarker)
    const content = si !== -1 && ei !== -1
      ? fullText.slice(si + startMarker.length + fullText.slice(si).indexOf('\n'), ei)
      : fullText
    const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 50 && p.trim().length < 2000)
    return paragraphs.map((p, i) => ({
      reference: `${title}, Passage ${i + 1}`,
      text: p.trim().replace(/\s+/g, ' '),
      original_language: lang,
      author,
      source_url: url,
      copyright_status: 'public_domain',
    })).filter(item => item.text.length >= 50)
  } catch (error) {
    console.error(`Failed to fetch Gutenberg ${bookId}:`, error)
    return []
  }
}

// ============================================================================
// AI QUALITY FILTER
// ============================================================================

async function evaluateQuality(text: string, anthropicKey: string): Promise<{
  relevance_score: number
  quality_score: number
  counseling_relevance: number
}> {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 500,
        messages: [{
          role: "user",
          content: `Evaluate this spiritual/philosophical text for wisdom content quality.

Text: "${text}"

Rate on a scale of 0-1:
1. Relevance: Does it contain meaningful spiritual/moral wisdom?
2. Quality: Is it well-written, clear, and profound?
3. Counseling: Would this help someone going through emotional difficulty?

Respond with ONLY a JSON object:
{"relevance_score": 0.0, "quality_score": 0.0, "counseling_relevance": 0.0}`,
        }],
      }),
    })

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`)
    }

    const result = await response.json()
    const content = result.content[0].text
    const match = content.match(/\{[^}]+\}/)
    if (!match) {
      return { relevance_score: 0.5, quality_score: 0.5, counseling_relevance: 0.5 }
    }

    const scores = JSON.parse(match[0])
    return {
      relevance_score: Math.max(0, Math.min(1, scores.relevance_score || 0.5)),
      quality_score: Math.max(0, Math.min(1, scores.quality_score || 0.5)),
      counseling_relevance: Math.max(0, Math.min(1, scores.counseling_relevance || 0.5)),
    }
  } catch (error) {
    console.error("Quality evaluation failed:", error)
    return { relevance_score: 0.5, quality_score: 0.5, counseling_relevance: 0.5 }
  }
}

// ============================================================================
// GENERIC ITEM PROCESSOR: dedup -> quality filter -> insert -> embed
// ============================================================================

async function processItem(
  item: CrawledItem,
  sourceId: string,
  result: CrawlResult,
  supabase: ReturnType<typeof createClient>,
  anthropicKey: string,
): Promise<void> {
  result.items_collected++

  // SHA-256 dedup
  const contentHash = await computeHash(item.text)

  const { data: existing } = await supabase
    .from("crawled_content")
    .select("id")
    .eq("content_hash", contentHash)
    .single()

  if (existing) {
    result.items_deduped++
    return
  }

  // AI quality filter
  const { relevance_score, quality_score, counseling_relevance } = await evaluateQuality(item.text, anthropicKey)

  const avg = (relevance_score + quality_score + counseling_relevance) / 3
  const passed = avg >= 0.6
  const status = passed ? "passed" : "rejected"

  if (passed) {
    result.items_passed++
  } else {
    result.items_failed++
  }

  // Insert
  const { data: insertedRow, error: insertError } = await supabase
    .from("crawled_content")
    .insert({
      source_id: sourceId,
      content_hash: contentHash,
      raw_text: item.text,
      original_language: item.original_language,
      author: item.author,
      source_url: item.source_url,
      copyright_status: item.copyright_status,
      relevance_score,
      quality_score,
      status,
    })
    .select("id")
    .single()

  if (insertError) {
    result.errors.push(`Failed to insert ${item.reference}: ${insertError.message}`)
    return
  }

  // Generate embedding (non-blocking, logs its own errors)
  if (insertedRow) {
    await generateEmbedding(item.text, insertedRow.id, item.reference, supabase)
  }
}

// ============================================================================
// SOURCE ADAPTER DISPATCH
// ============================================================================

/**
 * Determine which adapter to use based on source name/type and run it.
 * Returns true if an adapter was found and executed, false otherwise.
 */
async function runAdapter(
  source: Record<string, unknown>,
  result: CrawlResult,
  supabase: ReturnType<typeof createClient>,
  anthropicKey: string,
  mode: 'sample' | 'full' = 'sample',
): Promise<boolean> {
  const name = (source.name as string) || ""
  const sourceId = source.id as string

  // --- Bible API ---
  if (name.includes("Bible")) {
    console.log(`[crawl] Running Bible adapter for "${name}" (mode=${mode})`)
    if (mode === 'full') {
      for (const book of BIBLE_FULL_BOOKS) {
        for (const chapter of book.chapters) {
          console.log(`[crawl] Fetching Bible ${book.book} chapter ${chapter}`)
          const items = await fetchBibleChapter(book.book, chapter)
          for (const item of items) {
            await processItem(item, sourceId, result, supabase, anthropicKey)
          }
          await new Promise(r => setTimeout(r, 200))
        }
      }
    } else {
      for (const passage of BIBLE_WISDOM_PASSAGES) {
        const verse = await fetchBibleVerse(passage)
        if (!verse) {
          result.errors.push(`Failed to fetch Bible ${passage}`)
          continue
        }
        await processItem(
          {
            reference: verse.reference,
            text: verse.text,
            original_language: "en",
            author: verse.translation_name,
            source_url: `https://bible-api.com/${passage}`,
            copyright_status: (source.copyright_status as string) || "public_domain",
          },
          sourceId,
          result,
          supabase,
          anthropicKey,
        )
      }
    }
    return true
  }

  // --- Quran Cloud API ---
  if (name.includes("Quran")) {
    console.log(`[crawl] Running Quran adapter for "${name}" (mode=${mode})`)
    if (mode === 'full') {
      for (const surah of QURAN_FULL_SURAHS) {
        console.log(`[crawl] Fetching Quran surah ${surah}`)
        const items = await fetchQuranSurah(surah)
        for (const item of items) {
          await processItem(item, sourceId, result, supabase, anthropicKey)
        }
        await new Promise(r => setTimeout(r, 200))
      }
    } else {
      for (const ref of QURAN_WISDOM_PASSAGES) {
        const ayah = await fetchQuranAyah(ref)
        if (!ayah) {
          result.errors.push(`Failed to fetch Quran ${ref}`)
          continue
        }
        await processItem(ayah, sourceId, result, supabase, anthropicKey)
      }
    }
    return true
  }

  // --- Bhagavad Gita ---
  if (name.includes("Gita")) {
    console.log(`[crawl] Running Bhagavad Gita adapter for "${name}" (mode=${mode})`)
    if (mode === 'full') {
      for (const { ch, v } of GITA_CHAPTERS) {
        console.log(`[crawl] Fetching Gita chapter ${ch} (${v} verses)`)
        const items = await fetchGitaChapter(ch, v)
        for (const item of items) {
          await processItem(item, sourceId, result, supabase, anthropicKey)
        }
      }
    } else {
      // Try the Vedic Scriptures API for each curated verse; fall back to inline text
      for (const curatedVerse of GITA_WISDOM) {
        // Parse chapter:verse from the reference (e.g. "Bhagavad Gita 2:47")
        const match = curatedVerse.reference.match(/(\d+):(\d+)/)
        let item: CrawledItem = curatedVerse

        if (match) {
          const ch = parseInt(match[1], 10)
          const vs = parseInt(match[2], 10)
          const apiResult = await fetchGitaVerse(ch, vs)
          if (apiResult) {
            item = apiResult
          }
        }

        await processItem(item, sourceId, result, supabase, anthropicKey)
      }
    }
    return true
  }

  // --- Sacred Texts Collection (Taoism, Buddhism, Stoicism, Sufism) ---
  if (name.includes("Sacred") || name.includes("Tao") || name.includes("Philosophy")) {
    console.log(`[crawl] Running Sacred Texts adapter for "${name}" (mode=${mode})`)
    if (mode === 'full') {
      console.log(`[crawl] Processing ${SACRED_WISDOM_FULL.length} sacred texts (full mode)`)
      for (const wisdom of SACRED_WISDOM_FULL) {
        await processItem(wisdom, sourceId, result, supabase, anthropicKey)
      }
    } else {
      for (const wisdom of SACRED_WISDOM) {
        await processItem(wisdom, sourceId, result, supabase, anthropicKey)
      }
    }
    return true
  }

  // --- Gutenberg / Stoic Classics ---
  if (name.includes("Gutenberg") || name.includes("Stoic")) {
    console.log(`[crawl] Running Gutenberg adapter for "${name}"`)
    for (const book of GUTENBERG_BOOKS) {
      console.log(`[crawl] Fetching Gutenberg ${book.title}`)
      const items = await fetchGutenberg(book.id, book.title, book.author, book.lang)
      for (const item of items) {
        await processItem(item, sourceId, result, supabase, anthropicKey)
      }
    }
    return true
  }

  return false
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    )

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY") ?? ""
    if (!anthropicKey) {
      throw new Error("ANTHROPIC_API_KEY not configured")
    }

    const { source_id, force_recrawl, mode = 'sample' }: CrawlRequest = await req.json().catch(() => ({}))

    const result: CrawlResult = {
      sources_processed: 0,
      items_collected: 0,
      items_deduped: 0,
      items_passed: 0,
      items_failed: 0,
      errors: [],
    }

    // Step 1: Fetch active sources
    let query = supabase
      .from("crawl_sources")
      .select("*")
      .eq("is_active", true)

    if (source_id) {
      query = query.eq("id", source_id)
    }

    if (!force_recrawl) {
      query = query.or(
        "last_crawled_at.is.null,last_crawled_at.lt." +
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      )
    }

    const { data: sources, error: sourcesError } = await query

    if (sourcesError) {
      throw new Error(`Failed to fetch sources: ${sourcesError.message}`)
    }

    if (!sources || sources.length === 0) {
      return new Response(
        JSON.stringify({ message: "No sources to crawl", result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      )
    }

    // Step 2: Process each source via its adapter
    for (const source of sources) {
      try {
        result.sources_processed++

        const handled = await runAdapter(source, result, supabase, anthropicKey, mode)

        if (!handled) {
          console.log(`[crawl] Adapter not yet implemented for source: ${source.name} (${source.source_type})`)
          result.errors.push(`Adapter not implemented: ${source.name}`)
        }

        // Update last_crawled_at regardless of adapter outcome
        await supabase
          .from("crawl_sources")
          .update({ last_crawled_at: new Date().toISOString() })
          .eq("id", source.id)

      } catch (sourceError) {
        const msg = sourceError instanceof Error ? sourceError.message : String(sourceError)
        result.errors.push(`Source ${source.name} failed: ${msg}`)
      }
    }

    // Step 3: Audit log (fire-and-forget)
    fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/audit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({
        event_type: "crawl_completed",
        actor_type: "system",
        details: {
          sources_processed: result.sources_processed,
          items_collected: result.items_collected,
          items_passed: result.items_passed,
          items_failed: result.items_failed,
          errors: result.errors,
        },
      }),
    }).catch(err => console.error("Audit log failed:", err))

    return new Response(
      JSON.stringify({ message: "Crawl completed", status: "success", result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    )
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    )
  }
})
