import { buildContentBlocks, getArticleSentences } from '@/utils/readerContent'
import { articles } from '@/utils/readerArticles'
import {
  getCachedArticleLearningContent,
  getCachedWordExplanation,
} from '@/utils/learningContent'
import type { Article } from '@/features/reader/types'

export function getReaderArticles(): Article[] {
  return articles
}

export function getReaderArticleByIndex(index: number): Article {
  const safeIndex = Math.max(0, Math.min(index, articles.length - 1))
  return articles[safeIndex]
}

export function getReaderArticleCount(): number {
  return articles.length
}

export function getReaderContentBlocks(article: Article) {
  return buildContentBlocks(article)
}

export function getReaderSentences(article: Article): string[] {
  return getArticleSentences(article)
}

export function getReaderLearningContent(articleId: string) {
  return getCachedArticleLearningContent(articleId)
}

export function getReaderWordExplanation(articleId: string, word: string) {
  return getCachedWordExplanation(articleId, word)
}
