# 英语精读小程序后端架构 PRD

版本：v0.1  
日期：2026-07-02  
阶段：从本地 mock 迁移到云端数据  
目标平台：微信小程序优先  
主要读者：后端开发窗口、前端接入窗口、新会话交接窗口

## 1. 背景

当前小程序已经跑通了英语精读主路径：阅读文章、长按句子看翻译、点击单词看释义、复制/划线、加入生词本、复习、我的页统计。现在的文章、精讲、单词解释和生词数据主要来自前端本地 mock 或本地 storage。

用户明确目标是把“这些单词、阅读内容、精讲内容、学习数据”迁移到后端和数据库，让前端只负责展示、交互和轻缓存。后端要成为文章、学习内容、用户学习记录的来源。

现有前端已经建立了基本边界：

- 页面入口：`src/pages/*`
- service 层：`src/services/readerService.ts`、`src/services/vocabularyService.ts`
- repository 层：`src/repositories/articleRepository.ts`、`src/repositories/learningContentRepository.ts`、`src/repositories/vocabularyRepository.ts`
- 微信端安全 facade：`src/utils/readerService.ts`、`src/utils/vocabularyService.ts`
- AI 精讲云函数骨架：`cloudfunctions/generateArticleLearningContent/index.js`

后端 PRD 的核心不是重写前端，而是让 repository 层逐步从本地 mock 切到云数据库/云函数。

## 2. 产品目标

### 2.1 P0 目标

- 文章列表和文章详情从云端读取。
- 文章精讲内容从云端缓存读取，包括句子翻译、单词解释、审核短语。
- 生词本从本地 storage 升级为云端同步，保留本地 fallback。
- 复习记录和我的页统计从云端数据计算。
- OpenAI API Key 只存在云函数环境变量，不进入 `src` 前端代码。
- 前端页面不直接知道云数据库结构，只通过 repository/service 获取稳定数据。

### 2.2 P1 目标

- 支持开发者录入文章后自动生成精讲缓存。
- 支持文章状态：草稿、已发布、归档。
- 支持文章分类、难度、标签和推荐顺序。
- 支持用户阅读进度、已读文章、连续学习天数。
- 支持云端和本地数据的增量同步。

### 2.3 暂不做

- 完整后台 CMS。
- 付费会员、订单、优惠券。
- 社区评论、排行榜。
- 用户点击句子时实时调用 AI。
- 独立 Node/Java/Python 服务器。

## 3. 推荐技术方案

### 3.1 方案 A：微信云开发优先，推荐

使用微信云数据库、云函数、云函数环境变量和小程序端 `uniCloud.callFunction` 或微信云能力封装。文章和用户数据放云数据库，AI 生成放云函数，前端 repository 调云函数或云数据库。

优点：

- 与微信小程序集成成本低。
- 不需要自建服务器和鉴权体系。
- 云函数天然能拿到用户 openid。
- API Key 可以放云函数环境变量。
- 适合当前 MVP 和两个窗口并行开发。

代价：

- 后续复杂后台、跨平台和高级权限会受微信云开发约束。
- 云函数冷启动和调用限制需要后续观察。

### 3.2 方案 B：自建后端服务，暂缓

使用独立后端服务和数据库。适合后续有 Web 管理后台、付费体系、多平台客户端、复杂内容审核流程之后再考虑。

暂不推荐，因为当前阶段会显著增加部署、鉴权、运维和成本。

### 3.3 方案 C：混合方案，后续演进

MVP 阶段用微信云开发；当内容生产、管理后台或商业化复杂后，再把管理端和复杂任务迁到独立后端。前端 repository 接口保持稳定，后端实现可替换。

## 4. 系统边界

```text
微信小程序页面
  -> src/utils/*Service.ts mp-safe facade
  -> src/services/*
  -> src/repositories/*
  -> cloud adapters
  -> 微信云函数 / 云数据库
```

边界规则：

- 页面只负责 UI 状态和交互编排。
- service 层给页面稳定业务 API。
- repository 层负责本地 mock、本地 storage、云端读取之间的切换。
- 云函数负责鉴权、数据组装、AI 生成、写库。
- 云数据库只存结构化数据，不把密钥、提示词或临时前端状态混进去。

## 5. 数据模型

### 5.1 `articles`

文章基础信息，替代 `src/features/reader/articles.ts` 的主数据来源。

```ts
interface ArticleDocument {
  _id: string
  id: string
  title: string
  wordCount: number
  level: 'CET-4' | 'CET-6' | 'Postgraduate' | 'General'
  visualSymbol: string
  visualCaption: string
  heroImage: string
  imagePalette: {
    source: 'manual' | 'image-extracted' | 'theme-derived'
    accent: string
    warmSoft: string
    coolSoft: string
    visualStart: string
    visualEnd: string
  }
  content: string
  source: string
  theme: {
    accent: string
    warm: string
    cool: string
    paper: string
    shadow: string
    warmSoft: string
    coolSoft: string
    visualStart: string
    visualEnd: string
    accentSoft: string
  }
  tags: string[]
  sortOrder: number
  status: 'draft' | 'published' | 'archived'
  createdAt: number
  updatedAt: number
  publishedAt: number | null
}
```

前端映射到现有 `Article` 类型时，必须保留字段：`id`、`title`、`wordCount`、`level`、`visualSymbol`、`visualCaption`、`heroImage`、`content`、`source`、`theme`。

文章视觉策略：

- `heroImage` 是阅读页第一屏的真实文章相关图片，优先使用云存储 fileID 或小程序静态资源路径。
- `imagePalette` 记录从图片或文章主题中提取出来的浅色调色结果，前端最终只消费 `theme`，不在阅读页运行取色算法。
- `theme.visualStart`、`theme.visualEnd`、`theme.warmSoft`、`theme.coolSoft` 必须偏浅，服务阅读背景，不做固定大色块。
- 阅读页背景属于文章滚动内容的一部分，不能再做成固定在手机 viewport 上的绿色/彩色面板。

### 5.2 `articleLearningContent`

文章精讲缓存，替代 `src/utils/learningContent.ts` 的主数据来源。

```ts
interface ArticleLearningContentDocument {
  _id: string
  articleId: string
  status: 'pending' | 'ready' | 'failed'
  provider: 'local-prebuilt' | 'cloud-cache' | string
  model: string
  updatedAt: string
  generatedAt: number | null
  errorCode?: string
  errorMessage?: string
  sentenceTranslations: Record<string, {
    text: string
    translation: string
    note: string
    audioFileId?: string
    audioUrl?: string
    audioStatus?: 'missing' | 'pending' | 'ready' | 'failed'
  }>
  wordExplanations: Record<string, {
    word: string
    phonetic: string
    partOfSpeech: string
    meaning: string
    example: string
    exampleTranslation: string
    note?: string
    audioFileId?: string
    audioUrl?: string
    audioStatus?: 'missing' | 'pending' | 'ready' | 'failed'
  }>
  reviewedPhrases: {
    text: string
    meaning: string
    reason: string
  }[]
}
```

`sentenceTranslations` 的 key 必须沿用前端规则：`${blockIndex}:${sentenceIndex}`。  
`wordExplanations` 的 key 必须使用小写归一化单词，例如 `avoid`、`compound`。

### 5.3 `userVocabulary`

用户生词本，替代 `src/utils/storage.ts` 中的 `vocab_words` 主数据来源。

```ts
interface UserVocabularyDocument {
  _id: string
  openid: string
  word: string
  normalizedWord: string
  phonetic: string
  partOfSpeech: string
  meaning: string
  example: string
  exampleTranslation: string
  sourceArticleId?: string
  sourceSentence?: string
  addTime: number
  nextReviewTime: number
  familiarity: number
  reviewCount: number
  correctCount: number
  createdAt: number
  updatedAt: number
  deletedAt: number | null
}
```

约束：

- 同一 `openid + normalizedWord` 只保留一条有效记录。
- 删除优先软删除，避免误删学习历史。
- 前端已有字段名 `addTime`、`nextReviewTime`、`familiarity`、`reviewCount`、`correctCount` 先保留，减少前端迁移成本。

### 5.4 `reviewRecords`

复习流水，用于统计和后续算法优化。

```ts
interface ReviewRecordDocument {
  _id: string
  openid: string
  vocabularyId: string
  normalizedWord: string
  result: 'known' | 'unknown'
  familiarityBefore: number
  familiarityAfter: number
  nextReviewTimeBefore: number
  nextReviewTimeAfter: number
  reviewedAt: number
}
```

### 5.5 `userArticleProgress`

阅读进度和学习统计。

```ts
interface UserArticleProgressDocument {
  _id: string
  openid: string
  articleId: string
  readPercent: number
  lastSentenceId?: string
  highlightedSentenceIds: string[]
  keySentenceIds: string[]
  completed: boolean
  readDurationSeconds: number
  lastReadAt: number
  updatedAt: number
}
```

### 5.6 `userDailyStats`

可选缓存表，用于我的页快速展示。

```ts
interface UserDailyStatsDocument {
  _id: string
  openid: string
  date: string
  wordsAdded: number
  wordsReviewed: number
  articlesRead: number
  readDurationSeconds: number
  masteredWords: number
  updatedAt: number
}
```

MVP 可以先不建此集合，直接由 `userVocabulary`、`reviewRecords`、`userArticleProgress` 聚合。

## 6. 云函数设计

### 6.1 `getArticleList`

用途：获取已发布文章列表。

输入：

```ts
{
  level?: string
  tag?: string
  limit?: number
  cursor?: string
}
```

输出：

```ts
{
  ok: true
  data: ArticleDocument[]
  nextCursor: string | null
}
```

规则：

- 只返回 `status = 'published'`。
- 默认按 `sortOrder`、`publishedAt` 排序。
- 列表可以返回完整 `content`，MVP 简化；后续文章量大时再拆摘要和详情。

### 6.2 `getArticleDetail`

用途：获取单篇文章详情。

输入：

```ts
{
  articleId: string
}
```

输出：

```ts
{
  ok: true
  data: ArticleDocument
}
```

失败：

- `ARTICLE_NOT_FOUND`
- `ARTICLE_NOT_PUBLISHED`

### 6.3 `getArticleLearningContent`

用途：读取文章精讲缓存。

输入：

```ts
{
  articleId: string
}
```

输出：

```ts
{
  ok: true
  data: ArticleLearningContentDocument | null
}
```

规则：

- 普通前端只读缓存，不触发 AI 生成。
- 如果缓存不存在，返回 `null` 或 `status = 'pending'`，前端显示轻提示。

### 6.4 `generateArticleLearningContent`

用途：开发者或管理流程触发 AI 生成文章精讲。

现状：已有骨架 `cloudfunctions/generateArticleLearningContent/index.js`。

输入：

```ts
{
  articleId: string
  force?: boolean
}
```

后端内部流程：

```text
读 articles.articleId
-> 若 articleLearningContent ready 且 force 不是 true，直接返回缓存
-> 写入 pending 状态
-> 调 OpenAI Responses API
-> 校验 JSON schema
-> 转成前端要求的 Record 结构
-> 写入 articleLearningContent ready
-> 失败时写入 failed + errorCode
```

重要规则：

- `OPENAI_API_KEY`、`OPENAI_BASE_URL`、`OPENAI_MODEL` 只能在云函数环境变量。
- 不允许前端直接传完整 prompt 或 API Key。
- 普通用户点击句子和单词时不调用此函数。
- 生成结果必须可复用，多个用户共享同一篇文章的精讲缓存。

### 6.4.1 翻译与发音生成策略

用户提出的“每找一篇文章，就把文章、句子翻译、单词解释先生成并保存到后端；用户点击时直接从后端取”是正确方向。MVP 不做用户点击时实时 AI 翻译，原因是：

- 标准性：同一篇文章的译文需要可审核、可复用，避免每次生成结果不一致。
- 成本：句子和单词点击频率高，实时调用 AI 会放大 token 成本。
- 速度：阅读页交互必须轻，点击句子/单词时应该是读取缓存，而不是等待模型生成。
- 安全：API Key 只留在云函数环境变量里，前端不能接触。

推荐流程：

```text
文章入库或管理员触发
-> generateArticleLearningContent 生成句子翻译、单词解释、例句、学习提示
-> 人工抽查或规则校验 JSON 结构
-> 写入 articleLearningContent ready
-> 前端长按句子/点击单词时读取 ready 缓存
```

发音功能推荐走“缓存音频”路线，而不是在小程序端临时合成：

```text
articleLearningContent ready
-> generateArticleAudioAssets 读取句子和单词文本
-> 调用 TTS provider 生成标准美音/英音 mp3
-> 上传到云存储
-> 把 audioFileId/audioUrl/audioStatus 写回 articleLearningContent
-> 前端用 InnerAudioContext 播放缓存音频
-> 没有 audioUrl 时沿用当前 simulated progress fallback
```

TTS provider 选择：

- MVP：优先接微信生态或腾讯云 TTS，和小程序云开发链路一致，音频文件放云存储。
- 备选：OpenAI TTS 或其他高质量 TTS，只能在云函数里调用，生成后仍然缓存文件。
- 不推荐：前端实时请求第三方 TTS。这样会暴露接口、受网络波动影响，也不利于成本控制。

新增云函数建议：

```ts
generateArticleAudioAssets({
  articleId: string
  voice?: 'en-US-standard' | 'en-GB-standard'
  force?: boolean
})
```

规则：

- 普通用户不直接调用 `generateArticleAudioAssets`。
- 音频以文章为单位批量生成；单词音频可以跨文章复用，但 MVP 可先随文章缓存。
- 句子音频用于“朗读当前句/全文朗读”，单词音频用于单词卡片喇叭按钮。
- 生成失败只标记 `audioStatus = 'failed'`，不影响翻译和释义展示。

### 6.5 `addVocabularyWord`

用途：添加生词。

输入：

```ts
{
  word: string
  phonetic: string
  partOfSpeech: string
  meaning: string
  example: string
  exampleTranslation: string
  sourceArticleId?: string
  sourceSentence?: string
}
```

输出：

```ts
{
  ok: true
  data: UserVocabularyDocument
  duplicated: boolean
}
```

规则：

- 云函数内部从上下文拿 `openid`。
- 如果同一单词已存在且未删除，返回已有记录和 `duplicated: true`。
- 如果曾经软删除，可以恢复并更新释义。

### 6.6 `getVocabularyList`

用途：获取用户生词列表。

输入：

```ts
{
  dueOnly?: boolean
  limit?: number
  cursor?: string
}
```

输出：

```ts
{
  ok: true
  data: UserVocabularyDocument[]
  nextCursor: string | null
}
```

### 6.7 `reviewVocabularyWord`

用途：提交复习结果，并计算下次复习时间。

输入：

```ts
{
  vocabularyId: string
  result: 'known' | 'unknown'
}
```

规则沿用当前前端算法：

- `known`：`correctCount + 1`，`familiarity + 1`，最大 5。
- `unknown`：`familiarity - 1`，最小 0。
- `reviewCount + 1`。
- `nextReviewTime = now + 2^familiarity * 86400000`。
- 写入 `reviewRecords`。

### 6.8 `removeVocabularyWord`

用途：从生词本删除单词。

输入：

```ts
{
  vocabularyId: string
}
```

规则：

- 只允许删除当前 openid 的记录。
- MVP 使用软删除：写入 `deletedAt`。

### 6.9 `getUserStats`

用途：我的页统计。

输出：

```ts
{
  ok: true
  data: {
    total: number
    reviewed: number
    mastered: number
    todayReview: number
    todayAdded: number
  }
}
```

字段必须兼容当前 `src/pages/me/me.vue` 的 `Stats` 结构。

### 6.10 `updateArticleProgress`

用途：保存阅读进度、划线句、重点句。

输入：

```ts
{
  articleId: string
  readPercent?: number
  lastSentenceId?: string
  highlightedSentenceIds?: string[]
  keySentenceIds?: string[]
  readDurationSeconds?: number
  completed?: boolean
}
```

P0 可以先只设计，不马上接入页面。后续阅读页划线和重点句要云同步时启用。

## 7. 前端接入策略

### 7.1 并行开发分工

后端窗口负责：

- 新建或完善 `cloudfunctions/*`。
- 设计和初始化云数据库集合。
- 完成云函数输入输出。
- 提供 mock 云端返回样例。
- 不改 `src/pages/index/index.vue` 的阅读交互。

前端窗口负责：

- 只改 `src/repositories/*` 和必要的 service/facade。
- 保持页面调用方式稳定。
- 给云端读取加 loading、失败 fallback、本地 mock fallback。
- 继续运行 `npm.cmd run check:ui` 和 `npm.cmd run build:mp-weixin`。

共同约定：

- 数据契约以本 PRD 的 TypeScript interface 为准。
- 如果后端字段要改，先改 PRD，再改云函数和 repository。
- 前端页面不直接调用云函数，只通过 repository。

### 7.2 Repository 迁移顺序

第一步：`articleRepository.ts`

```text
listArticles()
getArticleByIndex()
getArticleCount()
```

改为优先读云端文章列表，失败时回退 `features/reader/articles.ts`。

第二步：`learningContentRepository.ts`

```text
getCachedArticleLearningContent(articleId)
getCachedWordExplanation(articleId, word)
getReviewedPhraseTexts(articleId)
```

改为优先读 `articleLearningContent` 云端缓存，失败时回退 `utils/learningContent.ts`。

第三步：`vocabularyRepository.ts`

```text
addWord()
loadVocab()
getTodayReviewWords()
reviewWord()
removeWord()
getStats()
```

改为云端为主、本地 storage 为离线 fallback。注意这些函数当前是同步接口，切云端时需要设计异步迁移，不能硬改导致页面大面积崩。

### 7.3 同步到异步的处理原则

文章和学习内容迁移到云端后会变成异步读取。前端改造时建议：

- service 层新增异步方法，例如 `loadReaderArticles()`。
- 保留当前同步方法作为本地 fallback。
- 阅读页先显示本地文章或 loading，再用云端数据刷新。
- 不在同一轮同时重构 UI 和云端数据。

## 8. 安全和权限

- 云函数必须从微信上下文获取 `openid`，不信任前端传入的 openid。
- 用户只能读写自己的 `userVocabulary`、`reviewRecords`、`userArticleProgress`。
- 普通用户只能读取 `published` 文章。
- `generateArticleLearningContent` 必须限制调用者。MVP 可先只在开发者工具或管理环境调用，后续加 admin 白名单。
- `OPENAI_API_KEY` 只能放云函数环境变量。
- 前端 `src`、根目录产物、构建产物都不能出现 API Key。
- AI 生成失败要写 `failed` 状态，不要无限重试。

## 9. 内容生产流程

MVP 内容生产采用开发者录入，不做完整后台。

```text
开发者准备文章 JSON
-> 写入 articles，status = draft
-> 调 generateArticleLearningContent
-> 检查 articleLearningContent ready
-> 人工抽查句子翻译、单词解释、审核短语
-> articles.status 改为 published
-> 前端文章列表可见
```

后续可以再做管理页或脚本化导入。

## 10. 失败和降级

文章列表失败：

- 前端回退本地 `features/reader/articles.ts`。
- 显示当前可读内容，不阻断阅读。

精讲内容失败：

- 前端回退本地 `utils/learningContent.ts`。
- 如果本地也没有，句子翻译显示“这句译文稍后补充”。

生词同步失败：

- 前端先写本地 storage。
- 标记待同步队列，后续恢复网络时补同步。
- MVP 可以先提示“已保存到本地，稍后同步”。

AI 生成失败：

- `articleLearningContent.status = failed`。
- 记录 `errorCode`、`errorMessage`。
- 开发者手动重试，不自动循环重试。

音频生成失败：

- 保留句子翻译和单词解释，不阻断阅读。
- 对应句子或单词写入 `audioStatus = 'failed'` 和错误信息。
- 前端如果没有 `audioUrl`，继续使用当前朗读按钮的模拟进度或轻提示，不在前端临时调用 TTS。

## 11. 验收标准

### 11.1 后端验收

- 云数据库存在 `articles`、`articleLearningContent`、`userVocabulary`、`reviewRecords`、`userArticleProgress` 集合。
- `getArticleList` 能返回已发布文章。
- `getArticleDetail` 能返回单篇文章。
- `getArticleLearningContent` 能返回 ready 精讲缓存。
- `generateArticleLearningContent` 能在无 API Key 时返回 `MISSING_OPENAI_API_KEY`，有 API Key 时写入 ready 缓存。
- `generateArticleAudioAssets` 能把句子/单词音频生成到云存储，并把 `audioFileId` 或 `audioUrl` 写回缓存；无 TTS Key 时返回明确错误码。
- `addVocabularyWord` 能按 openid 去重。
- `reviewVocabularyWord` 能更新熟悉度、复习次数、下次复习时间，并写 review record。
- `getUserStats` 返回结构兼容当前我的页。

### 11.2 前端联调验收

- 微信开发者工具导入 `D:\芸\英语\class-english-miniprogram`。
- 云端文章加载成功时，阅读页显示云端文章。
- 云端失败时，阅读页仍显示本地 fallback。
- 长按句子能显示云端句子翻译。
- 点击单词能显示云端单词解释。
- 点击句子朗读或单词发音时，优先播放云端缓存音频；没有音频时不影响翻译/释义展示。
- 加入生词后云端能看到对应 `userVocabulary`。
- 复习后云端 `reviewRecords` 有记录。
- 我的页统计与云端数据一致。
- 前端源码中没有 API Key。

## 12. 实施里程碑

### Milestone 1：后端数据契约和种子数据

- 确认本 PRD 字段。
- 建立云数据库集合。
- 写入当前 3 篇文章 seed 数据。
- 写入对应 `articleLearningContent` seed 数据。

### Milestone 2：内容读取云函数

- 实现 `getArticleList`。
- 实现 `getArticleDetail`。
- 实现 `getArticleLearningContent`。
- 前端 repository 可开始联调。

### Milestone 3：AI 精讲生成

- 完善 `generateArticleLearningContent`。
- 从数据库读取文章，而不是要求前端传完整 article。
- 生成结果转为 Record 结构。
- 加状态、错误记录、force 重生成。

### Milestone 3.5：TTS 音频缓存

- 实现 `generateArticleAudioAssets`。
- 接入 TTS provider，只在云函数环境变量里保存 Key。
- 生成句子音频和单词音频，上传云存储。
- 把 `audioFileId`、`audioUrl`、`audioStatus` 写回 `articleLearningContent`。
- 前端后续只通过 repository/service 读取音频地址，不直接接触 TTS provider。

### Milestone 4：生词和复习

- 实现 `addVocabularyWord`。
- 实现 `getVocabularyList`。
- 实现 `reviewVocabularyWord`。
- 实现 `removeVocabularyWord`。
- 实现 `getUserStats`。

### Milestone 5：前端云端切换

- `articleRepository` 接云端。
- `learningContentRepository` 接云端。
- `vocabularyRepository` 设计异步迁移。
- 保留本地 fallback。

## 13. 新窗口启动说明

后端窗口先读：

1. `D:\芸\英语\AGENTS.md`
2. `class-english-miniprogram/docs/backend-architecture-prd.md`
3. `class-english-miniprogram/docs/frontend-architecture-map.md`
4. `class-english-miniprogram/cloudfunctions/generateArticleLearningContent/index.js`

后端窗口优先任务：

- 不动阅读页 UI。
- 先补云数据库集合和云函数。
- 先做内容读取和 AI 缓存，不急着改前端页面。

前端窗口先读：

1. `D:\芸\英语\AGENTS.md`
2. `class-english-miniprogram/docs/backend-architecture-prd.md`
3. `class-english-miniprogram/docs/frontend-architecture-map.md`
4. `src/repositories/*`
5. `src/services/*`

前端窗口优先任务：

- 不改后端云函数目录，除非和后端窗口约定。
- 优先改 repository，不直接把云函数调用写进页面。
- 保留本地 fallback，避免云端未准备好时阅读页不可用。

## 14. 开放问题

- 微信云开发环境 ID 尚未写入文档，需要后端窗口初始化后补充。
- 是否需要管理端 CMS 暂不确定，MVP 先用开发者 seed 数据。
- 生词 repository 当前是同步接口，云端化前需要单独设计异步迁移方案。
- 用户登录策略暂按微信 openid，不额外做手机号或账号体系。
- 文章图片已经进入阅读页第一屏；后端需要沉淀 `heroImage` 和由图片/主题提取出的浅色 `theme`。

## 15. 决策记录

- 后端 MVP 采用微信云开发，不先自建服务器。
- 文章和精讲内容云端为主，本地 mock 保留 fallback。
- AI 只做预生成和缓存，不做用户点击时实时生成。
- 翻译与发音都走后端缓存：翻译缓存文本，发音缓存音频文件，前端只读缓存。
- 前端云端接入点固定在 repository 层。
- 用户数据以 openid 隔离。
- API Key 只能在云函数环境变量。
