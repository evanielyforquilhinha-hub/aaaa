const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event = {}) => {
  const openid = getOpenid()
  if (!openid) return fail('MISSING_OPENID', 'openid is required')

  const vocabularyId = String(event.vocabularyId || '').trim()
  if (!vocabularyId) return fail('INVALID_VOCABULARY_ID', 'vocabularyId is required')

  const result = String(event.result || '')
  if (result !== 'known' && result !== 'unknown') {
    return fail('INVALID_REVIEW_RESULT', 'result must be known or unknown')
  }

  const recordResult = await db.collection('userVocabulary').doc(vocabularyId).get()
  const word = recordResult.data
  if (!word || word.openid !== openid || word.deletedAt != null) {
    return fail('VOCABULARY_NOT_FOUND', 'Vocabulary word was not found')
  }

  const now = Date.now()
  const review = calculateReview(word, result, now)
  const updateData = {
    familiarity: review.familiarityAfter,
    reviewCount: review.reviewCount,
    correctCount: review.correctCount,
    nextReviewTime: review.nextReviewTimeAfter,
    updatedAt: now,
  }

  await db.collection('userVocabulary').doc(vocabularyId).update({ data: updateData })
  await db.collection('reviewRecords').add({
    data: {
      openid,
      vocabularyId,
      normalizedWord: word.normalizedWord,
      result,
      familiarityBefore: review.familiarityBefore,
      familiarityAfter: review.familiarityAfter,
      nextReviewTimeBefore: review.nextReviewTimeBefore,
      nextReviewTimeAfter: review.nextReviewTimeAfter,
      reviewedAt: now,
    },
  })

  return {
    ok: true,
    data: { ...word, ...updateData },
  }
}

function calculateReview(word, result, now) {
  const familiarityBefore = Number(word.familiarity || 0)
  const nextReviewTimeBefore = Number(word.nextReviewTime || now)
  const reviewCount = Number(word.reviewCount || 0) + 1
  const correctCount =
    result === 'known' ? Number(word.correctCount || 0) + 1 : Number(word.correctCount || 0)
  const familiarityAfter =
    result === 'known' ? Math.min(5, familiarityBefore + 1) : Math.max(0, familiarityBefore - 1)
  const nextReviewTimeAfter = now + Math.pow(2, familiarityAfter) * 86400000

  return {
    familiarityBefore,
    familiarityAfter,
    nextReviewTimeBefore,
    nextReviewTimeAfter,
    reviewCount,
    correctCount,
  }
}

function getOpenid() {
  const wxContext = cloud.getWXContext()
  return wxContext.OPENID || wxContext.FROM_OPENID || ''
}

function fail(code, message) {
  return { ok: false, code, message }
}
