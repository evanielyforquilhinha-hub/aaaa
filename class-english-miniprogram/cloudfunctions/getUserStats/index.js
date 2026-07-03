const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

exports.main = async () => {
  const openid = getOpenid()
  if (!openid) return fail('MISSING_OPENID', 'openid is required')

  const now = Date.now()
  const { start, end } = getChinaDayRange(now)
  const active = { openid, deletedAt: null }
  const [total, reviewed, mastered, todayReview, todayAdded] = await Promise.all([
    countVocabulary(active),
    countVocabulary({ ...active, reviewCount: _.gt(0) }),
    countVocabulary({ ...active, familiarity: _.gte(4) }),
    countVocabulary({ ...active, nextReviewTime: _.lte(now) }),
    countVocabulary({ ...active, addTime: _.gte(start).and(_.lt(end)) }),
  ])

  return {
    ok: true,
    data: {
      total,
      reviewed,
      mastered,
      todayReview,
      todayAdded,
    },
  }
}

async function countVocabulary(where) {
  const result = await db.collection('userVocabulary').where(where).count()
  return Number(result.total || 0)
}

function getChinaDayRange(now) {
  const offset = 8 * 60 * 60 * 1000
  const shifted = new Date(now + offset)
  const startUtc = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) - offset
  return { start: startUtc, end: startUtc + 86400000 }
}

function getOpenid() {
  const wxContext = cloud.getWXContext()
  return wxContext.OPENID || wxContext.FROM_OPENID || ''
}

function fail(code, message) {
  return { ok: false, code, message }
}
