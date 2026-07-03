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
