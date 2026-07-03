const cloud = require('wx-server-sdk')
const { articles, articleLearningContent } = require('./seed-data')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async () => {
  const articleResults = []
  const contentResults = []

  for (const article of articles) {
    await setDocument('articles', article._id, article)
    articleResults.push(article.id)
  }

  for (const content of articleLearningContent) {
    await setDocument('articleLearningContent', content._id, content)
    contentResults.push(content.articleId)
  }

  return {
    ok: true,
    data: {
      articles: articleResults,
      articleLearningContent: contentResults,
    },
  }
}

async function setDocument(collection, id, document) {
  const { _id, ...data } = document
  await db.collection(collection).doc(id).set({ data })
}
