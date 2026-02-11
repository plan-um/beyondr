'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

export type Lang = 'en' | 'ko'

export interface I18n {
  nav: { chat: string; scriptures: string; pricing: string; help: string; login: string; start: string }
  hero: { pre: string; h1_1: string; h1_2: string; sub: string; cta: string; cta2: string }
  features: { title: string; f1: { title: string; desc: string }; f2: { title: string; desc: string }; f3: { title: string; desc: string }; f4: { title: string; desc: string } }
  quote: { text: string; attr: string }
  chat: { title: string; placeholder: string; send: string; personas: string[]; greeting: string; sample: string[] }
  scriptures: { title: string; sub: string; search: string; noResults: string; traditions: string[]; items: { tradition: string; title: string; verses: string; desc: string }[] }
  pricing: { title: string; sub: string; free: { name: string; price: string; period: string; features: string[]; cta: string }; premium: { name: string; price: string; period: string; annual: string; features: string[]; cta: string; badge: string }; launch: string }
  footer: { tagline: string; copy: string; service: string; support: string; terms: string; privacy: string }
  help: {
    title: string
    sections: { id: string; title: string; content: string }[]
    faqTitle: string
    faq: { q: string; a: string }[]
  }
  contact: {
    title: string
    sub: string
    types: string[]
    email: string
    subject: string
    message: string
    submit: string
    success: string
    successSub: string
  }
  scriptureDetail: {
    back: string
    relatedWisdom: string
    reflection: string
    chapter: string
  }
  backToTop: string
}

const translations: Record<Lang, I18n> = {
  en: {
    nav: { chat: 'Counsel', scriptures: 'The Book', pricing: 'Pricing', help: 'Help', login: 'Sign in', start: 'Begin' },
    hero: {
      pre: 'AI spiritual companion',
      h1_1: 'Wisdom beyond',
      h1_2: 'boundaries',
      sub: 'Ancient wisdom, rewritten for modern seekers. One book that holds the essence of every tradition.',
      cta: 'Start a conversation',
      cta2: 'Read The Book',
    },
    features: {
      title: 'Old wisdom. Fresh perspective.',
      f1: { title: 'One book, many roots', desc: 'A unified scripture drawing from Buddhism, Christianity, Islam, Hinduism, Taoism, Stoicism, and more. Different sources, one voice.' },
      f2: { title: 'Four distinct voices', desc: 'A transcendent guide, a warm sage, a meditation teacher, a sharp philosopher. Pick the one that speaks to you.' },
      f3: { title: 'Search by meaning', desc: 'Find wisdom by what it means, not just what it says. AI-powered semantic search across 37+ integrated verses.' },
      f4: { title: 'See how you grow', desc: 'Journal your reflections. Track your questions. Watch your inner landscape shift over time.' },
    },
    quote: {
      text: '\u201CBe still. Then you will see.\u201D',
      attr: '\u2014 The Unified Scripture, 1:7',
    },
    chat: {
      title: 'Your spiritual companion',
      placeholder: 'Life, meaning, doubt, love \u2014 ask anything',
      send: 'Send',
      personas: ['Transcendent', 'Sage', 'Guide', 'Philosopher'],
      greeting: 'Hey. I\'m here whenever you want to think out loud about the big stuff. What\'s been on your mind?',
      sample: [
        'How do different faiths understand suffering?',
        'I feel stuck. Can you help me think?',
        'What actually is consciousness?',
      ],
    },
    scriptures: {
      title: 'The Unified Scripture',
      sub: 'Many traditions, one voice. A new scripture born from ancient wisdom.',
      search: 'Search by meaning or keyword...',
      noResults: 'No results found. Try a different keyword.',
      traditions: ['All', 'Awakening', 'Suffering', 'Love', 'Life & Death', 'Practice'],
      items: [
        { tradition: 'Awakening', title: 'The Path of Awakening', verses: '7 verses', desc: 'Stillness, awareness, and the art of truly seeing. Drawn from Buddhist mindfulness, Taoist flow, and Stoic clarity.' },
        { tradition: 'Suffering', title: 'Suffering and Healing', verses: '8 verses', desc: 'Pain is not punishment \u2014 it is a question. How suffering transforms into understanding and compassion.' },
        { tradition: 'Love', title: 'Love and Connection', verses: '7 verses', desc: 'Love as a way of being, not just a feeling. Compassion, forgiveness, and the courage to truly see another.' },
        { tradition: 'Life & Death', title: 'Life and Death', verses: '7 verses', desc: 'Every moment is a small birth and a small death. Finding peace with impermanence and meaning in existence.' },
        { tradition: 'Practice', title: 'Stillness and Practice', verses: '8 verses', desc: 'Five minutes of nothing can be the deepest work. Everyday rituals that bring you home to yourself.' },
      ],
    },
    pricing: {
      title: 'No tricks. Just two plans.',
      sub: 'Try it free. Upgrade if it clicks.',
      free: {
        name: 'Free',
        price: '$0',
        period: 'no card needed',
        features: ['3 conversations a week', '5 chapters to explore', 'Full scripture library', 'Standard responses'],
        cta: 'Get started',
      },
      premium: {
        name: 'Premium',
        price: '$9.99',
        period: '/ month',
        annual: '$69.99/year \u2014 save 42%',
        features: ['Unlimited conversations', 'Full unified scripture + AI deep analysis', 'All 4 personas unlocked', 'Deep scripture analysis', 'Growth tracking & journal', 'Faster responses'],
        cta: 'Try 7 days free',
        badge: 'Best value',
      },
      launch: 'Early supporter price: $49.99/year (first year only)',
    },
    footer: {
      tagline: 'Wisdom beyond boundaries',
      copy: '\u00A9 2026 beyondr. All rights reserved.',
      service: 'Service',
      support: 'Support',
      terms: 'Terms of Service',
      privacy: 'Privacy Policy',
    },
    help: {
      title: 'Help Center',
      sections: [
        { id: 'what', title: 'What is Beyondr?', content: 'Beyondr is an AI spiritual companion that brings together wisdom from over 30 sacred traditions into one unified experience. Think of it as a thoughtful friend who has read deeply across every spiritual path and can help you find what resonates.' },
        { id: 'scripture', title: 'How to read the Unified Scripture', content: 'The Unified Scripture is organized into 5 chapters, each exploring a universal theme: Awakening, Suffering, Love, Life & Death, and Practice. Each verse draws from multiple traditions but speaks in one integrated voice. Read it sequentially or jump to what calls you. Tap any chapter card to see all its verses, reflections, and related wisdom.' },
        { id: 'ai', title: 'Using AI Counsel', content: 'Our AI counselor draws from 30+ sacred traditions to offer personalized spiritual guidance. Choose from 4 personas \u2014 Transcendent, Sage, Guide, or Philosopher \u2014 each with a different tone and approach. Ask about life, meaning, suffering, love, or anything on your mind. The AI is not a replacement for professional help, but a companion for reflection.' },
        { id: 'plans', title: 'Free vs Premium', content: 'The Free plan gives you 3 conversations per week, access to 5 chapters, and the full scripture library. Premium unlocks unlimited conversations, all 4 personas, deep scripture analysis, growth tracking, and faster responses. Try Premium free for 7 days \u2014 cancel anytime.' },
      ],
      faqTitle: 'Frequently Asked Questions',
      faq: [
        { q: 'Is Beyondr for a specific religion?', a: 'No. Beyondr integrates wisdom from Buddhism, Christianity, Islam, Hinduism, Taoism, Stoicism, Sufism, and more. It is for anyone seeking meaning, regardless of background.' },
        { q: 'Who wrote the Unified Scripture?', a: 'The Unified Scripture was synthesized by AI from dozens of sacred traditions, then carefully curated and refined. It does not replace any original text \u2014 it creates something new from ancient roots.' },
        { q: 'Is my data safe?', a: 'All conversations are encrypted and private. We do not sell your data or share it with third parties. Your spiritual journey stays yours.' },
        { q: 'What happens if I cancel my subscription?', a: 'You keep access until the end of your billing period. Your conversation history and journal entries are preserved, and you can re-subscribe anytime.' },
        { q: 'Can I use Beyondr offline?', a: 'Currently, Beyondr requires an internet connection. We are exploring offline reading for the scripture in a future update.' },
        { q: 'How is this different from ChatGPT?', a: 'Beyondr is purpose-built for spiritual exploration. Every response draws from a curated knowledge base of sacred texts, not general internet data. The personas are designed for depth, not breadth.' },
        { q: 'Can I suggest a tradition to include?', a: 'Absolutely. We are always expanding our sources. Reach out through the Contact page and let us know what tradition speaks to you.' },
        { q: 'Is the AI a real spiritual teacher?', a: 'No. The AI is a tool for reflection, not a guru. It can offer perspectives and help you think, but genuine spiritual growth happens in lived experience, community, and practice.' },
        { q: 'What languages are supported?', a: 'Currently English and Korean. More languages are planned as we grow.' },
        { q: 'How do I delete my account?', a: 'Go to Settings (coming soon) or contact us. We will process your request and delete all associated data within 30 days.' },
      ],
    },
    contact: {
      title: 'Get in touch',
      sub: 'We would love to hear from you. Choose a topic and send us a message.',
      types: ['General', 'Billing', 'Technical', 'Other'],
      email: 'Your email',
      subject: 'Subject',
      message: 'Tell us more...',
      submit: 'Send message',
      success: 'Message sent!',
      successSub: 'We will get back to you within 2 business days.',
    },
    scriptureDetail: {
      back: 'Back to scriptures',
      relatedWisdom: 'Related wisdom',
      reflection: 'Reflection',
      chapter: 'Chapter',
    },
    backToTop: 'Back to top',
  },
  ko: {
    nav: { chat: '\uC0C1\uB2F4', scriptures: '\uACBD\uC804', pricing: '\uAC00\uACA9', help: '\uB3C4\uC6C0\uB9D0', login: '\uB85C\uADF8\uC778', start: '\uC2DC\uC791\uD558\uAE30' },
    hero: {
      pre: 'AI \uC601\uC131 \uB3D9\uBC18\uC790',
      h1_1: '\uACBD\uACC4\uB97C \uB118\uB294',
      h1_2: '\uC9C0\uD61C',
      sub: '\uC624\uB798\uB41C \uC9C0\uD61C\uB97C \uD604\uB300\uC758 \uB208\uC73C\uB85C \uB2E4\uC2DC \uC37C\uC5B4\uC694. \uBAA8\uB4E0 \uC804\uD1B5\uC758 \uC815\uC218\uB97C \uB2F4\uC740 \uD558\uB098\uC758 \uCC45.',
      cta: '\uB300\uD654 \uC2DC\uC791\uD558\uAE30',
      cta2: '\uACBD\uC804 \uC77D\uAE30',
    },
    features: {
      title: '\uC624\uB798\uB41C \uC9C0\uD61C, \uC0C8\uB85C\uC6B4 \uC2DC\uC120',
      f1: { title: '\uD558\uB098\uC758 \uCC45, \uC5EC\uB7EC \uBFCC\uB9AC', desc: '\uBD88\uAD50, \uAE30\uB3C5\uAD50, \uC774\uC2AC\uB78C, \uD78C\uB450\uAD50, \uB3C4\uAD50, \uC2A4\uD1A0\uC544 \uB4F1\uC5D0\uC11C \uC601\uAC10\uC744 \uBC1B\uC740 \uD1B5\uD569 \uACBD\uC804. \uC5EC\uB7EC \uC804\uD1B5\uC774 \uD558\uB098\uC758 \uBAA9\uC18C\uB9AC\uB85C \uB9CC\uB098\uC694.' },
      f2: { title: '4\uBA85\uC758 \uC11C\uB85C \uB2E4\uB978 \uC548\uB0B4\uC790', desc: '\uCD08\uC6D4\uC790, \uC2A4\uC2B9, \uBA85\uC0C1 \uC548\uB0B4\uC790, \uCCA0\uD559\uC790. \uC9C0\uAE08 \uB9C8\uC74C\uC5D0 \uB9DE\uB294 \uBAA9\uC18C\uB9AC\uB97C \uACE8\uB77C\uBCF4\uC138\uC694.' },
      f3: { title: '\uC758\uBBF8\uB85C \uAC80\uC0C9\uD558\uC138\uC694', desc: '\uB2E8\uC5B4\uAC00 \uC544\uB2C8\uB77C \uB73B\uC73C\uB85C \uC9C0\uD61C\uB97C \uCC3E\uC744 \uC218 \uC788\uC5B4\uC694. AI\uAC00 37\uAC1C \uC774\uC0C1\uC758 \uD1B5\uD569 \uACBD\uC804 \uAD6C\uC808\uC744 \uC758\uBBF8 \uAE30\uBC18\uC73C\uB85C \uAC80\uC0C9\uD574 \uB4DC\uB824\uC694.' },
      f4: { title: '\uB098\uC758 \uBCC0\uD654\uB97C \uAE30\uB85D\uD574\uC694', desc: '\uC9C8\uBB38\uC744 \uC801\uACE0, \uC131\uCC30\uC744 \uB0A8\uAE30\uACE0, \uC2DC\uAC04\uC774 \uC9C0\uB098\uBA70 \uB2EC\uB77C\uC9C0\uB294 \uB098\uB97C \uD655\uC778\uD558\uC138\uC694.' },
    },
    quote: {
      text: '\u201C\uBA48\uCDB0 \uBD10. \uADF8\uB7EC\uBA74 \uBCF4\uC77C \uAC70\uC57C.\u201D',
      attr: '\u2014 \uD1B5\uD569 \uACBD\uC804, 1:7',
    },
    chat: {
      title: '\uB098\uB9CC\uC758 \uC601\uC131 \uB3D9\uBC18\uC790',
      placeholder: '\uC0B6, \uC758\uBBF8, \uACE0\uBBFC, \uC0AC\uB791 \u2014 \uBB34\uC5C7\uC774\uB4E0 \uBB3C\uC5B4\uBCF4\uC138\uC694',
      send: '\uBCF4\uB0B4\uAE30',
      personas: ['\uCD08\uC6D4\uC790', '\uC2A4\uC2B9', '\uC548\uB0B4\uC790', '\uCCA0\uD559\uC790'],
      greeting: '\uC548\uB155\uD558\uC138\uC694. \uB9C8\uC74C\uC18D \uAE4A\uC740 \uC774\uC57C\uAE30\uB97C \uD568\uAED8 \uB098\uB220 \uC900\uBE44\uAC00 \uB418\uC5B4 \uC788\uC5B4\uC694. \uC694\uC998 \uC5B4\uB5A4 \uC0DD\uAC01\uC744 \uD558\uACE0 \uACC4\uC138\uC694?',
      sample: [
        '\uACE0\uD1B5\uC744 \uAC01 \uC804\uD1B5\uC5D0\uC11C\uB294 \uC5B4\uB5BB\uAC8C \uBC14\uB77C\uBCFC\uAE4C\uC694?',
        '\uC694\uC998 \uBC29\uD5A5\uC744 \uC783\uC740 \uAC83 \uAC19\uC544\uC694',
        '\uC758\uC2DD\uC774\uB780 \uACB0\uAD6D \uBB58\uAE4C\uC694?',
      ],
    },
    scriptures: {
      title: '\uD1B5\uD569 \uACBD\uC804',
      sub: '\uC5EC\uB7EC \uC804\uD1B5, \uD558\uB098\uC758 \uBAA9\uC18C\uB9AC. \uC624\uB798\uB41C \uC9C0\uD61C\uC5D0\uC11C \uD0DC\uC5B4\uB09C \uC0C8\uB85C\uC6B4 \uACBD\uC804\uC774\uC5D0\uC694.',
      search: '\uC758\uBBF8\uB098 \uD0A4\uC6CC\uB4DC\uB85C \uCC3E\uC544\uBCF4\uC138\uC694...',
      noResults: '\uAC80\uC0C9 \uACB0\uACFC\uAC00 \uC5C6\uC5B4\uC694. \uB2E4\uB978 \uD0A4\uC6CC\uB4DC\uB85C \uCC3E\uC544\uBCF4\uC138\uC694.',
      traditions: ['\uC804\uCCB4', '\uAE68\uC5B4\uB0A8', '\uACE0\uD1B5\uACFC \uCE58\uC720', '\uC0AC\uB791', '\uC0B6\uACFC \uC8FD\uC74C', '\uC218\uD589'],
      items: [
        { tradition: '\uAE68\uC5B4\uB0A8', title: '\uAE68\uC5B4\uB0A8\uC758 \uAE38', verses: '7\uC808', desc: '\uACE0\uC694\uD568, \uC54C\uC544\uCC28\uB9BC, \uC9C4\uC9DC \uBCF4\uB294 \uBC95. \uBD88\uAD50\uC758 \uB9C8\uC74C\uCC59\uAE40, \uB3C4\uAD50\uC758 \uD750\uB984, \uC2A4\uD1A0\uC544\uC758 \uBA85\uB8CC\uD568\uC5D0\uC11C \uC601\uAC10\uC744 \uBC1B\uC558\uC5B4\uC694.' },
        { tradition: '\uACE0\uD1B5\uACFC \uCE58\uC720', title: '\uACE0\uD1B5\uACFC \uCE58\uC720', verses: '8\uC808', desc: '\uACE0\uD1B5\uC740 \uBC8C\uC774 \uC544\uB2C8\uB77C \uC9C8\uBB38\uC774\uC5D0\uC694. \uACE0\uD1B5\uC774 \uC5B4\uB5BB\uAC8C \uC774\uD574\uC640 \uC790\uBE44\uB85C \uBCC0\uD558\uB294\uC9C0 \uB2E4\uB8F0\uC694.' },
        { tradition: '\uC0AC\uB791', title: '\uC0AC\uB791\uACFC \uC5F0\uACB0', verses: '7\uC808', desc: '\uC0AC\uB791\uC740 \uAC10\uC815\uC774 \uC544\uB2C8\uB77C \uC874\uC7AC \uBC29\uC2DD\uC774\uC5D0\uC694. \uC790\uBE44, \uC6A9\uC11C, \uC788\uB294 \uADF8\uB300\uB85C\uB97C \uBC14\uB77C\uBCF4\uB294 \uC6A9\uAE30\uC5D0 \uB300\uD574.' },
        { tradition: '\uC0B6\uACFC \uC8FD\uC74C', title: '\uC0B6\uACFC \uC8FD\uC74C', verses: '7\uC808', desc: '\uB9E4 \uC21C\uAC04\uC740 \uC791\uC740 \uD0C4\uC0DD\uC774\uACE0 \uC791\uC740 \uC8FD\uC74C\uC774\uC5D0\uC694. \uBB34\uC0C1\uD568 \uC18D\uC5D0\uC11C \uD3C9\uD654\uB97C \uCC3E\uACE0, \uC874\uC7AC\uC758 \uC758\uBBF8\uB97C \uBC1C\uACAC\uD574\uC694.' },
        { tradition: '\uC218\uD589', title: '\uACE0\uC694\uC640 \uC218\uD589', verses: '8\uC808', desc: '\uD558\uB8E8 5\uBD84 \uC544\uBB34\uAC83\uB3C4 \uD558\uC9C0 \uC54A\uB294 \uAC83\uC774 \uAC00\uC7A5 \uAE4A\uC740 \uC77C\uC774\uC5D0\uC694. \uB098\uC5D0\uAC8C \uB3CC\uC544\uC624\uB294 \uC77C\uC0C1\uC758 \uC218\uD589.' },
      ],
    },
    pricing: {
      title: '\uBCF5\uC7A1\uD55C \uAC70 \uC5C6\uC5B4\uC694',
      sub: '\uBB34\uB8CC\uB85C \uC368\uBCF4\uACE0, \uB9C8\uC74C\uC5D0 \uB4E4\uBA74 \uC5C5\uADF8\uB808\uC774\uB4DC\uD558\uC138\uC694.',
      free: {
        name: '\uBB34\uB8CC',
        price: '\u20A90',
        period: '\uCE74\uB4DC \uB4F1\uB85D \uC5C6\uC774',
        features: ['\uC8FC 3\uD68C \uB300\uD654', '5\uAC1C \uC7A5 \uC5F4\uB78C', '\uACBD\uC804 \uC804\uCCB4 \uC5F4\uB78C', '\uAE30\uBCF8 \uC751\uB2F5'],
        cta: '\uC2DC\uC791\uD558\uAE30',
      },
      premium: {
        name: '\uD504\uB9AC\uBBF8\uC5C4',
        price: '\u20A913,900',
        period: '/ \uC6D4',
        annual: '\u20A999,000/\uB144 \u2014 42% \uC808\uC57D',
        features: ['\uB300\uD654 \uD69F\uC218 \uC81C\uD55C \uC5C6\uC74C', '\uD1B5\uD569 \uACBD\uC804 \uC804\uCCB4 + AI \uC2EC\uCE35 \uD574\uC11D', '4\uBA85\uC758 \uC548\uB0B4\uC790 \uBAA8\uB450 \uC0AC\uC6A9', '\uACBD\uC804 \uC2EC\uCE35 \uD574\uC11D', '\uC131\uC7A5 \uAE30\uB85D & \uC77C\uAE30', '\uBE60\uB978 \uC751\uB2F5'],
        cta: '7\uC77C \uBB34\uB8CC \uCCB4\uD5D8',
        badge: '\uCD94\uCC9C',
      },
      launch: '\uC5BC\uB9AC \uC11C\uD3EC\uD130 \uAC00\uACA9: \uCCAB\uD574 \u20A969,000/\uB144',
    },
    footer: {
      tagline: '\uACBD\uACC4\uB97C \uB118\uB294 \uC9C0\uD61C',
      copy: '\u00A9 2026 beyondr. All rights reserved.',
      service: '\uC11C\uBE44\uC2A4',
      support: '\uC9C0\uC6D0',
      terms: '\uC774\uC6A9\uC57D\uAD00',
      privacy: '\uAC1C\uC778\uC815\uBCF4\uCC98\uB9AC\uBC29\uCE68',
    },
    help: {
      title: '\uB3C4\uC6C0\uB9D0',
      sections: [
        { id: 'what', title: 'Beyondr\uAC00 \uBB58\uAC00\uC694?', content: 'Beyondr\uB294 30\uAC1C \uC774\uC0C1\uC758 \uC601\uC131 \uC804\uD1B5\uC5D0\uC11C \uC9C0\uD61C\uB97C \uBAA8\uC544 \uD558\uB098\uC758 \uD1B5\uD569 \uACBD\uD5D8\uC73C\uB85C \uB9CC\uB4E0 AI \uC601\uC131 \uB3D9\uBC18\uC790\uC608\uC694. \uBAA8\uB4E0 \uC601\uC801 \uAE38\uC744 \uAE4A\uC774 \uC77D\uC740 \uC0AC\uB824 \uAE4A\uC740 \uCE5C\uAD6C\uB77C\uACE0 \uC0DD\uAC01\uD574 \uC8FC\uC138\uC694.' },
        { id: 'scripture', title: '\uD1B5\uD569 \uACBD\uC804 \uC77D\uB294 \uBC95', content: '\uD1B5\uD569 \uACBD\uC804\uC740 5\uAC1C\uC758 \uC7A5\uC73C\uB85C \uAD6C\uC131\uB418\uC5B4 \uC788\uC5B4\uC694. \uAE68\uC5B4\uB0A8, \uACE0\uD1B5\uACFC \uCE58\uC720, \uC0AC\uB791, \uC0B6\uACFC \uC8FD\uC74C, \uC218\uD589. \uAC01 \uC808\uC740 \uC5EC\uB7EC \uC804\uD1B5\uC5D0\uC11C \uC601\uAC10\uC744 \uBC1B\uC558\uC9C0\uB9CC \uD558\uB098\uC758 \uD1B5\uD569\uB41C \uBAA9\uC18C\uB9AC\uB85C \uB9D0\uD574\uC694. \uC21C\uC11C\uB300\uB85C \uC77D\uC5B4\uB3C4 \uC88B\uACE0, \uB04C\uB9AC\uB294 \uC7A5\uBD80\uD130 \uC77D\uC5B4\uB3C4 \uC88B\uC544\uC694. \uC7A5 \uCE74\uB4DC\uB97C \uB204\uB974\uBA74 \uBAA8\uB4E0 \uC808\uACFC \uBAA9\uC0C1 \uC9C8\uBB38, \uAD00\uB828 \uC9C0\uD61C\uB97C \uBCFC \uC218 \uC788\uC5B4\uC694.' },
        { id: 'ai', title: 'AI \uC0C1\uB2F4 \uD65C\uC6A9\uBC95', content: 'AI \uC0C1\uB2F4\uC0AC\uB294 30\uAC1C \uC774\uC0C1\uC758 \uC601\uC131 \uC804\uD1B5\uC744 \uBC14\uD0D5\uC73C\uB85C \uB9DE\uCDA4\uD615 \uC601\uC801 \uC548\uB0B4\uB97C \uB4DC\uB824\uC694. \uCD08\uC6D4\uC790, \uC2A4\uC2B9, \uC548\uB0B4\uC790, \uCCA0\uD559\uC790 4\uBA85\uC758 \uD398\uB974\uC18C\uB098 \uC911 \uC120\uD0DD\uD560 \uC218 \uC788\uC5B4\uC694. \uC0B6, \uC758\uBBF8, \uACE0\uD1B5, \uC0AC\uB791 \uB4F1 \uBB34\uC5C7\uC774\uB4E0 \uBB3C\uC5B4\uBCF4\uC138\uC694. AI\uB294 \uC804\uBB38 \uC0C1\uB2F4\uC744 \uB300\uCCB4\uD558\uC9C0 \uC54A\uC9C0\uB9CC, \uC131\uCC30\uC758 \uB3D9\uBC18\uC790\uAC00 \uB418\uC5B4 \uB4DC\uB824\uC694.' },
        { id: 'plans', title: '\uBB34\uB8CC vs \uD504\uB9AC\uBBF8\uC5C4', content: '\uBB34\uB8CC \uD50C\uB79C\uC740 \uC8FC 3\uD68C \uB300\uD654, 5\uAC1C \uC7A5 \uC5F4\uB78C, \uACBD\uC804 \uC804\uCCB4 \uC5F4\uB78C\uC774 \uAC00\uB2A5\uD574\uC694. \uD504\uB9AC\uBBF8\uC5C4\uC740 \uBB34\uC81C\uD55C \uB300\uD654, 4\uBA85\uC758 \uC548\uB0B4\uC790, \uC2EC\uCE35 \uD574\uC11D, \uC131\uC7A5 \uAE30\uB85D, \uBE60\uB978 \uC751\uB2F5\uC744 \uC81C\uACF5\uD574\uC694. 7\uC77C \uBB34\uB8CC \uCCB4\uD5D8 \uD6C4 \uC5B8\uC81C\uB4E0 \uCDE8\uC18C\uD560 \uC218 \uC788\uC5B4\uC694.' },
      ],
      faqTitle: '\uC790\uC8FC \uBB3B\uB294 \uC9C8\uBB38',
      faq: [
        { q: 'Beyondr\uB294 \uD2B9\uC815 \uC885\uAD50\uB97C \uC704\uD55C \uC11C\uBE44\uC2A4\uC778\uAC00\uC694?', a: '\uC544\uB2C8\uC694. \uBD88\uAD50, \uAE30\uB3C5\uAD50, \uC774\uC2AC\uB78C, \uD78C\uB450\uAD50, \uB3C4\uAD50, \uC2A4\uD1A0\uC544, \uC218\uD53C\uC998 \uB4F1 \uC5EC\uB7EC \uC804\uD1B5\uC758 \uC9C0\uD61C\uB97C \uD1B5\uD569\uD588\uC5B4\uC694. \uBC30\uACBD\uC5D0 \uC0C1\uAD00\uC5C6\uC774 \uC758\uBBF8\uB97C \uCC3E\uB294 \uBAA8\uB4E0 \uBD84\uC744 \uC704\uD55C \uC11C\uBE44\uC2A4\uC608\uC694.' },
        { q: '\uD1B5\uD569 \uACBD\uC804\uC740 \uB204\uAC00 \uC4F4 \uAC74\uAC00\uC694?', a: '\uC218\uC2ED \uAC1C\uC758 \uC601\uC131 \uC804\uD1B5\uC744 AI\uAC00 \uD1B5\uD569\uD558\uACE0, \uC138\uC2EC\uD558\uAC8C \uB2E4\uB4EC\uC5C8\uC5B4\uC694. \uC5B4\uB5A4 \uC6D0\uC804\uB3C4 \uB300\uCCB4\uD558\uC9C0 \uC54A\uC544\uC694. \uC624\uB798\uB41C \uBFCC\uB9AC\uC5D0\uC11C \uC0C8\uB85C\uC6B4 \uAC83\uC744 \uB9CC\uB4E0 \uAC70\uC608\uC694.' },
        { q: '\uAC1C\uC778 \uC815\uBCF4\uB294 \uC548\uC804\uD55C\uAC00\uC694?', a: '\uBAA8\uB4E0 \uB300\uD654\uB294 \uC554\uD638\uD654\uB418\uC5B4 \uC788\uACE0, \uAC1C\uC778 \uC815\uBCF4\uB97C \uD310\uB9E4\uD558\uAC70\uB098 \uC81C3\uC790\uC640 \uACF5\uC720\uD558\uC9C0 \uC54A\uC544\uC694. \uB2F9\uC2E0\uC758 \uC601\uC801 \uC5EC\uC815\uC740 \uB2F9\uC2E0\uB9CC\uC758 \uAC83\uC774\uC5D0\uC694.' },
        { q: '\uAD6C\uB3C5\uC744 \uCDE8\uC18C\uD558\uBA74 \uB370\uC774\uD130\uB294 \uC5B4\uB5BB\uAC8C \uB418\uB098\uC694?', a: '\uACB0\uC81C \uAE30\uAC04\uC774 \uB05D\uB0A0 \uB54C\uAE4C\uC9C0 \uC774\uC6A9\uD560 \uC218 \uC788\uC5B4\uC694. \uB300\uD654 \uAE30\uB85D\uACFC \uC77C\uAE30\uB294 \uBCF4\uC874\uB418\uACE0, \uC5B8\uC81C\uB4E0 \uB2E4\uC2DC \uAD6C\uB3C5\uD560 \uC218 \uC788\uC5B4\uC694.' },
        { q: '\uC624\uD504\uB77C\uC778\uC5D0\uC11C\uB3C4 \uC0AC\uC6A9\uD560 \uC218 \uC788\uB098\uC694?', a: '\uD604\uC7AC\uB294 \uC778\uD130\uB137 \uC5F0\uACB0\uC774 \uD544\uC694\uD574\uC694. \uD5A5\uD6C4 \uC5C5\uB370\uC774\uD2B8\uC5D0\uC11C \uACBD\uC804 \uC624\uD504\uB77C\uC778 \uC77D\uAE30\uB97C \uAC80\uD1A0\uD558\uACE0 \uC788\uC5B4\uC694.' },
        { q: 'ChatGPT\uC640 \uBB50\uAC00 \uB2E4\uB978\uAC00\uC694?', a: 'Beyondr\uB294 \uC601\uC801 \uD0D0\uAD6C\uB97C \uC704\uD574 \uD2B9\uBCC4\uD788 \uB9CC\uB4E4\uC5B4\uC84C\uC5B4\uC694. \uBAA8\uB4E0 \uC751\uB2F5\uC740 \uACBD\uC804 \uC9C0\uC2DD\uC744 \uAE30\uBC18\uC73C\uB85C \uD574\uC694. \uC77C\uBC18 \uC778\uD130\uB137 \uB370\uC774\uD130\uAC00 \uC544\uB2C8\uB77C \uAE4A\uC774 \uC788\uB294 \uC548\uB0B4\uB97C \uB4DC\uB824\uC694.' },
        { q: '\uD3EC\uD568\uD560 \uC804\uD1B5\uC744 \uC81C\uC548\uD560 \uC218 \uC788\uB098\uC694?', a: '\uBB3C\uB860\uC774\uC5D0\uC694. \uBB38\uC758 \uD398\uC774\uC9C0\uC5D0\uC11C \uC5F0\uB77D\uD574 \uC8FC\uC138\uC694. \uC5B4\uB5A4 \uC804\uD1B5\uC774 \uB9C8\uC74C\uC5D0 \uC640\uB2FF\uB294\uC9C0 \uC54C\uB824\uC8FC\uC2DC\uBA74 \uBC18\uC601\uC744 \uAC80\uD1A0\uD560\uAC8C\uC694.' },
        { q: 'AI\uAC00 \uC9C4\uC9DC \uC601\uC801 \uC2A4\uC2B9\uC778\uAC00\uC694?', a: '\uC544\uB2C8\uC694. AI\uB294 \uC131\uCC30\uC744 \uC704\uD55C \uB3C4\uAD6C\uC608\uC694. \uAD00\uC810\uC744 \uC81C\uC2DC\uD558\uACE0 \uC0DD\uAC01\uC744 \uB3C4\uC6B8 \uC218 \uC788\uC9C0\uB9CC, \uC9C4\uC815\uD55C \uC131\uC7A5\uC740 \uC2E4\uC81C \uACBD\uD5D8, \uACF5\uB3D9\uCCB4, \uC218\uD589\uC5D0\uC11C \uC77C\uC5B4\uB098\uC694.' },
        { q: '\uC5B4\uB5A4 \uC5B8\uC5B4\uB97C \uC9C0\uC6D0\uD558\uB098\uC694?', a: '\uD604\uC7AC \uC601\uC5B4\uC640 \uD55C\uAD6D\uC5B4\uB97C \uC9C0\uC6D0\uD574\uC694. \uC131\uC7A5\uC5D0 \uB530\uB77C \uB354 \uB9CE\uC740 \uC5B8\uC5B4\uB97C \uCD94\uAC00\uD560 \uACC4\uD68D\uC774\uC5D0\uC694.' },
        { q: '\uACC4\uC815\uC744 \uC0AD\uC81C\uD558\uB824\uBA74 \uC5B4\uB5BB\uAC8C \uD558\uB098\uC694?', a: '\uC124\uC815(\uACE7 \uCD94\uAC00 \uC608\uC815)\uC5D0\uC11C \uD558\uAC70\uB098 \uBB38\uC758\uD574 \uC8FC\uC138\uC694. 30\uC77C \uC774\uB0B4\uC5D0 \uBAA8\uB4E0 \uAD00\uB828 \uB370\uC774\uD130\uB97C \uC0AD\uC81C\uD574 \uB4DC\uB824\uC694.' },
      ],
    },
    contact: {
      title: '\uBB38\uC758\uD558\uAE30',
      sub: '\uAD81\uAE08\uD55C \uC810\uC774 \uC788\uC73C\uBA74 \uD3B8\uD558\uAC8C \uBCF4\uB0B4\uC8FC\uC138\uC694.',
      types: ['\uC77C\uBC18 \uBB38\uC758', '\uACB0\uC81C \uBB38\uC758', '\uAE30\uC220 \uBB38\uC758', '\uAE30\uD0C0'],
      email: '\uC774\uBA54\uC77C \uC8FC\uC18C',
      subject: '\uC81C\uBAA9',
      message: '\uB0B4\uC6A9\uC744 \uC801\uC5B4\uC8FC\uC138\uC694...',
      submit: '\uBCF4\uB0B4\uAE30',
      success: '\uBB38\uC758\uAC00 \uC811\uC218\uB418\uC5C8\uC5B4\uC694!',
      successSub: '\uC601\uC5C5\uC77C \uAE30\uC900 2\uC77C \uC774\uB0B4\uC5D0 \uB2F5\uBCC0 \uB4DC\uB9B4\uAC8C\uC694.',
    },
    scriptureDetail: {
      back: '\uACBD\uC804 \uBAA9\uB85D\uC73C\uB85C',
      relatedWisdom: '\uAD00\uB828 \uC9C0\uD61C',
      reflection: '\uBAA9\uC0C1 \uC9C8\uBB38',
      chapter: '\uC7A5',
    },
    backToTop: '\uB9E8 \uC704\uB85C',
  },
}

interface I18nContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: I18n
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('en')

  return (
    <I18nContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
