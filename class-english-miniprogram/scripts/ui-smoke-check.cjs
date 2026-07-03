const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')

function read(relativePath) {
  const absolutePath = path.join(root, relativePath)
  assert(fs.existsSync(absolutePath), `Expected file missing: ${relativePath}`)
  return fs.readFileSync(absolutePath, 'utf8')
}

function readIfExists(relativePath) {
  const absolutePath = path.join(root, relativePath)
  return fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, 'utf8') : ''
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath))
}

function modifiedAt(relativePath) {
  return fs.statSync(path.join(root, relativePath)).mtimeMs
}

function assertCloseModifiedTimes(label, relativePaths, toleranceMs = 15000) {
  const existingPaths = relativePaths.filter(exists)
  if (existingPaths.length < 2) {
    return
  }

  const times = existingPaths.map(modifiedAt)
  const oldest = Math.min(...times)
  const newest = Math.max(...times)
  assert(
    newest - oldest <= toleranceMs,
    `${label} output files are out of sync by ${Math.round((newest - oldest) / 1000)}s`
  )
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function sliceBetween(content, startMarker, endMarker, label) {
  const start = content.indexOf(startMarker)
  assert(start !== -1, `${label} missing start marker: ${startMarker}`)
  const end = content.indexOf(endMarker, start + startMarker.length)
  assert(end !== -1 && end > start, `${label} missing end marker after ${startMarker}: ${endMarker}`)
  return content.slice(start, end)
}

const files = {
  reader: read('src/pages/index/index.vue'),
  words: read('src/pages/words/words.vue'),
  me: read('src/pages/me/me.vue'),
  vite: read('vite.config.ts'),
  learningContent: read('src/utils/learningContent.ts'),
  readerRuntimeArticles: read('src/utils/readerArticles.ts'),
  readerRuntimeContent: read('src/utils/readerContent.ts'),
  readerRuntimeService: read('src/utils/readerService.ts'),
  vocabularyRuntimeService: read('src/utils/vocabularyService.ts'),
  readerTypes: read('src/features/reader/types.ts'),
  readerArticles: read('src/features/reader/articles.ts'),
  readerContent: read('src/features/reader/content.ts'),
  readerService: read('src/services/readerService.ts'),
  vocabularyService: read('src/services/vocabularyService.ts'),
  articleRepository: read('src/repositories/articleRepository.ts'),
  learningContentRepository: read('src/repositories/learningContentRepository.ts'),
  vocabularyRepository: read('src/repositories/vocabularyRepository.ts'),
  cloudGenerator: read('cloudfunctions/generateArticleLearningContent/index.js'),
  wechatRules: read('docs/wechat-miniprogram-working-rules.md'),
  architectureMap: read('docs/frontend-architecture-map.md'),
  distWxml: readIfExists('dist/build/mp-weixin/pages/index/index.wxml'),
  distWxss: readIfExists('dist/build/mp-weixin/pages/index/index.wxss'),
  distJs: readIfExists('dist/build/mp-weixin/pages/index/index.js'),
  rootWxml: readIfExists('pages/index/index.wxml'),
  rootWxss: readIfExists('pages/index/index.wxss'),
  rootJs: readIfExists('pages/index/index.js'),
  distReaderService: readIfExists('dist/build/mp-weixin/services/readerService.js'),
  distVocabularyService: readIfExists('dist/build/mp-weixin/services/vocabularyService.js'),
  distArticleRepository: readIfExists('dist/build/mp-weixin/repositories/articleRepository.js'),
  distReaderContent: readIfExists('dist/build/mp-weixin/features/reader/content.js'),
  distReaderRuntimeService: readIfExists('dist/build/mp-weixin/utils/readerService.js'),
  distReaderRuntimeContent: readIfExists('dist/build/mp-weixin/utils/readerContent.js'),
  distReaderRuntimeArticles: readIfExists('dist/build/mp-weixin/utils/readerArticles.js'),
  distVocabularyRuntimeService: readIfExists('dist/build/mp-weixin/utils/vocabularyService.js'),
  rootReaderService: readIfExists('services/readerService.js'),
  rootVocabularyService: readIfExists('services/vocabularyService.js'),
  rootArticleRepository: readIfExists('repositories/articleRepository.js'),
  rootReaderContent: readIfExists('features/reader/content.js'),
  rootReaderRuntimeService: readIfExists('utils/readerService.js'),
  rootReaderRuntimeContent: readIfExists('utils/readerContent.js'),
  rootReaderRuntimeArticles: readIfExists('utils/readerArticles.js'),
  rootVocabularyRuntimeService: readIfExists('utils/vocabularyService.js'),
}

const frontendCombined = [
  files.reader,
  files.words,
  files.me,
  files.vite,
  files.learningContent,
  files.readerRuntimeArticles,
  files.readerRuntimeContent,
  files.readerRuntimeService,
  files.vocabularyRuntimeService,
  files.readerTypes,
  files.readerArticles,
  files.readerContent,
  files.readerService,
  files.vocabularyService,
  files.articleRepository,
  files.learningContentRepository,
  files.vocabularyRepository,
].join('\n')
const combined = Object.values(files).join('\n')

const forbiddenSnippets = [
  'z-index:9999;font-size:120px',
  '生词本还是空能',
  'Yl��阵郭中点击单词',
  '点击显示介义',
  '侊句',
  '阇观英语',
  '总词文',
  '今日新墟',
  '挴新统计',
]

for (const snippet of forbiddenSnippets) {
  assert(!combined.includes(snippet), `Forbidden UI snippet still present: ${snippet}`)
}

const requiredReaderMarkers = [
  'reader-page',
  'reader-page__ambient',
  'reader-hero__title',
  'reader-hero__visual',
  'reader-body__english',
  'SentenceUnit',
  '@/utils/readerService',
  '@/utils/vocabularyService',
  'getReaderArticles',
  'getReaderArticleByIndex',
  'getReaderContentBlocks',
  'getReaderSentences',
  'getReaderLearningContent',
  'getReaderWordExplanation',
  'addVocabularyWord',
  'v2012-article-hero',
  'selectedSentenceText',
  'selectedSentenceId',
  'selectedTranslationNote',
  'highlightedSentenceIds',
  'openSentenceTranslation',
  'markSentenceHighlight',
  'reader-body__sentence',
  'reader-body__sentence--marked',
  'reader-body__token--emphasis',
  'font-family: $font-family-serif',
  'reader-dismiss-layer',
  'dismissFloatingPanels',
  'word-sheet',
  'settingsPanelVisible',
  'openSettingsPanel',
  'closeSettingsPanel',
  'setFontScale',
  'runSettingsAction',
  'handleFontScaleAction',
  'handleNightModeAction',
  'handleGoWordsAction',
  'reader-topbar__settings',
  'reader-audio-button',
  'reader-audio-icon',
  'reader-sentence-popover__action-icon',
  'reader-settings-sheet',
  'reader-settings-segment',
  'reader-settings-row',
  'isTranslationOpenForSentence',
  'isSentenceHighlighted',
  'handleHighlightAction',
  'copySelectedSentence',
  'handleCopyAction',
  'ignorePopoverActionsUntil = 0',
  'stopInlineEvent',
  '@tap.stop="handleHighlightAction"',
  '@touchend.stop.prevent="handleHighlightAction"',
  '@tap.stop="handleCopyAction"',
  '@tap.stop="handleFontScaleAction(option.value, $event)"',
  '@touchend.stop.prevent="handleFontScaleAction(option.value, $event)"',
  '@tap.stop="handleNightModeAction"',
  '@touchend.stop.prevent="handleNightModeAction"',
  '@tap.stop="handleGoWordsAction"',
  '@touchend.stop.prevent="handleGoWordsAction"',
  '@touchstart.stop="stopInlineEvent"',
  'text-decoration: underline',
  'text-decoration-color: #111316',
  'text-decoration-thickness: 1px',
  'text-underline-offset: 2px',
  'box-decoration-break: clone',
  '-webkit-box-decoration-break: clone',
  'justify-content: center',
  ':id="sentence.id"',
  'currentTheme',
  '--reader-accent',
  '--reader-warm',
  '--reader-cool',
  '--reader-paper',
  '--reader-visual-start',
  '--reader-visual-end',
  ':src="currentArticle.heroImage"',
  'heroImage',
  'reader-flow',
  'reader-hero__visual',
  'reader-cover__image',
  'reader-cover__shade',
  'reader-cover__content',
  '@tap.stop="openWord(token)"',
  'v-if="token.type === \'word\'"',
  'reader-body__token-static',
  'reader-body__token-hit',
  'hover-class="none"',
  '@longpress.stop="openSentenceTranslation(sentence, $event)"',
  'reader-cover__caption',
  'const readerFontSize = computed(() => `${Math.round(16 * fontScale.value)}px`)',
  'const readerLineHeight = computed(() => `${Math.round(28 * fontScale.value)}px`)',
  'shouldSuppressWordTap',
  'bottom: calc(18px + env(safe-area-inset-bottom));',
  'min-height: 78px;',
  'font-size: 18px;',
  'word-sheet__tools',
  'word-sheet__speak-icon',
  'reader-hero__eyebrow',
  'reader-body--centered',
  'align-items: center',
  'max-width: 318px',
  'margin: 0 auto 22px',
  'text-align: left',
]

for (const marker of requiredReaderMarkers) {
  assert(files.reader.includes(marker), `Reader refresh marker missing: ${marker}`)
}

for (const articleImage of [
  'src/static/articles/bugs-bright-clothes.jpg',
  'src/static/articles/walking.jpg',
  'src/static/articles/dreams.jpg',
]) {
  assert(exists(articleImage), `Article hero image missing: ${articleImage}`)
}

for (const marker of [
  'heroImage: \'/static/articles/bugs-bright-clothes.jpg\'',
  'heroImage: \'/static/articles/walking.jpg\'',
  'heroImage: \'/static/articles/dreams.jpg\'',
]) {
  assert(files.readerArticles.includes(marker), `Feature article data missing marker: ${marker}`)
  assert(files.readerRuntimeArticles.includes(marker), `MP-safe article data missing marker: ${marker}`)
}

const sourceDismissLayerIndex = files.reader.indexOf('class="reader-dismiss-layer"')
const sourcePopoverIndex = files.reader.indexOf('id="reader-translation-popover"')
assert(
  sourceDismissLayerIndex !== -1 && sourcePopoverIndex !== -1 && sourceDismissLayerIndex < sourcePopoverIndex,
  'Reader dismiss layer must render before translation popover so real-device taps reach popover actions'
)

const sourceSettingsPanelBlock = sliceBetween(
  files.reader,
  'class="reader-settings-sheet"',
  'v-if="wordSheetVisible"',
  'source settings panel'
)
for (const marker of [
  '@tap.stop="handleFontScaleAction(option.value, $event)"',
  '@touchend.stop.prevent="handleFontScaleAction(option.value, $event)"',
  '@tap.stop="handleNightModeAction"',
  '@touchend.stop.prevent="handleNightModeAction"',
  '@tap.stop="handleGoWordsAction"',
  '@touchend.stop.prevent="handleGoWordsAction"',
]) {
  assert(sourceSettingsPanelBlock.includes(marker), `Source settings panel missing real-device action marker: ${marker}`)
}

const readerDomainCombined = [
  files.readerTypes,
  files.readerArticles,
  files.readerContent,
].join('\n')

const requiredReaderDomainMarkers = [
  'export interface ReaderTheme',
  'export interface Article',
  'export interface ReaderToken',
  'export interface SentenceUnit',
  'export interface ContentBlock',
  'export const articles',
  'heroImage: string',
  'heroImage: \'/static/articles/bugs-bright-clothes.jpg\'',
  'level: \'CET-6\'',
  'theme: {',
  'buildContentBlocks',
  'getArticleSentences',
  'markReviewedPhrases',
  'getCachedSentenceTranslation',
  'getReviewedPhraseTexts',
]

for (const marker of requiredReaderDomainMarkers) {
  assert(readerDomainCombined.includes(marker), `Reader domain marker missing: ${marker}`)
}

const dataBoundaryCombined = [
  files.readerService,
  files.vocabularyService,
  files.articleRepository,
  files.learningContentRepository,
  files.vocabularyRepository,
].join('\n')

const mpRuntimeCombined = [
  files.readerRuntimeArticles,
  files.readerRuntimeContent,
  files.readerRuntimeService,
  files.vocabularyRuntimeService,
].join('\n')

const requiredDataBoundaryMarkers = [
  'getReaderArticles',
  'getReaderArticleByIndex',
  'getReaderContentBlocks',
  'getReaderSentences',
  'getReaderLearningContent',
  'getReaderWordExplanation',
  '@/repositories/articleRepository',
  '@/repositories/learningContentRepository',
  'addVocabularyWord',
  '@/repositories/vocabularyRepository',
  'listArticles',
  'getArticleByIndex',
  'getArticleCount',
  'getCachedArticleLearningContent',
  'getCachedWordExplanation',
  'addWord',
]

for (const marker of requiredDataBoundaryMarkers) {
  assert(dataBoundaryCombined.includes(marker), `Data boundary marker missing: ${marker}`)
}

for (const marker of [
  'export const articles',
  'buildContentBlocks',
  'getReaderArticles',
  'getReaderArticleByIndex',
  'getReaderLearningContent',
  'getReaderWordExplanation',
  'addVocabularyWord',
  '@/utils/readerContent',
  '@/utils/readerArticles',
  '@/utils/learningContent',
  '@/utils/storage',
]) {
  assert(mpRuntimeCombined.includes(marker), `Mini-program runtime marker missing: ${marker}`)
}

for (const marker of [
  '@/services/',
  '@/repositories/',
  '@/features/reader/content',
  '@/features/reader/articles',
]) {
  assert(!mpRuntimeCombined.includes(marker), `Mini-program runtime should avoid unstable root module path: ${marker}`)
}

const requiredLearningContentMarkers = [
  'ArticleLearningContent',
  'sentenceTranslations',
  'wordExplanations',
  'reviewedPhrases',
  'SentenceTranslation',
  'WordExplanation',
  'ReviewedPhrase',
  'LEARNING_CONTENT_PENDING_TRANSLATION',
  'getCachedArticleLearningContent',
  'getCachedSentenceTranslation',
  'getCachedWordExplanation',
  'getReviewedPhraseTexts',
  'bugs-bright-clothes',
]

for (const marker of requiredLearningContentMarkers) {
  assert(files.learningContent.includes(marker), `Learning content marker missing: ${marker}`)
}

const requiredCloudGeneratorMarkers = [
  'wx-server-sdk',
  'OPENAI_API_KEY',
  'articleLearningContent',
  'json_schema',
  'sentenceTranslations',
  'wordExplanations',
  'reviewedPhrases',
  'cloud.database()',
  'status: \'ready\'',
  'MISSING_OPENAI_API_KEY',
]

for (const marker of requiredCloudGeneratorMarkers) {
  assert(files.cloudGenerator.includes(marker), `Cloud generator marker missing: ${marker}`)
}

const forbiddenReaderMarkers = [
  'selectedOriginal.value = block.plainText',
  'copyTranslation() {\n  uni.setClipboardData({\n    data: `${selectedOriginal.value}',
  'underlinedBlockIds',
  'underlinedSentenceIds',
  'selectedBlockId',
  'isUnderlined(blockId',
  'isSentenceUnderlined',
  'isBlockUnderlined',
  'markSentenceUnderline',
  'handleUnderlineAction',
  'reader-body__english--marked',
  'reader-body__mark-line',
  'background-image: linear-gradient(#111316, #111316);',
  'box-shadow: inset 0 -1px 0 #111316;',
  'box-shadow: inset 0 -1px 0 rgba(255, 255, 255, 0.92);',
  'background-size: 100% 1px;',
  'background-position: 0 calc(100% - 2px);',
  'reader-body__translation',
  'reader-body__translation-text',
  'word-sheet__ghost',
  '@click',
  '@touchstart.stop="startLongPressTranslation(sentence, $event)"\n                @touchend.stop="cancelLongPressTranslation"',
  '@mousedown.stop="startLongPressTranslation(sentence, $event)"\n                @mouseup.stop="cancelLongPressTranslation"',
  '@pointerdown.stop="startLongPressTranslation(sentence, $event)"\n                @pointerup.stop="cancelLongPressTranslation"',
  'reader-body__block--marked',
  'isBlockHighlighted',
  "transition: color 0.18s ease, margin-bottom",
  'padding: 0 2px;',
  'importantPhraseMap',
  'markImportantPhrases',
  'reader-hero__visual-glow',
  'reader-cover__art',
  'reader-cover__symbol',
  'reader-toolbar',
  'reader-toolbar__rail',
  'reader-toolbar__item',
  'reader-body__play-mark',
  '♫',
  '♪',
  '▸',
  '■',
  'translateSentence',
  '@/utils/lineTranslate',
  '@/services/readerService',
  '@/services/vocabularyService',
  '@/features/reader/articles',
  '@/features/reader/content',
  '@/utils/storage',
  'getCachedArticleLearningContent',
  'getCachedWordExplanation',
  'buildContentBlocks(currentArticle.value)',
  'getArticleSentences(currentArticle.value)',
  'const reviewedPhraseMap',
  'text-decoration-line: underline',
  'text-decoration-color: #111111',
  'const readerFontSize = computed(() => `${Math.round(23 * fontScale.value)}px`)',
  'const readerLineHeight = computed(() => `${Math.round(38 * fontScale.value)}px`)',
  'const readerFontSize = computed(() => `${Math.round(20 * fontScale.value)}px`)',
  'const readerLineHeight = computed(() => `${Math.round(34 * fontScale.value)}px`)',
  'const readerFontSize = computed(() => `${Math.round(18 * fontScale.value)}px`)',
  'const readerLineHeight = computed(() => `${Math.round(31 * fontScale.value)}px`)',
  'const readerFontSize = computed(() => `${Math.round(17 * fontScale.value)}px`)',
  'const readerLineHeight = computed(() => `${Math.round(30 * fontScale.value)}px`)',
  'max-height: 236px;',
  'max-height: 168px;',
  'max-height: 124px;',
  'font-size: 30px;',
  '.word-sheet__word {\n  font-size: 24px;',
  '.word-sheet__word {\n  font-size: 21px;',
  '<image class="reader-page__ambient-image"',
  'filter: blur(34px)',
  'linear-gradient(90deg, var(--reader-accent)',
  'images.unsplash',
  '@touchend.stop.prevent="handleUnderlineAction"',
  '@pointerup.stop="handleUnderlineAction"',
  '@pointerup.stop="handleCopyAction"',
  '@touchend.stop.prevent="handleShareAction"',
  '@pointerup.stop="handleShareAction"',
  '@touchstart.stop="startLongPressTranslation(sentence, $event)"',
  '@touchstart="startLongPressTranslation(sentence, $event)"',
  'startLongPressTranslation(sentence',
  'longPressTimer',
  'ignorePopoverActionsUntil = Date.now() + 120',
  '@mousedown.stop="startLongPressTranslation(sentence, $event)"',
  '@pointerdown.stop="startLongPressTranslation(sentence, $event)"',
  '@mouseup="cancelLongPressTranslation"',
  '@mouseleave="cancelLongPressTranslation"',
  '@pointerup="cancelLongPressTranslation"',
  '@pointercancel="cancelLongPressTranslation"',
  'cancelLongPressTranslation',
]

for (const marker of forbiddenReaderMarkers) {
  assert(!files.reader.includes(marker), `Popover action should not run on release event: ${marker}`)
}

assert(
  !frontendCombined.includes('OPENAI_API_KEY'),
  'OpenAI API keys must stay in cloud functions, never in frontend code'
)

for (const marker of [
  '微信开发者工具',
  '不以 H5 浏览器预览作为验收',
  'npm.cmd run build:mp-weixin',
  'dist/build/mp-weixin',
  'Sentence translation should render as a compact bubble/popover',
  'Word lookup should stay compact',
  'about 16px font size and 28px line height',
  'syncs `dist/build/mp-weixin` into the root fallback mini-program files',
  'When the thread gets long',
]) {
  assert(files.wechatRules.includes(marker), `WeChat workflow rule missing: ${marker}`)
}

for (const marker of [
  'Frontend Architecture Map',
  'src/features/reader/types.ts',
  'src/features/reader/articles.ts',
  'src/features/reader/content.ts',
  'src/services/readerService.ts',
  'src/services/vocabularyService.ts',
  'src/repositories/articleRepository.ts',
  'src/repositories/learningContentRepository.ts',
  'src/repositories/vocabularyRepository.ts',
  '先改 `src`',
  '不直接手改 `dist/build/mp-weixin`',
]) {
  assert(files.architectureMap.includes(marker), `Architecture map marker missing: ${marker}`)
}

if (files.distWxml || files.distWxss || files.distJs) {
  const distCombined = [files.distWxml, files.distWxss, files.distJs].join('\n')
  for (const marker of [
    'reader-body__sentence-unit',
    'catchtap',
    'catchtouchend',
    'catchlongpress',
    'bindlongpress',
    'reader-flow',
    'reader-cover__image',
    'reader-cover__shade',
    'reader-cover__content',
    'v2012-article-hero',
    'min-height:78px',
    'font-size:18px',
    'reader-topbar__settings',
    'reader-audio-button',
    'reader-audio-icon',
    'reader-sentence-popover__action-icon',
    'reader-settings-sheet',
    'reader-settings-segment',
  ]) {
    assert(distCombined.includes(marker), `Built WeChat output missing marker: ${marker}`)
  }

  const distDismissLayerIndex = files.distWxml.indexOf('reader-dismiss-layer')
  const distPopoverIndex = files.distWxml.indexOf('reader-translation-popover')
  assert(
    distDismissLayerIndex !== -1 && distPopoverIndex !== -1 && distDismissLayerIndex < distPopoverIndex,
    'Built WeChat output must render dismiss layer before translation popover'
  )

  const distSettingsPanelBlock = sliceBetween(
    files.distWxml,
    'reader-settings-sheet',
    'word-sheet',
    'built settings panel'
  )
  for (const marker of ['catchtap', 'catchtouchend', '夜间模式', '生词本']) {
    assert(distSettingsPanelBlock.includes(marker), `Built settings panel missing marker: ${marker}`)
  }
  assert(!distSettingsPanelBlock.includes('bindtap'), 'Built settings panel should use catchtap/catchtouchend actions, not bindtap')

  for (const marker of [
    'startLongPressTranslation',
    'bindtouchstart',
    'images.unsplash',
    'reader-cover__art',
    'reader-cover__symbol',
    'reader-page__ambient-image',
    'max-height:236px',
    'max-height:168px',
    'max-height:124px',
    'filter:blur(34px)',
    'reader-toolbar',
    'reader-toolbar__rail',
    'reader-body__play-mark',
    '♫',
    '♪',
    '▸',
    '■',
    'wcard',
    'bub__',
  ]) {
    assert(!distCombined.includes(marker), `Built WeChat output still has forbidden marker: ${marker}`)
  }

  for (const marker of [
    'utils/readerService.js',
    'utils/vocabularyService.js',
  ]) {
    assert(files.distJs.includes(marker), `Built WeChat page JS is not using mp-safe utils runtime: ${marker}`)
  }

  for (const marker of [
    'services/readerService.js',
    'services/vocabularyService.js',
    'features/reader/content.js',
    'repositories/articleRepository.js',
  ]) {
    assert(!files.distJs.includes(marker), `Built WeChat page JS still requires an unstable root module path: ${marker}`)
  }

  for (const [label, content, marker] of [
    ['built mp-safe reader runtime service', files.distReaderRuntimeService, 'getReaderArticleByIndex'],
    ['built mp-safe reader runtime content', files.distReaderRuntimeContent, 'buildContentBlocks'],
    ['built mp-safe reader runtime articles', files.distReaderRuntimeArticles, 'heroImage:"/static/articles/bugs-bright-clothes.jpg"'],
    ['built mp-safe vocabulary runtime service', files.distVocabularyRuntimeService, 'addVocabularyWord'],
  ]) {
    assert(content.includes(marker), `${label} missing or stale`)
  }

  const distRuntimeCombined = [
    files.distReaderRuntimeService,
    files.distReaderRuntimeContent,
    files.distReaderRuntimeArticles,
    files.distVocabularyRuntimeService,
  ].join('\n')

  for (const marker of [
    '../services/',
    '../features/',
    '../repositories/',
  ]) {
    assert(!distRuntimeCombined.includes(marker), `Built mp-safe runtime still references unstable root module path: ${marker}`)
  }
}

if (files.rootWxml || files.rootWxss || files.rootJs) {
  const rootMiniProgramCombined = [files.rootWxml, files.rootWxss, files.rootJs].join('\n')
  for (const marker of [
    'reader-body__sentence-unit',
    'catchtap',
    'catchtouchend',
    'catchlongpress',
    'reader-flow',
    'reader-cover__image',
    'reader-cover__shade',
    'reader-cover__content',
    'v2012-article-hero',
    'min-height:78px',
    'font-size:18px',
    'reader-topbar__settings',
    'reader-audio-button',
    'reader-audio-icon',
    'reader-sentence-popover__action-icon',
    'reader-settings-sheet',
    'reader-settings-segment',
  ]) {
    assert(rootMiniProgramCombined.includes(marker), `Root WeChat output missing marker: ${marker}`)
  }

  const rootDismissLayerIndex = files.rootWxml.indexOf('reader-dismiss-layer')
  const rootPopoverIndex = files.rootWxml.indexOf('reader-translation-popover')
  assert(
    rootDismissLayerIndex !== -1 && rootPopoverIndex !== -1 && rootDismissLayerIndex < rootPopoverIndex,
    'Root WeChat output must render dismiss layer before translation popover'
  )

  const rootSettingsPanelBlock = sliceBetween(
    files.rootWxml,
    'reader-settings-sheet',
    'word-sheet',
    'root settings panel'
  )
  for (const marker of ['catchtap', 'catchtouchend', '夜间模式', '生词本']) {
    assert(rootSettingsPanelBlock.includes(marker), `Root settings panel missing marker: ${marker}`)
  }
  assert(!rootSettingsPanelBlock.includes('bindtap'), 'Root settings panel should use catchtap/catchtouchend actions, not bindtap')

  for (const marker of [
    'images.unsplash',
    'wcard',
    'bub__',
    'lineTranslate',
    'reader-cover__art',
    'reader-cover__symbol',
    'reader-page__ambient-image',
    'max-height:236px',
    'max-height:168px',
    'max-height:124px',
    'reader-toolbar',
    'reader-toolbar__rail',
    'reader-body__play-mark',
    '♫',
    '♪',
    '▸',
    '■',
  ]) {
    assert(!rootMiniProgramCombined.includes(marker), `Root WeChat output still has stale marker: ${marker}`)
  }

  for (const marker of [
    'utils/readerService.js',
    'utils/vocabularyService.js',
  ]) {
    assert(files.rootJs.includes(marker), `Root fallback page JS is not using mp-safe utils runtime: ${marker}`)
  }

  for (const marker of [
    'services/readerService.js',
    'services/vocabularyService.js',
    'features/reader/content.js',
    'repositories/articleRepository.js',
  ]) {
    assert(!files.rootJs.includes(marker), `Root fallback page JS still requires an unstable root module path: ${marker}`)
  }

  for (const [label, content, marker] of [
    ['root fallback mp-safe reader runtime service', files.rootReaderRuntimeService, 'getReaderArticleByIndex'],
    ['root fallback mp-safe reader runtime content', files.rootReaderRuntimeContent, 'buildContentBlocks'],
    ['root fallback mp-safe reader runtime articles', files.rootReaderRuntimeArticles, 'heroImage:"/static/articles/bugs-bright-clothes.jpg"'],
    ['root fallback mp-safe vocabulary runtime service', files.rootVocabularyRuntimeService, 'addVocabularyWord'],
  ]) {
    assert(content.includes(marker), `${label} missing or stale`)
  }

  const rootRuntimeCombined = [
    files.rootReaderRuntimeService,
    files.rootReaderRuntimeContent,
    files.rootReaderRuntimeArticles,
    files.rootVocabularyRuntimeService,
  ].join('\n')

  for (const marker of [
    '../services/',
    '../features/',
    '../repositories/',
  ]) {
    assert(!rootRuntimeCombined.includes(marker), `Root fallback mp-safe runtime still references unstable root module path: ${marker}`)
  }
}

assertCloseModifiedTimes('dist reader page', [
  'dist/build/mp-weixin/pages/index/index.js',
  'dist/build/mp-weixin/pages/index/index.wxml',
  'dist/build/mp-weixin/pages/index/index.wxss',
])

assertCloseModifiedTimes('root fallback reader page', [
  'dist/build/mp-weixin/pages/index/index.js',
  'pages/index/index.js',
  'pages/index/index.wxml',
  'pages/index/index.wxss',
])

assertCloseModifiedTimes('root fallback service boundary', [
  'dist/build/mp-weixin/services/readerService.js',
  'services/readerService.js',
  'dist/build/mp-weixin/repositories/articleRepository.js',
  'repositories/articleRepository.js',
  'dist/build/mp-weixin/features/reader/content.js',
  'features/reader/content.js',
])

assert(
  files.vite.includes('class-english-miniprogram-vite-cache'),
  'Vite cache should default to a temp directory so H5 preview can start without node_modules write permission'
)
assert(
  !files.vite.includes('node_modules/.vite'),
  'Vite cache should not default to node_modules/.vite'
)

console.log('UI smoke checks passed')
