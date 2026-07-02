import type { WordLookup } from '@/utils/dictionary'
import { addWord } from '@/repositories/vocabularyRepository'

export function addVocabularyWord(lookup: WordLookup) {
  return addWord(lookup)
}
