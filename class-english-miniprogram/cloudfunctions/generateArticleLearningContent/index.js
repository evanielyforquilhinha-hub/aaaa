const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const COLLECTION = 'articleLearningContent'
const OPENAI_API_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1/responses'
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5-mini'

const articleLearningContentSchema = {
  type: 'json_schema',
  name: 'article_learning_content',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['sentenceTranslations', 'wordExplanations', 'reviewedPhrases'],
    properties: {
      sentenceTranslations: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['blockIndex', 'sentenceIndex', 'text', 'translation', 'note'],
          properties: {
            blockIndex: { type: 'number' },
            sentenceIndex: { type: 'number' },
            text: { type: 'string' },
            translation: { type: 'string' },
            note: { type: 'string' },
          },
        },
      },
      wordExplanations: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['word', 'phonetic', 'partOfSpeech', 'meaning', 'example', 'exampleTranslation'],
          properties: {
            word: { type: 'string' },
            phonetic: { type: 'string' },
            partOfSpeech: { type: 'string' },
            meaning: { type: 'string' },
            example: { type: 'string' },
            exampleTranslation: { type: 'string' },
          },
        },
      },
      reviewedPhrases: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['text', 'meaning', 'reason'],
          properties: {
            text: { type: 'string' },
            meaning: { type: 'string' },
            reason: { type: 'string' },
          },
        },
      },
    },
  },
}

exports.main = async (event = {}) => {
  const articleId = String(event.articleId || '').trim()
  const force = event.force === true

  if (!articleId) {
    return fail('INVALID_ARTICLE_ID', 'articleId is required')
  }

  const article = await readPublishedOrDraftArticle(articleId)
  if (!article) {
    return fail('ARTICLE_NOT_FOUND', 'Article was not found')
  }

  const cached = await readCachedContent(articleId)
  if (cached?.status === 'ready' && !force) {
    return { ok: true, source: 'cache', data: cached }
  }

  if (!process.env.OPENAI_API_KEY) {
    return fail('MISSING_OPENAI_API_KEY', 'Set OPENAI_API_KEY in the cloud function environment')
  }

  await writeLearningContent(articleId, {
    articleId,
    status: 'pending',
    provider: 'cloud-cache',
    model: OPENAI_MODEL,
    updatedAt: new Date().toISOString(),
    generatedAt: null,
    sentenceTranslations: {},
    wordExplanations: {},
    reviewedPhrases: [],
  })

  try {
    const generated = await generateWithOpenAI(article)
    const data = {
      articleId,
      status: 'ready',
      provider: 'cloud-cache',
      model: OPENAI_MODEL,
      updatedAt: new Date().toISOString(),
      generatedAt: Date.now(),
      ...generated,
    }

    await writeLearningContent(articleId, data)
    return { ok: true, source: 'generated', data }
  } catch (error) {
    const errorCode = readErrorCode(error)
    const errorMessage = String(error.message || error)
    await writeLearningContent(articleId, {
      articleId,
      status: 'failed',
      provider: 'cloud-cache',
      model: OPENAI_MODEL,
      updatedAt: new Date().toISOString(),
      generatedAt: null,
      errorCode,
      errorMessage,
      sentenceTranslations: {},
      wordExplanations: {},
      reviewedPhrases: [],
    })
    return fail(errorCode, errorMessage)
  }
}

async function readPublishedOrDraftArticle(articleId) {
  const result = await db.collection('articles').where({ id: articleId }).limit(1).get()
  const article = result.data[0]
  if (!article || article.status === 'archived') return null
  return article
}

async function readCachedContent(articleId) {
  try {
    const result = await db.collection(COLLECTION).doc(articleId).get()
    return result.data || null
  } catch (error) {
    return null
  }
}

async function writeLearningContent(articleId, document) {
  await db.collection(COLLECTION).doc(articleId).set({ data: document })
}

async function generateWithOpenAI(article) {
  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input: [
        {
          role: 'system',
          content:
            'You are an expert CET-4/CET-6 English reading teacher. Return concise, natural Chinese learning content. Only mark genuinely difficult or high-value phrases.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            title: article.title,
            level: article.level,
            content: article.content,
          }),
        },
      ],
      text: {
        format: articleLearningContentSchema,
      },
    }),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`OPENAI_REQUEST_FAILED: ${response.status} ${detail}`)
  }

  const result = await response.json()
  const outputText = result.output_text || readOutputText(result)
  if (!outputText) {
    throw new Error('OPENAI_EMPTY_OUTPUT')
  }

  return normalizeGeneratedContent(JSON.parse(outputText))
}

function readOutputText(result) {
  return result.output
    ?.flatMap((item) => item.content || [])
    ?.map((part) => part.text || '')
    ?.join('')
}

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
  return String(word || '')
    .toLowerCase()
    .replace(/[^a-z']/g, '')
}

function readErrorCode(error) {
  const message = String(error.message || error)
  const match = message.match(/^([A-Z_]+):?/)
  return match?.[1] || 'GENERATE_LEARNING_CONTENT_FAILED'
}

function fail(code, message) {
  return { ok: false, code, message }
}
