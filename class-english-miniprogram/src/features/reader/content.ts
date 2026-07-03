import { parseParagraph, splitParagraphs, splitSentences, type TextToken } from '@/utils/wordParser'
import {
  getCachedSentenceTranslation,
  getReviewedPhraseTexts,
  type SentenceTranslation,
} from '@/utils/learningContent'
import type { Article, ContentBlock, ReaderToken } from './types'

export function normalizePhraseWords(phrase: string): string[] {
  return phrase
    .toLowerCase()
    .match(/[a-z']+/g) || []
}

export function markReviewedPhrases(tokens: TextToken[], articleId: string): ReaderToken[] {
  const phrases = getReviewedPhraseTexts(articleId)
  if (!phrases.length) return tokens

  const wordTokens = tokens
    .map((token, index) => ({
      index,
      normalized: token.type === 'word' ? token.normalized || token.text.toLowerCase().replace(/[^a-z']/g, '') : '',
    }))
    .filter((token) => token.normalized)
  const emphasizedTokenIndexes = new Set<number>()

  for (const phrase of phrases) {
    const phraseWords = normalizePhraseWords(phrase)
    if (!phraseWords.length) continue

    for (let start = 0; start <= wordTokens.length - phraseWords.length; start += 1) {
      const matches = phraseWords.every((word, offset) => wordTokens[start + offset]?.normalized === word)
      if (!matches) continue
      for (let offset = 0; offset < phraseWords.length; offset += 1) {
        emphasizedTokenIndexes.add(wordTokens[start + offset].index)
      }
    }
  }

  return tokens.map((token, index) => (
    emphasizedTokenIndexes.has(index) ? { ...token, emphasis: true } : token
  ))
}

export function buildContentBlocks(article: Article): ContentBlock[] {
  return splitParagraphs(article.content).map((text, blockIndex) => {
    const blockId = `block-${article.id}-${blockIndex}`
    return {
      id: blockId,
      index: blockIndex,
      sentences: splitSentences(text).map((sentenceText, sentenceIndex) => {
        const sentenceTranslation: SentenceTranslation = getCachedSentenceTranslation(
          article.id,
          blockIndex,
          sentenceIndex,
          sentenceText,
        )

        return {
          id: `sentence-${article.id}-${blockIndex}-${sentenceIndex}`,
          blockId,
          blockIndex,
          index: sentenceIndex,
          tokens: markReviewedPhrases(parseParagraph(sentenceText), article.id),
          plainText: sentenceText,
          translation: sentenceTranslation.translation,
          translationNote: sentenceTranslation.note,
          audioUrl: sentenceTranslation.audioUrl,
        }
      }),
    }
  })
}

export function getArticleSentences(article: Article): string[] {
  return splitSentences(article.content)
}
