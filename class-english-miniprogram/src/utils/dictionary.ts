export interface WordLookup {
  word: string
  phonetic: string
  partOfSpeech: string
  meaning: string
  example: string
  exampleTranslation: string
  audioUrl?: string
}

const dictionary: Record<string, WordLookup> = {
  avoid: { word: 'avoid', phonetic: '/əˈvɔɪd/', partOfSpeech: 'v.', meaning: 'avoid; keep away from', example: 'Avoid heavy traffic if possible.', exampleTranslation: 'If possible, avoid rush-hour traffic.' },
  attract: { word: 'attract', phonetic: '/əˈtrækt/', partOfSpeech: 'v.', meaning: 'attract; draw in', example: 'Flowers attract bees and butterflies.', exampleTranslation: 'Flowers attract bees and butterflies.' },
  pollinator: { word: 'pollinator', phonetic: '/ˈpɒlɪneɪtər/', partOfSpeech: 'n.', meaning: 'pollinator', example: 'Bees are important pollinators.', exampleTranslation: 'Bees are important pollinators.' },
  nectar: { word: 'nectar', phonetic: '/ˈnektər/', partOfSpeech: 'n.', meaning: 'nectar; sweet liquid', example: 'Bees collect nectar from flowers.', exampleTranslation: 'Bees collect nectar from flowers.' },
  pollen: { word: 'pollen', phonetic: '/ˈpɒlən/', partOfSpeech: 'n.', meaning: 'pollen', example: 'Butterflies carry pollen from flower to flower.', exampleTranslation: 'Butterflies carry pollen between flowers.' },
  compound: { word: 'compound', phonetic: '/ˈkɒmpaʊnd/', partOfSpeech: 'adj.', meaning: 'compound; complex', example: 'Insects have compound eyes.', exampleTranslation: 'Insects have compound eyes.' },
  beacon: { word: 'beacon', phonetic: '/ˈbiːkən/', partOfSpeech: 'n.', meaning: 'beacon; signal light', example: 'The smoke signal acted as a beacon.', exampleTranslation: 'The smoke signal served as a guide.' },
  partly: { word: 'partly', phonetic: '/ˈpɑːrtli/', partOfSpeech: 'adv.', meaning: 'partly; to some degree', example: 'I am partly responsible for the project.', exampleTranslation: 'I bear some responsibility for this project.' },
  sensitive: { word: 'sensitive', phonetic: '/ˈsensətɪv/', partOfSpeech: 'adj.', meaning: 'sensitive; easily affected', example: 'He is sensitive to criticism.', exampleTranslation: 'He is very sensitive to criticism.' },
  ultraviolet: { word: 'ultraviolet', phonetic: '/ˌʌltrəˈvaɪələt/', partOfSpeech: 'n.', meaning: 'ultraviolet', example: 'Ultraviolet rays can damage your skin.', exampleTranslation: 'UV rays can harm your skin.' },
  picnic: { word: 'picnic', phonetic: '/ˈpɪknɪk/', partOfSpeech: 'n.', meaning: 'picnic', example: 'We are going out for a picnic.', exampleTranslation: 'We are going to the park for a picnic.' },
  skip: { word: 'skip', phonetic: '/skɪp/', partOfSpeech: 'v.', meaning: 'skip; omit', example: 'Skip the yellow shirt this time.', exampleTranslation: 'Skip the yellow shirt.' },
  insect: { word: 'insect', phonetic: '/ˈɪnsekt/', partOfSpeech: 'n.', meaning: 'insect', example: 'There are many insects in the garden.', exampleTranslation: 'There are many insects in the garden.' },
  popular: { word: 'popular', phonetic: '/ˈpɒpjʊlər/', partOfSpeech: 'adj.', meaning: 'popular; well-liked', example: 'She is popular with her classmates.', exampleTranslation: 'She is very popular among classmates.' },
  feast: { word: 'feast', phonetic: '/fiːst/', partOfSpeech: 'n.', meaning: 'feast; banquet', example: 'A feast of nectar and pollen.', exampleTranslation: 'A feast of nectar and pollen.' },
  bright: { word: 'bright', phonetic: '/braɪt/', partOfSpeech: 'adj.', meaning: 'bright; vivid', example: 'Bright yellow flowers attract bees.', exampleTranslation: 'Bright yellow flowers attract bees.' },
}

export function lookupWord(word: string): WordLookup | null {
  const key = word.toLowerCase().replace(/[^a-z']/g, '')
  return dictionary[key] || null
}
