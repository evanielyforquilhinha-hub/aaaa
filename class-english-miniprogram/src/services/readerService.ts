import { buildContentBlocks, getArticleSentences } from '@/features/reader/content'
import type { Article } from '@/features/reader/types'
import {
  getArticleByIndex,
  getArticleCount,
  listArticles,
} from '@/repositories/articleRepository'
import {
  getCachedArticleLearningContent,
  getCachedWordExplanation,
} from '@/repositories/learningContentRepository'

export function getReaderArticles(): Article[] {
  return listArticles()
}

export function getReaderArticleByIndex(index: number): Article {
  return getArticleByIndex(index)
}

export function getReaderArticleCount(): number {
  return getArticleCount()
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
