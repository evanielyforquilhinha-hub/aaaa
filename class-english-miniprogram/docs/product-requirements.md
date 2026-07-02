# 英语精读小程序 PRD

版本：v0.1  
日期：2026-06-30  
产品阶段：前端体验打磨期，后端与数据库预留接入  
目标平台：微信小程序优先

## 1. 产品定位

这是一个面向四六级、考研英语和日常英语阅读提升用户的英语精读小程序。产品核心不是刷题，而是帮助用户高质量读懂一篇英文文章：阅读英文、理解句子、学习重点短语、点击单词查看释义、收藏生词、复习巩固。

产品体验目标是精致、克制、高级、苹果风。界面要服务阅读，不用复杂装饰干扰学习。所有功能都围绕一个原则：用户需要时出现，不需要时安静隐藏。

## 2. 目标用户

### 2.1 核心用户

- 正在准备 CET-4 / CET-6 的学生。
- 希望提升英语阅读能力的高中生、大学生、考研用户。
- 希望用碎片时间精读英文短文的英语学习者。

### 2.2 用户特点

- 学习时间碎片化，希望打开即可读。
- 不想被复杂操作打断。
- 遇到单词、长句、难短语时，希望快速获得解释。
- 希望保存生词并周期复习。
- 对界面审美有要求，偏好高级、干净、可信赖的学习产品。

## 3. 产品目标

### 3.1 短期目标

- 先完成微信小程序端阅读页 UI 和核心交互。
- 让点击单词、长按句子、收藏生词、复习这些基础学习路径稳定可用。
- 前端先使用本地 mock 数据跑通，不依赖后端也能继续设计和调试。

### 3.2 中期目标

- 接入微信云函数和云数据库。
- 文章、句子翻译、单词释义、审核短语从云端读取。
- 用户生词本和复习记录支持云端同步。

### 3.3 长期目标

- 建立文章内容管理和 AI 精讲生成流程。
- 支持更丰富的学习报告、文章分级、个性化推荐。
- 在体验稳定后，再评估会员、专题课程、分享裂变等商业功能。

## 4. 产品原则

1. 阅读优先：正文永远是视觉中心。
2. 低打扰：翻译、单词卡、工具栏都不能遮挡阅读主任务。
3. 小程序优先：以微信开发者工具和真实手机体验为验收标准，不以 H5 浏览器为准。
4. AI 低成本：AI 用于预生成和缓存，不在用户每次点击时实时调用。
5. 架构轻量：不做过度工程，但要为后端、数据库、AI 和新页面预留边界。
6. 设计统一：颜色、字号、间距、圆角、阴影、弹层都要有统一规则。

## 5. MVP 范围

### 5.1 P0 必做

- 阅读页文章展示。
- 每篇文章独立主题色，与封面/主题呼应。
- 英文正文分段、分句、分词展示。
- 审核过的重点短语加粗，不自动乱标。
- 点击单词弹出轻量单词卡。
- 长按句子弹出翻译冒泡。
- 翻译冒泡不占正文布局，不遮挡当前句子。
- 句子高亮只影响当前句，不推动整篇文章布局。
- 加入生词本。
- 生词本列表。
- 简单复习流程。
- 我的页学习统计。

### 5.2 P1 后续增强

- 文章列表页。
- 阅读进度保存。
- 更多文章分类：CET-4、CET-6、考研、外刊、科普。
- 真实发音服务。
- 云端生词同步。
- 云端复习记录。
- 学习日历和连续学习天数。

### 5.3 P2 暂缓

- 社区评论。
- 排行榜。
- 付费会员。
- 复杂后台管理系统。
- 实时 AI 问答。
- 自动生成分享海报。

## 6. 核心用户路径

### 6.1 阅读路径

打开小程序 -> 进入阅读页 -> 浏览文章封面和标题 -> 阅读英文正文 -> 点击单词查看释义 -> 长按句子查看翻译 -> 高亮重要句子 -> 加入生词 -> 继续阅读。

### 6.2 生词路径

阅读页点击单词 -> 查看释义 -> 加入生词本 -> 在生词页查看 -> 进入复习 -> 根据认识/不认识更新熟悉度。

### 6.3 内容生成路径

管理员或开发者录入文章 -> 云函数调用 AI 生成精讲 -> 保存句子翻译、单词释义、审核短语 -> 前端读取缓存 -> 用户学习。

## 7. 功能拆分

### 7.1 阅读模块 Reader

职责：

- 展示当前文章。
- 处理文章主题色。
- 解析段落、句子、单词 token。
- 展示重点短语加粗。
- 处理句子长按翻译。
- 处理单词点击释义。
- 支持夜间模式、字号调整、朗读入口。

当前文件：

- `src/pages/index/index.vue`
- `src/features/reader/types.ts`
- `src/features/reader/articles.ts`
- `src/features/reader/content.ts`

后续可拆组件：

- `ReaderHeader.vue`
- `ArticleHero.vue`
- `ReaderBody.vue`
- `SentenceBubble.vue`
- `WordCard.vue`
- `ReaderToolbar.vue`

### 7.2 生词模块 Vocabulary

职责：

- 保存用户生词。
- 展示生词列表。
- 删除生词。
- 进入单词详情。
- 为复习模块提供数据。

当前文件：

- `src/pages/words/words.vue`
- `src/pages/word-detail/word-detail.vue`
- `src/utils/storage.ts`

后续功能域：

- `src/features/vocabulary`
- `src/services/vocabularyService.ts`
- `src/repositories/vocabularyRepository.ts`

### 7.3 复习模块 Review

职责：

- 根据下次复习时间筛选单词。
- 展示复习卡片。
- 根据认识/不认识更新熟悉度。
- 记录复习数据。

当前文件：

- `src/pages/review/review.vue`
- `src/utils/storage.ts`

后续功能域：

- `src/features/review`
- `src/services/reviewService.ts`

### 7.4 我的模块 Me

职责：

- 展示学习统计。
- 展示今日新增、今日复习、掌握数量。
- 提供复习入口、生词入口。

当前文件：

- `src/pages/me/me.vue`

后续可扩展：

- 学习日历。
- 阅读时长。
- 连续学习天数。
- 账号信息。

### 7.5 学习内容模块 Learning Content

职责：

- 管理句子翻译。
- 管理单词解释。
- 管理审核短语。
- 前端先读本地 mock，后续替换为云端缓存。

当前文件：

- `src/utils/learningContent.ts`

后续迁移：

- `src/features/learning-content`
- `src/services/learningContentService.ts`
- `src/repositories/learningContentRepository.ts`

## 8. 前端架构

### 8.1 推荐目录

```text
src/
  pages/
    index/
    words/
    review/
    word-detail/
    me/
  features/
    reader/
    vocabulary/
    review/
    learning-content/
    user/
  components/
    base/
    feedback/
    layout/
  services/
    readerService.ts
    vocabularyService.ts
    reviewService.ts
    learningContentService.ts
    userService.ts
  repositories/
    articleRepository.ts
    learningContentRepository.ts
    vocabularyRepository.ts
    progressRepository.ts
  utils/
  static/
```

### 8.2 分层职责

`pages`：页面入口，只处理页面状态、模板、事件绑定和跳转。

`features`：业务功能域，放某个功能自己的类型、解析、状态构建、局部组件。

`components`：跨页面复用的 UI 组件，例如按钮、弹层、卡片、顶部栏。

`services`：应用服务层，页面只调用 service，不关心数据来自本地还是云端。

`repositories`：数据访问层，负责读取本地 mock、微信云数据库、云函数。

`utils`：纯工具函数，不依赖页面状态。

### 8.3 数据来源切换策略

前期：

```text
page -> service -> repository -> local mock
```

后期：

```text
page -> service -> repository -> cloud function / cloud database
```

这样后续接数据库时，页面不需要大改。

## 9. 后端架构

### 9.1 后端选择

优先使用微信云开发和云函数，不优先自建服务器。

原因：

- 与微信小程序天然集成。
- 适合早期小规模推广。
- 部署轻，维护成本低。
- API Key 可以放在云函数环境变量里，避免泄露到前端。

### 9.2 云函数拆分

`getArticleList`

- 获取文章列表。
- 支持按 level、tag、日期筛选。

`getArticleDetail`

- 获取文章详情。
- 返回标题、正文、封面、主题色、来源、词数等。

`getLearningContent`

- 获取某篇文章的学习内容缓存。
- 包括句子翻译、单词释义、审核短语。

`generateArticleLearningContent`

- AI 预生成文章学习内容。
- 只在文章入库或内容缺失时调用。
- 不直接暴露给普通前端点击行为。

`syncUserVocabulary`

- 同步用户生词本。
- 支持新增、删除、更新熟悉度。

`updateReviewRecord`

- 更新复习结果。
- 写入复习记录并计算下次复习时间。

`updateUserProgress`

- 保存用户阅读进度。
- 用于统计和后续推荐。

## 10. 数据库设计

### 10.1 articles

文章基础信息。

```ts
{
  _id: string
  title: string
  level: 'CET-4' | 'CET-6' | 'Postgraduate' | 'General'
  wordCount: number
  source: string
  content: string
  coverImage: string
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
  status: 'draft' | 'published' | 'archived'
  createdAt: number
  updatedAt: number
}
```

### 10.2 articleLearningContent

文章精讲缓存。

```ts
{
  _id: string
  articleId: string
  status: 'pending' | 'ready' | 'failed'
  provider: string
  sentenceTranslations: {
    blockIndex: number
    sentenceIndex: number
    text: string
    translation: string
    note: string
  }[]
  wordExplanations: {
    word: string
    phonetic: string
    partOfSpeech: string
    meaning: string
    example: string
    exampleTranslation: string
    note?: string
  }[]
  reviewedPhrases: {
    text: string
    meaning: string
    reason: string
  }[]
  updatedAt: number
}
```

### 10.3 userVocabulary

用户生词本。

```ts
{
  _id: string
  openid: string
  word: string
  phonetic: string
  partOfSpeech: string
  meaning: string
  example: string
  exampleTranslation: string
  sourceArticleId: string
  familiarity: number
  reviewCount: number
  correctCount: number
  nextReviewAt: number
  createdAt: number
  updatedAt: number
}
```

### 10.4 reviewRecords

复习记录。

```ts
{
  _id: string
  openid: string
  wordId: string
  result: 'known' | 'unknown' | 'tooEasy'
  familiarityBefore: number
  familiarityAfter: number
  reviewedAt: number
}
```

### 10.5 userProgress

阅读进度和学习统计。

```ts
{
  _id: string
  openid: string
  articleId: string
  readPercent: number
  readDuration: number
  completed: boolean
  lastReadAt: number
  updatedAt: number
}
```

## 11. AI 学习内容生成

### 11.1 原则

不做用户点击时实时 AI 翻译。采用 AI 预生成、云端缓存、前端读取。

### 11.2 流程

```text
录入文章
-> 调用 generateArticleLearningContent 云函数
-> AI 返回结构化 JSON
-> 写入 articleLearningContent
-> 前端读取缓存
-> 用户长按句子/点击单词时即时展示
```

### 11.3 生成内容

- `sentenceTranslations`：每句英文、中文翻译、简短难点说明。
- `wordExplanations`：单词、音标、词性、释义、例句、例句翻译。
- `reviewedPhrases`：审核过的重点短语、中文解释、学习价值。

### 11.4 成本控制

- 每篇文章生成一次，多个用户共享缓存。
- 失败时记录 `failed` 状态，不反复重试。
- 前端没有缓存时显示生成中，不直接调 AI。

## 12. UI / UX 设计规范

### 12.1 视觉方向

- 苹果风。
- 高级、干净、克制。
- 阅读内容优先。
- 背景颜色和文章主题/封面颜色呼应。
- 图片不要加过度光带，不要出现截图感、脏图、文字杂乱图。

### 12.2 阅读排版

- 正文字号以微信手机阅读舒适为准，默认约 16px。
- 行高约 28px，后续可根据真机微调。
- 左右边距约 28px 到 30px。
- 段落间距克制，避免文章被拉散。
- 句子高亮不改变布局，不推动后文。

### 12.3 句子翻译

- 长按句子打开。
- 使用冒泡/浮层样式。
- 不占正文布局空间。
- 不遮挡当前英文句子。
- 点击空白处关闭。
- 操作包括复制、高亮、分享预留。

### 12.4 单词卡片

- 点击单词打开。
- 尺寸小，不能像大抽屉挡住阅读。
- 展示单词、音标、词性、中文释义、加入按钮、发音按钮。
- 点击空白处关闭。
- 长按单词优先触发整句翻译时，要抑制误触单词卡。

### 12.5 工具栏

- 夜间、字号、生词本等工具不能挡住正文视线。
- 后续考虑放到顶部或轻量悬浮入口。
- 底部固定栏要谨慎使用，避免遮挡阅读。

## 13. 开发与验收规则

### 13.1 开发规则

- 只改 `src` 源码，不直接手改 `dist/build/mp-weixin`。
- 修改阅读页后运行 `npm.cmd run build:mp-weixin`。
- 微信开发者工具导入项目根目录：`D:\芸\英语\class-english-miniprogram`。
- 微信实际运行目录：`dist/build/mp-weixin`。
- 小程序端体验以微信开发者工具和真机为准。

### 13.2 验收命令

```bash
npm.cmd exec vue-tsc -- --noEmit
npm.cmd run check:ui
npm.cmd run build:mp-weixin
```

### 13.3 核心验收标准

- 点击单词能弹出生词卡。
- 长按句子能弹出翻译冒泡。
- 翻译冒泡不遮挡当前句。
- 句子高亮不影响其他句子布局。
- 复制只复制当前句和当前句翻译。
- 前端代码不包含 API Key。
- 阅读页不依赖远程不稳定图片。
- 构建后微信开发者工具可直接重新编译查看。

## 14. 迭代路线

### 阶段一：前端体验稳定

- 修复阅读页句子翻译冒泡。
- 调整单词卡片尺寸和位置。
- 优化文章封面和主题色融合。
- 重排顶部/底部工具。
- 固化 UI token 和组件规范。

### 阶段二：前端架构轻量升级

- 增加 `services`。
- 增加 `repositories`。
- 页面改为通过 service 获取数据。
- 本地 mock 数据从页面和工具中逐步迁移。

### 阶段三：云端数据接入

- 建立 `articles` 集合。
- 建立 `articleLearningContent` 集合。
- 接入文章列表和文章详情云函数。
- 前端 repository 从本地 mock 切换到云端读取。

### 阶段四：用户数据同步

- 接入 openid。
- 生词本云端同步。
- 复习记录云端同步。
- 我的页统计从云端读取。

### 阶段五：内容生产和 AI 精讲

- 完善 `generateArticleLearningContent` 云函数。
- 支持文章入库后自动生成精讲。
- 建立内容审核流程。
- 控制 AI 成本和失败重试策略。

## 15. 风险与应对

### 15.1 UI 反复回退

风险：H5 和微信小程序表现不同，导致修了网页没修小程序。  
应对：所有阅读页交互以微信开发者工具为准。

### 15.2 AI 成本失控

风险：用户每次点击都调用 AI。  
应对：只做预生成和缓存，前端只读缓存。

### 15.3 页面文件继续膨胀

风险：`index.vue` 继续堆逻辑，后续难维护。  
应对：新增逻辑优先放 `features`、`services`、`repositories`。

### 15.4 数据结构频繁变化

风险：前端字段和后端字段不一致。  
应对：先定义 TypeScript 类型，云函数返回结构保持稳定。

### 15.5 设计风格不统一

风险：每次修一个功能都新增一套样式。  
应对：逐步沉淀全局 token 和基础组件。

## 16. 下一步实施建议

下一步先做两件事：

1. 阅读页 UI 继续修复：句子翻译改为真正冒泡，单词卡缩小并换位置，封面和工具栏重新打磨。
2. 轻量加上 `services` 和 `repositories` 边界，但暂时仍读本地 mock，不急着接数据库。

这样既能继续快速打磨前端，也不会影响后续后端和数据库接入。
