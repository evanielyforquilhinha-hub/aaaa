const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event = {}) => {
  const openid = getOpenid()
  if (!openid) return fail('MISSING_OPENID', 'openid is required')

  const articleId = String(event.articleId || '').trim()
  if (!articleId) return fail('INVALID_ARTICLE_ID', 'articleId is required')

  const now = Date.now()
  const id = `${openid}_${articleId}`
  const existing = await readProgress(id)
  const data = {
    openid,
    articleId,
    readPercent: has(event, 'readPercent')
      ? clamp(Number(event.readPercent || 0), 0, 100)
      : Number(existing.readPercent || 0),
    lastSentenceId: has(event, 'lastSentenceId')
      ? String(event.lastSentenceId || '')
      : existing.lastSentenceId,
    highlightedSentenceIds: has(event, 'highlightedSentenceIds')
      ? normalizeStringArray(event.highlightedSentenceIds)
      : normalizeStringArray(existing.highlightedSentenceIds),
    keySentenceIds: has(event, 'keySentenceIds')
      ? normalizeStringArray(event.keySentenceIds)
      : normalizeStringArray(existing.keySentenceIds),
    completed: has(event, 'completed') ? event.completed === true : existing.completed === true,
    readDurationSeconds: has(event, 'readDurationSeconds')
      ? Math.max(0, Number(event.readDurationSeconds || 0))
      : Number(existing.readDurationSeconds || 0),
    lastReadAt: now,
    updatedAt: now,
  }

  await db.collection('userArticleProgress').doc(id).set({ data })
  return { ok: true, data: { _id: id, ...data } }
}

async function readProgress(id) {
  try {
    const result = await db.collection('userArticleProgress').doc(id).get()
    return result.data || {}
  } catch (error) {
    return {}
  }
}

function has(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key)
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return []
  return value.map((item) => String(item || '').trim()).filter(Boolean)
}

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.min(value, max))
}

function getOpenid() {
  const wxContext = cloud.getWXContext()
  return wxContext.OPENID || wxContext.FROM_OPENID || ''
}

function fail(code, message) {
  return { ok: false, code, message }
}
