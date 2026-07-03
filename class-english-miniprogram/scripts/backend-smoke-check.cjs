const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const requiredFunctions = [
  'getArticleList',
  'getArticleDetail',
  'getArticleLearningContent',
  'generateArticleLearningContent',
  'seedContent',
  'addVocabularyWord',
  'getVocabularyList',
  'reviewVocabularyWord',
  'removeVocabularyWord',
  'getUserStats',
  'updateArticleProgress',
]

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8')
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath))
}

function assert(condition, message) {
  if (!condition) {
    console.error(`Backend smoke check failed: ${message}`)
    process.exit(1)
  }
}

for (const name of requiredFunctions) {
  assert(exists(`cloudfunctions/${name}/index.js`), `missing cloudfunctions/${name}/index.js`)
  assert(exists(`cloudfunctions/${name}/package.json`), `missing cloudfunctions/${name}/package.json`)
  const source = read(`cloudfunctions/${name}/index.js`)
  assert(source.includes('wx-server-sdk'), `${name} must use wx-server-sdk`)
  assert(source.includes('cloud.init'), `${name} must initialize cloud`)
  assert(source.includes('exports.main'), `${name} must export main`)
}

const frontendFiles = [
  ...fs
    .readdirSync(path.join(root, 'src'), { recursive: true })
    .filter((item) => String(item).endsWith('.ts') || String(item).endsWith('.vue'))
    .map((item) => path.join('src', String(item))),
]

for (const file of frontendFiles) {
  const source = read(file)
  assert(!source.includes('OPENAI_API_KEY'), `frontend file contains OPENAI_API_KEY marker: ${file}`)
  assert(!source.includes('api.openai.com'), `frontend file contains OpenAI endpoint marker: ${file}`)
}

const generator = read('cloudfunctions/generateArticleLearningContent/index.js')
for (const marker of [
  'MISSING_OPENAI_API_KEY',
  'OPENAI_BASE_URL',
  'OPENAI_MODEL',
  'articleLearningContent',
  "status: 'pending'",
  "status: 'ready'",
  "status: 'failed'",
]) {
  assert(generator.includes(marker), `generateArticleLearningContent missing marker: ${marker}`)
}

console.log('Backend smoke checks passed')
