import type { WordLookup } from '@/utils/dictionary'
import { addWord } from '@/utils/storage'

export function addVocabularyWord(lookup: WordLookup) {
  return addWord(lookup)
}
