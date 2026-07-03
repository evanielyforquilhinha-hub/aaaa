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
