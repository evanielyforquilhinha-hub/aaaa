const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event = {}) => {
  const openid = getOpenid()
  if (!openid) return fail('MISSING_OPENID', 'openid is required')

  const normalizedWord = normalizeWord(event.word)
  if (!normalizedWord) return fail('INVALID_WORD', 'word is required')

  const now = Date.now()
  const result = await db.collection('userVocabulary').where({ openid, normalizedWord }).limit(1).get()
  const existing = result.data[0]

  if (existing && existing.deletedAt == null) {
    return { ok: true, data: existing, duplicated: true }
  }

  const fields = {
    word: String(event.word || ''),
    normalizedWord,
    phonetic: String(event.phonetic || ''),
    partOfSpeech: String(event.partOfSpeech || ''),
    meaning: String(event.meaning || ''),
    example: String(event.example || ''),
    exampleTranslation: String(event.exampleTranslation || ''),
    sourceArticleId: event.sourceArticleId ? String(event.sourceArticleId) : undefined,
    sourceSentence: event.sourceSentence ? String(event.sourceSentence) : undefined,
    updatedAt: now,
    deletedAt: null,
  }

  if (existing) {
    await db.collection('userVocabulary').doc(existing._id).update({ data: fields })
    return {
      ok: true,
      data: { ...existing, ...fields },
      duplicated: false,
    }
  }

  const item = {
    _id: `${openid}_${normalizedWord}`,
    openid,
    ...fields,
    addTime: now,
    nextReviewTime: now,
    familiarity: 0,
    reviewCount: 0,
    correctCount: 0,
    createdAt: now,
  }

  const { _id, ...data } = item
  await db.collection('userVocabulary').doc(_id).set({ data })
  return { ok: true, data: item, duplicated: false }
}

function getOpenid() {
  const wxContext = cloud.getWXContext()
  return wxContext.OPENID || wxContext.FROM_OPENID || ''
}

function normalizeWord(word) {
  return String(word || '')
    .toLowerCase()
    .replace(/[^a-z']/g, '')
}

function fail(code, message) {
  return { ok: false, code, message }
}
