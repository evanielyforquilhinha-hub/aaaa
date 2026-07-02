# Lightweight Data Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a lightweight `services` and `repositories` boundary so the mini program can keep using local mock data now and switch to cloud database/cloud functions later without rewriting pages.

**Architecture:** Pages call services. Services coordinate reader content, learning content, and vocabulary actions. Repositories hide whether data comes from local files, storage, cloud database, or cloud functions. This first pass keeps implementation local-only and avoids changing UI behavior.

**Tech Stack:** uni-app, Vue 3, TypeScript, WeChat Mini Program build target.

---

### Task 1: Add Reader And Learning Content Repositories

**Files:**
- Create: `src/repositories/articleRepository.ts`
- Create: `src/repositories/learningContentRepository.ts`

- [ ] **Step 1: Create article repository**

```ts
import { articles } from '@/features/reader/articles'
import type { Article } from '@/features/reader/types'

export function listArticles(): Article[] {
  return articles
}

export function getArticleByIndex(index: number): Article {
  return articles[Math.max(0, Math.min(index, articles.length - 1))]
}

export function getArticleCount(): number {
  return articles.length
}
```

- [ ] **Step 2: Create learning content repository**

```ts
import {
  getCachedArticleLearningContent,
  getCachedSentenceTranslation,
  getCachedWordExplanation,
  getReviewedPhraseTexts,
} from '@/utils/learningContent'

export {
  getCachedArticleLearningContent,
  getCachedSentenceTranslation,
  getCachedWordExplanation,
  getReviewedPhraseTexts,
}
```

### Task 2: Add Reader And Vocabulary Services

**Files:**
- Create: `src/services/readerService.ts`
- Create: `src/repositories/vocabularyRepository.ts`
- Create: `src/services/vocabularyService.ts`

- [ ] **Step 1: Create reader service**

```ts
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

export function getReaderArticles() {
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
```

- [ ] **Step 2: Create vocabulary repository and service**

```ts
import { addWord } from '@/utils/storage'

export { addWord }
```

```ts
import type { WordLookup } from '@/utils/dictionary'
import { addWord } from '@/repositories/vocabularyRepository'

export function addVocabularyWord(lookup: WordLookup) {
  return addWord(lookup)
}
```

### Task 3: Route Reader Page Through Services

**Files:**
- Modify: `src/pages/index/index.vue`
- Modify: `scripts/ui-smoke-check.cjs`
- Modify: `docs/frontend-architecture-map.md`

- [ ] **Step 1: Replace direct data imports in reader page**

Use `readerService` for article list, content blocks, sentences, learning content, and word explanations. Use `vocabularyService` for adding words. Keep the template and styles unchanged.

- [ ] **Step 2: Update architecture smoke checks**

Require `src/services/readerService.ts`, `src/services/vocabularyService.ts`, `src/repositories/articleRepository.ts`, `src/repositories/learningContentRepository.ts`, and `src/repositories/vocabularyRepository.ts`.

- [ ] **Step 3: Update architecture map**

Document the `services` and `repositories` layers as the future cloud database/cloud function boundary.

### Task 4: Verify

**Files:**
- No source edits.

- [ ] **Step 1: Run type check**

Run: `npm.cmd exec vue-tsc -- --noEmit`  
Expected: exit code 0.

- [ ] **Step 2: Run UI architecture smoke check**

Run: `npm.cmd run check:ui`  
Expected: `UI smoke checks passed`.

- [ ] **Step 3: Build WeChat Mini Program**

Run: `npm.cmd run build:mp-weixin`  
Expected: build exits 0 and syncs mp-weixin output to root fallback files.

- [ ] **Step 4: Run final smoke check**

Run: `npm.cmd run check:ui`  
Expected: `UI smoke checks passed`.
