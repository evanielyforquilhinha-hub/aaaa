/**
 * 生词本存储工具（基于小程序 Storage）
 */

import type { WordLookup } from './dictionary'

export interface VocabWord {
  id: string
  word: string
  phonetic: string
  partOfSpeech: string
  meaning: string
  example: string
  exampleTranslation: string
  addTime: number
  nextReviewTime: number
  familiarity: number
  reviewCount: number
  correctCount: number
}

const STORAGE_KEY = 'vocab_words'

export function loadVocab(): VocabWord[] {
  try {
    const raw = uni.getStorageSync(STORAGE_KEY)
    if (raw) {
      return JSON.parse(raw) as VocabWord[]
    }
  } catch {}
  return []
}

export function saveVocab(words: VocabWord[]): void {
  try {
    uni.setStorageSync(STORAGE_KEY, JSON.stringify(words))
  } catch {}
}

export function addWord(lookup: WordLookup): VocabWord | null {
  const words = loadVocab()
  const key = lookup.word.toLowerCase()
  if (words.some((w) => w.word.toLowerCase() === key)) {
    return null
  }
  const item: VocabWord = {
    id: `w-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    word: lookup.word,
    phonetic: lookup.phonetic,
    partOfSpeech: lookup.partOfSpeech,
    meaning: lookup.meaning,
    example: lookup.example,
    exampleTranslation: lookup.exampleTranslation,
    addTime: Date.now(),
    nextReviewTime: Date.now(),
    familiarity: 0,
    reviewCount: 0,
    correctCount: 0,
  }
  words.unshift(item)
  saveVocab(words)
  return item
}

export function removeWord(id: string): void {
  const words = loadVocab().filter((w) => w.id !== id)
  saveVocab(words)
}

export function reviewWord(id: string, correct: boolean): void {
  const words = loadVocab()
  const idx = words.findIndex((w) => w.id === id)
  if (idx === -1) return

  const w = words[idx]
  w.reviewCount++

  if (correct) {
    w.correctCount++
    w.familiarity = Math.min(5, w.familiarity + 1)
  } else {
    w.familiarity = Math.max(0, w.familiarity - 1)
  }

  const intervalDays = Math.pow(2, w.familiarity)
  w.nextReviewTime = Date.now() + intervalDays * 86400000
  saveVocab(words)
}

export function getTodayReviewWords(): VocabWord[] {
  return loadVocab().filter((w) => w.nextReviewTime <= Date.now())
}

export function getStats() {
  const words = loadVocab()
  const total = words.length
  const reviewed = words.filter((w) => w.reviewCount > 0).length
  const mastered = words.filter((w) => w.familiarity >= 4).length
  const todayReview = getTodayReviewWords().length
  const todayAdded = words.filter((w) => {
    const d = new Date(w.addTime)
    const now = new Date()
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    )
  }).length
  return { total, reviewed, mastered, todayReview, todayAdded }
}
