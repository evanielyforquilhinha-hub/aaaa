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
  const articleId = String(event.articleId || '')
  const article = event.article || null

  if (!articleId || !article?.content) {
    return fail('INVALID_ARTICLE', 'articleId and article.content are required')
  }

  const cached = await readCachedContent(articleId)
  if (cached?.status === 'ready') {
    return { ok: true, source: 'cache', data: cached }
  }

  if (!process.env.OPENAI_API_KEY) {
    return fail('MISSING_OPENAI_API_KEY', 'Set OPENAI_API_KEY in the cloud function environment')
  }

  const generated = await generateWithOpenAI(article)
  const data = {
    articleId,
    status: 'ready',
    provider: OPENAI_MODEL,
    updatedAt: new Date().toISOString(),
    ...generated,
  }

  await db.collection(COLLECTION).doc(articleId).set({ data })
  return { ok: true, source: 'generated', data }
}

async function readCachedContent(articleId) {
  try {
    const result = await db.collection(COLLECTION).doc(articleId).get()
    return result.data || null
  } catch (error) {
    return null
  }
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
  return {
    sentenceTranslations: content.sentenceTranslations || [],
    wordExplanations: content.wordExplanations || [],
    reviewedPhrases: content.reviewedPhrases || [],
  }
}

function fail(code, message) {
  return { ok: false, code, message }
}
