const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

exports.main = async (event = {}) => {
  const openid = getOpenid()
  if (!openid) return fail('MISSING_OPENID', 'openid is required')

  const limit = Math.max(1, Math.min(Number(event.limit || 50), 100))
  const skip = Math.max(0, Number(event.cursor || 0))
  const where = {
    openid,
    deletedAt: null,
  }

  if (event.dueOnly === true) {
    where.nextReviewTime = _.lte(Date.now())
  }

  const result = await db
    .collection('userVocabulary')
    .where(where)
    .orderBy('nextReviewTime', 'asc')
    .orderBy('addTime', 'desc')
    .skip(skip)
    .limit(limit)
    .get()

  return {
    ok: true,
    data: result.data,
    nextCursor: result.data.length === limit ? String(skip + limit) : null,
  }
}

function getOpenid() {
  const wxContext = cloud.getWXContext()
  return wxContext.OPENID || wxContext.FROM_OPENID || ''
}

function fail(code, message) {
  return { ok: false, code, message }
}
