# Backend Cloud Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move articles, article learning content, vocabulary, review records, and user stats from local mock/storage toward WeChat cloud database and cloud functions without changing frontend pages in the backend window.

**Architecture:** Keep the current page -> mp-safe facade -> service -> repository boundary. The backend window only creates or updates `cloudfunctions/*`, backend seed/check scripts, and backend docs; frontend repository switching is a later handoff and must not touch `src/pages/*`. Cloud functions own auth, data assembly, AI generation, and writes; repositories later decide when to call them and when to fall back to local mock/storage.

**Tech Stack:** WeChat Mini Program cloud functions, `wx-server-sdk`, WeChat cloud database, Node.js CommonJS cloud function entrypoints, existing uni-app/Vue frontend as consumer.

---

## Scope Lock

- Do not modify `src/pages/*` in this backend implementation window.
- Do not directly edit `dist/build/mp-weixin` or root fallback mini-program output.
- Do not put `OPENAI_API_KEY`, real keys, or prompt secrets in `src`, docs, seed data, or generated output.
- Do not change PRD data fields unless `docs/backend-architecture-prd.md` is updated first.
- Do not add a self-hosted server, payment system, CMS, or user account system.
- Backend acceptance is independent first; frontend repository integration starts only after content read functions and vocabulary functions return the PRD contracts.

## Implementation Files

Create:
- `class-english-miniprogram/cloudfunctions/getArticleList/index.js`
- `class-english-miniprogram/cloudfunctions/getArticleList/package.json`
- `class-english-miniprogram/cloudfunctions/getArticleDetail/index.js`
- `class-english-miniprogram/cloudfunctions/getArticleDetail/package.json`
- `class-english-miniprogram/cloudfunctions/getArticleLearningContent/index.js`
- `class-english-miniprogram/cloudfunctions/getArticleLearningContent/package.json`
- `class-english-miniprogram/cloudfunctions/seedContent/index.js`
- `class-english-miniprogram/cloudfunctions/seedContent/package.json`
- `class-english-miniprogram/cloudfunctions/seedContent/seed-data.js`
- `class-english-miniprogram/cloudfunctions/addVocabularyWord/index.js`
- `class-english-miniprogram/cloudfunctions/addVocabularyWord/package.json`
- `class-english-miniprogram/cloudfunctions/getVocabularyList/index.js`
- `class-english-miniprogram/cloudfunctions/getVocabularyList/package.json`
- `class-english-miniprogram/cloudfunctions/reviewVocabularyWord/index.js`
- `class-english-miniprogram/cloudfunctions/reviewVocabularyWord/package.json`
- `class-english-miniprogram/cloudfunctions/removeVocabularyWord/index.js`
- `class-english-miniprogram/cloudfunctions/removeVocabularyWord/package.json`
- `class-english-miniprogram/cloudfunctions/getUserStats/index.js`
- `class-english-miniprogram/cloudfunctions/getUserStats/package.json`
- `class-english-miniprogram/cloudfunctions/updateArticleProgress/index.js`
- `class-english-miniprogram/cloudfunctions/updateArticleProgress/package.json`
- `class-english-miniprogram/scripts/backend-smoke-check.cjs`

Modify:
- `class-english-miniprogram/cloudfunctions/generateArticleLearningContent/index.js`
- `class-english-miniprogram/cloudfunctions/generateArticleLearningContent/package.json` only if the function package needs metadata alignment.
- `class-english-miniprogram/package.json` to add `check:backend`.
- `class-english-miniprogram/docs/backend-architecture-prd.md` only if implementation discovers a contract mismatch.

Do not modify:
- `class-english-miniprogram/src/pages/*`
- `class-english-miniprogram/dist/build/mp-weixin/*`
- root fallback `pages`, `utils`, `common`, or `static` output.

---

### Task 1: Add Backend Smoke Check

**Files:**
- Create: `class-english-miniprogram/scripts/backend-smoke-check.cjs`
- Modify: `class-english-miniprogram/package.json`

- [ ] **Step 1: Write the failing smoke check**

Create `scripts/backend-smoke-check.cjs` with these checks:

```js
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const requiredFunctions = [
  'getArticleList',
  'getArticleDetail',
  'getArticleLearningContent',
  'generateArticleLearningContent',
  'seedContent',
  'addVocabularyWord',
  'getVocabularyList',
  'reviewVocabularyWord',
  'removeVocabularyWord',
  'getUserStats',
  'updateArticleProgress',
]

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8')
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath))
}

function assert(condition, message) {
  if (!condition) {
    console.error(`Backend smoke check failed: ${message}`)
    process.exit(1)
  }
}

for (const name of requiredFunctions) {
  assert(exists(`cloudfunctions/${name}/index.js`), `missing cloudfunctions/${name}/index.js`)
  assert(exists(`cloudfunctions/${name}/package.json`), `missing cloudfunctions/${name}/package.json`)
  const source = read(`cloudfunctions/${name}/index.js`)
  assert(source.includes('wx-server-sdk'), `${name} must use wx-server-sdk`)
  assert(source.includes('cloud.init'), `${name} must initialize cloud`)
  assert(source.includes('exports.main'), `${name} must export main`)
}

const frontendFiles = [
  ...fs.readdirSync(path.join(root, 'src'), { recursive: true })
    .filter((item) => String(item).endsWith('.ts') || String(item).endsWith('.vue'))
    .map((item) => path.join('src', String(item))),
]

for (const file of frontendFiles) {
  const source = read(file)
  assert(!source.includes('OPENAI_API_KEY'), `frontend file contains OPENAI_API_KEY marker: ${file}`)
  assert(!source.includes('api.openai.com'), `frontend file contains OpenAI endpoint marker: ${file}`)
}

const generator = read('cloudfunctions/generateArticleLearningContent/index.js')
for (const marker of [
  'MISSING_OPENAI_API_KEY',
  'OPENAI_BASE_URL',
  'OPENAI_MODEL',
  'articleLearningContent',
  'status: \\'pending\\'',
  'status: \\'ready\\'',
  'status: \\'failed\\'',
]) {
  assert(generator.includes(marker), `generateArticleLearningContent missing marker: ${marker}`)
}

console.log('Backend smoke checks passed')
```

- [ ] **Step 2: Add the package script**

Add this script entry without changing existing scripts:

```json
"check:backend": "node scripts/backend-smoke-check.cjs"
```

- [ ] **Step 3: Run the smoke check and confirm it fails before backend functions exist**

Run: `npm.cmd run check:backend`  
Expected: FAIL with the first missing cloud function, such as `missing cloudfunctions/getArticleList/index.js`.

---

### Task 2: Create Seed Content Function

**Files:**
- Create: `class-english-miniprogram/cloudfunctions/seedContent/index.js`
- Create: `class-english-miniprogram/cloudfunctions/seedContent/package.json`
- Create: `class-english-miniprogram/cloudfunctions/seedContent/seed-data.js`

- [ ] **Step 1: Create the function package**

Use this `package.json`:

```json
{
  "name": "seed-content",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "^3.0.1"
  }
}
```

- [ ] **Step 2: Create seed data with the current three article IDs**

Create `seed-data.js` exporting two arrays:

```js
exports.articles = [
  {
    _id: 'bugs-bright-clothes',
    id: 'bugs-bright-clothes',
    title: 'Bugs Love Your Bright Clothes',
    wordCount: 252,
    level: 'CET-6',
    visualSymbol: 'Y',
    visualCaption: 'Color cues and insect vision',
    source: 'Annie Daily',
    tags: ['science', 'cet-6'],
    sortOrder: 10,
    status: 'published',
    createdAt: 1782921600000,
    updatedAt: 1782921600000,
    publishedAt: 1782921600000,
  },
  {
    _id: 'walking',
    id: 'walking',
    title: 'The Quiet Power of Walking',
    wordCount: 285,
    level: 'CET-4',
    visualSymbol: 'W',
    visualCaption: 'Nature, rhythm, and attention',
    source: 'Stanford Medicine',
    tags: ['health', 'cet-4'],
    sortOrder: 20,
    status: 'published',
    createdAt: 1782921600000,
    updatedAt: 1782921600000,
    publishedAt: 1782921600000,
  },
  {
    _id: 'dreams',
    id: 'dreams',
    title: 'Why Some People Remember Their Dreams',
    wordCount: 262,
    level: 'CET-6',
    visualSymbol: 'D',
    visualCaption: 'Sleep, memory, and recall',
    source: 'Nature Neuroscience',
    tags: ['sleep', 'cet-6'],
    sortOrder: 30,
    status: 'published',
    createdAt: 1782921600000,
    updatedAt: 1782921600000,
    publishedAt: 1782921600000,
  },
]

exports.articleLearningContent = [
  {
    _id: 'bugs-bright-clothes',
    articleId: 'bugs-bright-clothes',
    status: 'ready',
    provider: 'local-prebuilt',
    model: 'local-prebuilt',
    updatedAt: '2026-06-23',
    generatedAt: 1782921600000,
    sentenceTranslations: {},
    wordExplanations: {},
    reviewedPhrases: [],
  },
]
```

Then copy the exact `content`, `theme`, `sentenceTranslations`, `wordExplanations`, and `reviewedPhrases` values from `src/features/reader/articles.ts` and `src/utils/learningContent.ts` for all three article IDs. Keep the PRD shapes: `sentenceTranslations` and `wordExplanations` are records, not arrays.

- [ ] **Step 3: Implement idempotent seed writes**

Use `doc(_id).set({ data })` so repeated seed runs replace the same three article documents and three learning-content documents:

```js
const cloud = require('wx-server-sdk')
const { articles, articleLearningContent } = require('./seed-data')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async () => {
  const articleResults = []
  const contentResults = []

  for (const article of articles) {
    await db.collection('articles').doc(article._id).set({ data: article })
    articleResults.push(article.id)
  }

  for (const content of articleLearningContent) {
    await db.collection('articleLearningContent').doc(content._id).set({ data: content })
    contentResults.push(content.articleId)
  }

  return {
    ok: true,
    data: {
      articles: articleResults,
      articleLearningContent: contentResults,
    },
  }
}
```

- [ ] **Step 4: Verify in WeChat DevTools**

Run the `seedContent` cloud function in WeChat DevTools.  
Expected: `articles` contains `bugs-bright-clothes`, `walking`, `dreams`; `articleLearningContent` contains matching ready records.

---

### Task 3: Create Content Read Cloud Functions

**Files:**
- Create: `class-english-miniprogram/cloudfunctions/getArticleList/index.js`
- Create: `class-english-miniprogram/cloudfunctions/getArticleList/package.json`
- Create: `class-english-miniprogram/cloudfunctions/getArticleDetail/index.js`
- Create: `class-english-miniprogram/cloudfunctions/getArticleDetail/package.json`
- Create: `class-english-miniprogram/cloudfunctions/getArticleLearningContent/index.js`
- Create: `class-english-miniprogram/cloudfunctions/getArticleLearningContent/package.json`

- [ ] **Step 1: Create package files**

Each function uses this package shape, changing only `name`:

```json
{
  "name": "get-article-list",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "^3.0.1"
  }
}
```

- [ ] **Step 2: Implement `getArticleList`**

```js
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

exports.main = async (event = {}) => {
  const level = event.level ? String(event.level) : ''
  const tag = event.tag ? String(event.tag) : ''
  const limit = Math.max(1, Math.min(Number(event.limit || 20), 50))
  const skip = Math.max(0, Number(event.cursor || 0))
  const where = { status: 'published' }

  if (level) where.level = level
  if (tag) where.tags = _.all([tag])

  const result = await db
    .collection('articles')
    .where(where)
    .orderBy('sortOrder', 'asc')
    .orderBy('publishedAt', 'desc')
    .skip(skip)
    .limit(limit)
    .get()

  const nextCursor = result.data.length === limit ? String(skip + limit) : null
  return { ok: true, data: result.data, nextCursor }
}
```

- [ ] **Step 3: Implement `getArticleDetail`**

```js
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event = {}) => {
  const articleId = String(event.articleId || '').trim()
  if (!articleId) return fail('INVALID_ARTICLE_ID', 'articleId is required')

  const result = await db.collection('articles').where({ id: articleId }).limit(1).get()
  const article = result.data[0]
  if (!article) return fail('ARTICLE_NOT_FOUND', 'Article was not found')
  if (article.status !== 'published') return fail('ARTICLE_NOT_PUBLISHED', 'Article is not published')

  return { ok: true, data: article }
}

function fail(code, message) {
  return { ok: false, code, message }
}
```

- [ ] **Step 4: Implement `getArticleLearningContent`**

```js
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event = {}) => {
  const articleId = String(event.articleId || '').trim()
  if (!articleId) return fail('INVALID_ARTICLE_ID', 'articleId is required')

  const result = await db.collection('articleLearningContent').where({ articleId }).limit(1).get()
  return { ok: true, data: result.data[0] || null }
}

function fail(code, message) {
  return { ok: false, code, message }
}
```

- [ ] **Step 5: Verify content functions in WeChat DevTools**

Run:
- `getArticleList` with `{ "limit": 20 }`
- `getArticleDetail` with `{ "articleId": "bugs-bright-clothes" }`
- `getArticleLearningContent` with `{ "articleId": "bugs-bright-clothes" }`

Expected:
- list returns three published articles after seeding
- detail returns the requested article
- learning content returns `status: "ready"` and record-shaped `sentenceTranslations`

---

### Task 4: Harden `generateArticleLearningContent`

**Files:**
- Modify: `class-english-miniprogram/cloudfunctions/generateArticleLearningContent/index.js`

- [ ] **Step 1: Change input contract to `articleId` plus optional `force`**

Replace the current requirement for `event.article.content` with database lookup:

```js
const articleId = String(event.articleId || '').trim()
const force = event.force === true

if (!articleId) {
  return fail('INVALID_ARTICLE_ID', 'articleId is required')
}

const article = await readPublishedOrDraftArticle(articleId)
if (!article) {
  return fail('ARTICLE_NOT_FOUND', 'Article was not found')
}
```

- [ ] **Step 2: Respect ready cache unless `force` is true**

```js
const cached = await readCachedContent(articleId)
if (cached?.status === 'ready' && !force) {
  return { ok: true, source: 'cache', data: cached }
}
```

- [ ] **Step 3: Write `pending` before calling OpenAI**

```js
await db.collection(COLLECTION).doc(articleId).set({
  data: {
    _id: articleId,
    articleId,
    status: 'pending',
    provider: 'cloud-cache',
    model: OPENAI_MODEL,
    updatedAt: new Date().toISOString(),
    generatedAt: null,
    sentenceTranslations: {},
    wordExplanations: {},
    reviewedPhrases: [],
  },
})
```

- [ ] **Step 4: Normalize AI arrays into PRD records**

```js
function normalizeGeneratedContent(content) {
  const sentenceTranslations = {}
  const wordExplanations = {}

  for (const item of content.sentenceTranslations || []) {
    const key = `${Number(item.blockIndex)}:${Number(item.sentenceIndex)}`
    sentenceTranslations[key] = {
      text: String(item.text || ''),
      translation: String(item.translation || ''),
      note: String(item.note || ''),
    }
  }

  for (const item of content.wordExplanations || []) {
    const key = normalizeWord(item.word)
    if (!key) continue
    wordExplanations[key] = {
      word: String(item.word || ''),
      phonetic: String(item.phonetic || ''),
      partOfSpeech: String(item.partOfSpeech || ''),
      meaning: String(item.meaning || ''),
      example: String(item.example || ''),
      exampleTranslation: String(item.exampleTranslation || ''),
      note: item.note ? String(item.note) : undefined,
    }
  }

  return {
    sentenceTranslations,
    wordExplanations,
    reviewedPhrases: (content.reviewedPhrases || []).map((phrase) => ({
      text: String(phrase.text || ''),
      meaning: String(phrase.meaning || ''),
      reason: String(phrase.reason || ''),
    })),
  }
}

function normalizeWord(word) {
  return String(word || '').toLowerCase().replace(/[^a-z']/g, '')
}
```

- [ ] **Step 5: Write `ready` or `failed` state**

On success, write:

```js
const data = {
  _id: articleId,
  articleId,
  status: 'ready',
  provider: 'cloud-cache',
  model: OPENAI_MODEL,
  updatedAt: new Date().toISOString(),
  generatedAt: Date.now(),
  ...generated,
}

await db.collection(COLLECTION).doc(articleId).set({ data })
return { ok: true, source: 'generated', data }
```

On failure, write:

```js
await db.collection(COLLECTION).doc(articleId).set({
  data: {
    _id: articleId,
    articleId,
    status: 'failed',
    provider: 'cloud-cache',
    model: OPENAI_MODEL,
    updatedAt: new Date().toISOString(),
    generatedAt: null,
    errorCode: readErrorCode(error),
    errorMessage: String(error.message || error),
    sentenceTranslations: {},
    wordExplanations: {},
    reviewedPhrases: [],
  },
})
```

- [ ] **Step 6: Verify missing API key path**

Run `generateArticleLearningContent` in WeChat DevTools without `OPENAI_API_KEY` and with `{ "articleId": "bugs-bright-clothes" }`.  
Expected: `{ "ok": false, "code": "MISSING_OPENAI_API_KEY" }` and no frontend file contains the key.

---

### Task 5: Create Vocabulary Cloud Functions

**Files:**
- Create: `class-english-miniprogram/cloudfunctions/addVocabularyWord/index.js`
- Create: `class-english-miniprogram/cloudfunctions/addVocabularyWord/package.json`
- Create: `class-english-miniprogram/cloudfunctions/getVocabularyList/index.js`
- Create: `class-english-miniprogram/cloudfunctions/getVocabularyList/package.json`
- Create: `class-english-miniprogram/cloudfunctions/reviewVocabularyWord/index.js`
- Create: `class-english-miniprogram/cloudfunctions/reviewVocabularyWord/package.json`
- Create: `class-english-miniprogram/cloudfunctions/removeVocabularyWord/index.js`
- Create: `class-english-miniprogram/cloudfunctions/removeVocabularyWord/package.json`

- [ ] **Step 1: Create package files**

Each function uses `wx-server-sdk` with the same package shape as Task 3.

- [ ] **Step 2: Implement openid helper inside each user-data function**

```js
function getOpenid() {
  const wxContext = cloud.getWXContext()
  return wxContext.OPENID || wxContext.FROM_OPENID || ''
}
```

Each function must fail with `MISSING_OPENID` if this returns an empty string.

- [ ] **Step 3: Implement `addVocabularyWord`**

Normalize by lowercasing and stripping non-letter apostrophe characters:

```js
function normalizeWord(word) {
  return String(word || '').toLowerCase().replace(/[^a-z']/g, '')
}
```

Use this behavior:
- query `{ openid, normalizedWord }`
- if active record exists, return `{ ok: true, data: record, duplicated: true }`
- if soft-deleted record exists, restore it with `deletedAt: null`, new explanation fields, `updatedAt`
- if no record exists, create `_id` as `${openid}_${normalizedWord}` with `addTime`, `nextReviewTime`, `familiarity: 0`, `reviewCount: 0`, `correctCount: 0`

- [ ] **Step 4: Implement `getVocabularyList`**

Use filters:
- `openid`
- `deletedAt: null`
- when `dueOnly === true`, `nextReviewTime <= Date.now()`

Return:

```js
{
  ok: true,
  data: result.data,
  nextCursor: result.data.length === limit ? String(skip + limit) : null,
}
```

- [ ] **Step 5: Implement `reviewVocabularyWord`**

Use the current frontend algorithm:

```js
function calculateReview(word, result, now) {
  const familiarityBefore = Number(word.familiarity || 0)
  const nextReviewTimeBefore = Number(word.nextReviewTime || now)
  const reviewCount = Number(word.reviewCount || 0) + 1
  const correctCount = result === 'known' ? Number(word.correctCount || 0) + 1 : Number(word.correctCount || 0)
  const familiarityAfter =
    result === 'known'
      ? Math.min(5, familiarityBefore + 1)
      : Math.max(0, familiarityBefore - 1)
  const nextReviewTimeAfter = now + Math.pow(2, familiarityAfter) * 86400000

  return {
    familiarityBefore,
    familiarityAfter,
    nextReviewTimeBefore,
    nextReviewTimeAfter,
    reviewCount,
    correctCount,
  }
}
```

Update only the current openid's vocabulary record and add a `reviewRecords` document with `result`, `familiarityBefore`, `familiarityAfter`, `nextReviewTimeBefore`, `nextReviewTimeAfter`, and `reviewedAt`.

- [ ] **Step 6: Implement `removeVocabularyWord`**

Validate ownership with `{ _id: vocabularyId, openid }`, then update `deletedAt` and `updatedAt` to `Date.now()`.

- [ ] **Step 7: Verify vocabulary behavior in WeChat DevTools**

Run:
- `addVocabularyWord` twice with the same `word`
- `getVocabularyList` with `{ "limit": 20 }`
- `reviewVocabularyWord` with the returned `vocabularyId`
- `removeVocabularyWord` with the returned `vocabularyId`

Expected:
- second add returns `duplicated: true`
- review increments `reviewCount`
- review writes one `reviewRecords` document
- remove soft-deletes instead of deleting the document

---

### Task 6: Create User Stats And Article Progress Functions

**Files:**
- Create: `class-english-miniprogram/cloudfunctions/getUserStats/index.js`
- Create: `class-english-miniprogram/cloudfunctions/getUserStats/package.json`
- Create: `class-english-miniprogram/cloudfunctions/updateArticleProgress/index.js`
- Create: `class-english-miniprogram/cloudfunctions/updateArticleProgress/package.json`

- [ ] **Step 1: Implement `getUserStats`**

Return a shape compatible with `src/pages/me/me.vue`:

```js
{
  ok: true,
  data: {
    total,
    reviewed,
    mastered,
    todayReview,
    todayAdded,
  },
}
```

Compute from `userVocabulary`:
- `total`: current openid, `deletedAt: null`
- `reviewed`: `reviewCount > 0`
- `mastered`: `familiarity >= 4`
- `todayReview`: active words with `nextReviewTime <= Date.now()`
- `todayAdded`: active words with `addTime` inside the local day start/end

- [ ] **Step 2: Implement `updateArticleProgress`**

Use `_id = `${openid}_${articleId}`` and upsert these fields:

```js
{
  _id,
  openid,
  articleId,
  readPercent,
  lastSentenceId,
  highlightedSentenceIds,
  keySentenceIds,
  completed,
  readDurationSeconds,
  lastReadAt: Date.now(),
  updatedAt: Date.now(),
}
```

Clamp `readPercent` between `0` and `100`, coerce sentence arrays to arrays of strings, and preserve existing values when an optional field is not provided.

- [ ] **Step 3: Verify stats and progress**

Run:
- `getUserStats` after adding and reviewing one word
- `updateArticleProgress` with `{ "articleId": "bugs-bright-clothes", "readPercent": 42 }`

Expected:
- stats returns numeric `total`, `reviewed`, `mastered`, `todayReview`, `todayAdded`
- `userArticleProgress` has one document for current openid and article

---

### Task 7: Run Local Backend Checks

**Files:**
- No source edits.

- [ ] **Step 1: Run backend smoke check**

Run: `npm.cmd run check:backend`  
Expected: `Backend smoke checks passed`.

- [ ] **Step 2: Run existing UI smoke check to confirm no page regression markers changed**

Run: `npm.cmd run check:ui`  
Expected: `UI smoke checks passed`.

- [ ] **Step 3: Search for forbidden API key markers outside cloud functions**

Run: `rg -n "OPENAI_API_KEY|api.openai.com" src pages utils common static dist`  
Expected: no matches outside cloud function code. If `dist` does not exist, rerun against existing paths only and record that `dist` was absent.

---

### Task 8: Cloud Deployment Checklist

**Files:**
- No local source edits unless WeChat DevTools reports a deploy-time package issue.

- [ ] **Step 1: Create or verify cloud database collections**

In WeChat DevTools cloud database, verify these collections exist:
- `articles`
- `articleLearningContent`
- `userVocabulary`
- `reviewRecords`
- `userArticleProgress`

- [ ] **Step 2: Upload and deploy functions**

Deploy:
- `seedContent`
- `getArticleList`
- `getArticleDetail`
- `getArticleLearningContent`
- `generateArticleLearningContent`
- `addVocabularyWord`
- `getVocabularyList`
- `reviewVocabularyWord`
- `removeVocabularyWord`
- `getUserStats`
- `updateArticleProgress`

- [ ] **Step 3: Set AI environment variables only on `generateArticleLearningContent`**

Set:
- `OPENAI_API_KEY`
- `OPENAI_BASE_URL`
- `OPENAI_MODEL`

Do not set or write these in frontend code.

- [ ] **Step 4: Run backend acceptance calls**

Run the acceptance sequence:
1. `seedContent` with `{}`
2. `getArticleList` with `{ "limit": 20 }`
3. `getArticleDetail` with `{ "articleId": "bugs-bright-clothes" }`
4. `getArticleLearningContent` with `{ "articleId": "bugs-bright-clothes" }`
5. `generateArticleLearningContent` without API key or in a test env missing key
6. `addVocabularyWord` with a real word payload
7. `reviewVocabularyWord` with returned vocabulary id
8. `getUserStats` with `{}`

Expected:
- content functions return seeded data
- missing API key returns `MISSING_OPENAI_API_KEY`
- vocabulary functions isolate data by current openid
- review writes `reviewRecords`

---

### Task 9: Frontend Handoff Boundary

**Files:**
- No backend implementation edits.
- No `src/pages/*` edits in this backend plan.

- [ ] **Step 1: Document the handoff facts in the final implementation note**

Include:
- cloud function names
- request/response shapes that match `backend-architecture-prd.md`
- seed article IDs
- cloud environment ID if the user provides or initializes it
- known limitations, including sync-to-async migration for `vocabularyRepository`

- [ ] **Step 2: Stop before repository integration**

Frontend repository work is a separate plan or execution window:
- `src/repositories/articleRepository.ts`
- `src/repositories/learningContentRepository.ts`
- `src/repositories/vocabularyRepository.ts`
- necessary `src/services/*` or `src/utils/*Service.ts` facade changes

That later work must still avoid direct `src/pages/*` cloud calls and preserve local fallback.

---

## Self-Review

Spec coverage:
- PRD Milestone 1 is covered by Task 2 and Task 8.
- PRD Milestone 2 is covered by Task 3.
- PRD Milestone 3 is covered by Task 4.
- PRD Milestone 4 is covered by Task 5 and Task 6.
- PRD Milestone 5 is intentionally not implemented here; Task 9 defines the handoff because the user asked not to change frontend pages.

Risk checks:
- API Key remains cloud-function-only.
- Ordinary users read only `published` articles through content read functions.
- User data functions derive openid from WeChat context and reject empty openid.
- Local fallback remains untouched because no repository or page integration is performed in this backend window.

Verification:
- Local static checks: `npm.cmd run check:backend`, `npm.cmd run check:ui`.
- Cloud checks: seed and function calls in WeChat DevTools.
- Build is not required for backend-only cloud function changes unless later repository/frontend code changes are made.
