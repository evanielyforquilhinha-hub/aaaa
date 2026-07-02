# Frontend Architecture Map

本项目先按微信小程序交付，H5 只作为辅助预览，不作为交互验收标准。

## 运行入口

- 微信开发者工具导入目录：`D:\芸\英语\class-english-miniprogram`
- 主源码目录：`src`
- 小程序构建产物目录：`dist/build/mp-weixin`
- 微信开发者工具当前按项目根目录编译；`npm.cmd run build:mp-weixin` 会先生成 `dist/build/mp-weixin`，再同步到根目录里的 `pages`、`common`、`utils`、`static` 兜底小程序产物。
- 根目录兜底产物用于 DevTools 直接编译和排查缓存/路径问题，不是主要编辑入口。

## 构建链路

- `npm.cmd run build:mp-weixin`：正式构建小程序，并同步根目录兜底产物。
- `npm.cmd run check:ui`：检查关键 UI/架构标记，避免回到旧逻辑。
- `npm.cmd exec vue-tsc -- --noEmit`：检查 TypeScript 类型。
- 微信开发者工具里新构建后点“编译”即可，不需要重新导入项目。

## 页面职责

- `src/pages/index/index.vue`：阅读页壳层。负责当前文章状态、长按句子、点击单词、朗读、字号、夜间模式、页面模板和样式。
- `src/pages/words/words.vue`：生词列表和轻量复习入口。
- `src/pages/review/review.vue`：独立复习卡片流程。
- `src/pages/word-detail/word-detail.vue`：单词详情页。
- `src/pages/me/me.vue`：学习统计和个人页。

## Reader 功能域

- `src/features/reader/types.ts`：阅读页领域类型，包括 `Article`、`ReaderTheme`、`ReaderToken`、`SentenceUnit`、`ContentBlock`。
- `src/features/reader/articles.ts`：本地文章数据和每篇文章的主题色。后面接数据库时，这里会变成 mock/fallback 数据。
- `src/features/reader/content.ts`：把文章正文拆成段落、句子、单词 token，并把审核过的重点短语标成加粗。

## Services 应用服务层

- `src/services/readerService.ts`：阅读页的数据入口。页面通过它获取文章、正文块、朗读句子、学习内容和单词精讲。
- `src/services/vocabularyService.ts`：生词动作入口。页面通过它添加生词，后续可以在这里接云端同步。
- service 层不关心数据最终来自本地 mock、微信云数据库还是云函数，它只给页面稳定的业务 API。
- 当前微信端页面可以通过 `src/utils/readerService.ts`、`src/utils/vocabularyService.ts` 这类 mp-safe facade 调用业务能力，避免编译后出现不稳定的 `../../services/...` 模块路径。
- 后续如果恢复直接使用 `src/services/`，必须先验证 `mp-weixin` 编译后的 require 路径和 DevTools 运行结果。

## Repositories 数据访问层

- `src/repositories/articleRepository.ts`：文章数据访问。当前读取 `src/features/reader/articles.ts`，后续可以切换为云数据库 `articles` 集合。
- `src/repositories/learningContentRepository.ts`：学习内容访问。当前读取 `src/utils/learningContent.ts`，后续可以切换为 `articleLearningContent` 集合或云函数。
- `src/repositories/vocabularyRepository.ts`：生词数据访问。当前读取本地 storage，后续可以切换为 `userVocabulary` 集合。
- repository 层是前端和后端之间的边界。后续接数据库时，优先改 repository，不直接改页面。

## 通用工具

- `src/utils/wordParser.ts`：纯文本解析，负责分段、分句、分词。
- `src/utils/learningContent.ts`：本地学习内容缓存，包含句子翻译、单词释义、审核短语。后面会被云端缓存替代或补充。
- `src/utils/dictionary.ts`：兜底小词典，缓存里没有单词时使用。
- `src/utils/storage.ts`：生词本本地存储和复习数据。
- `src/utils/tts.ts`：当前是模拟朗读进度，不是真实音频服务。
- `src/utils/lineTranslate.ts`：旧翻译 mock，阅读页不应继续依赖它，后面可以清理。
- `src/utils/articleTheme.ts`：旧主题工具，当前阅读页不依赖，后面可以合并或清理。

## 后端与云函数

- `cloudfunctions/generateArticleLearningContent/index.js`：AI 预生成学习内容的云函数骨架。
- 当前前端仍读 `learningContent.ts` 本地缓存；真实后端接入时，应先让云函数生成并缓存，再由前端读取缓存。
- API Key 只允许放云函数环境变量，不能进入 `src` 前端代码。

## 下一步 UI 改造落点

- 句子翻译冒泡：优先改 `src/pages/index/index.vue` 的翻译状态、模板和样式；如果定位逻辑变复杂，再抽到 `src/features/reader/translationBubble.ts`。
- 单词卡片变小和换位置：先改 `src/pages/index/index.vue` 的 `word-sheet` 结构和样式；稳定后可抽组件。
- 图片/封面主题融合：文章主题色在 `src/features/reader/articles.ts`，视觉呈现在 `src/pages/index/index.vue` 的 hero/cover 区。
- 顶部/底部工具栏重排：属于阅读页壳层，先在 `src/pages/index/index.vue` 完成。

## 约束

- 先改 `src`，再构建到 `dist/build/mp-weixin`。
- 不直接手改 `dist/build/mp-weixin` 或根目录兜底产物。
- 阅读页交互以微信开发者工具重新编译后的效果为准。
- 后续不要把文章数据、翻译缓存、正文解析算法继续塞回 `src/pages/index/index.vue`。
- 同一个微信端问题连续两次修复无效时，先查源码、构建产物、根目录兜底产物和 DevTools 项目路径，不继续叠加样式修补。
