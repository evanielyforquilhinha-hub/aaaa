import { articles } from '@/features/reader/articles'
import type { Article } from '@/features/reader/types'

export function listArticles(): Article[] {
  return articles
}

export function getArticleByIndex(index: number): Article {
  const safeIndex = Math.max(0, Math.min(index, articles.length - 1))
  return articles[safeIndex]
}

export function getArticleCount(): number {
  return articles.length
}
