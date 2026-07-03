const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event = {}) => {
  const openid = getOpenid()
  if (!openid) return fail('MISSING_OPENID', 'openid is required')

  const vocabularyId = String(event.vocabularyId || '').trim()
  if (!vocabularyId) return fail('INVALID_VOCABULARY_ID', 'vocabularyId is required')

  const result = await db.collection('userVocabulary').doc(vocabularyId).get()
  const word = result.data
  if (!word || word.openid !== openid || word.deletedAt != null) {
    return fail('VOCABULARY_NOT_FOUND', 'Vocabulary word was not found')
  }

  const now = Date.now()
  await db.collection('userVocabulary').doc(vocabularyId).update({
    data: {
      deletedAt: now,
      updatedAt: now,
    },
  })

  return {
    ok: true,
    data: { ...word, deletedAt: now, updatedAt: now },
  }
}

function getOpenid() {
  const wxContext = cloud.getWXContext()
  return wxContext.OPENID || wxContext.FROM_OPENID || ''
}

function fail(code, message) {
  return { ok: false, code, message }
}
