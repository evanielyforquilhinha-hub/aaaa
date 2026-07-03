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
