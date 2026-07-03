# 阅读页 UI 精修 PRD

日期：2026-07-03  
状态：审查完成，等待用户确认后再进入实现  
适用范围：微信小程序阅读页、句子翻译弹窗、单词卡、设置面板、朗读/发音交互。  
基线回退点：`25581c2 chore: snapshot mini program baseline before polish`  
远端备份：已推送到 `origin/codex/backend-cloud-migration`

## 1. 审查结论

需要修改，但只做精修，不做重新设计。

当前界面已经有值得保留的基础：文章封面、浅色图片取色渐变、居中的阅读列、轻量句子翻译气泡、紧凑单词卡、设置面板结构都符合英语精读主路径。继续大改容易破坏已经建立的阅读稳定性。

本轮应该修的是“临时感”和“功能真实性”：

- 顶部 `♫`、单词卡 `♪`、正文句尾 `▸`、播放态 `■` 都像临时字符，不够精细，也不统一。
- 顶部音频按钮和 `Aa`、微信胶囊区域靠得太近，视觉重量不一致。
- 句尾常驻小三角干扰正文，而且触达面积太小。
- `src/utils/tts.ts` 目前没有创建 `uni.createInnerAudioContext()`、没有设置 `src`、没有调用 `play()`，所以点击发音不出声是技术链路缺失，不是单纯 UI 问题。
- 没有真实音频资源时，前端不能假装播放，应该明确提示“音频还在准备中”。

结论：保留当前页面方向，只做 P0 级精修。下一轮实现不得扩散到整体页面重做。

## 2. 审查依据

本 PRD 基于以下材料生成：

- Product Design audit skill：用于判断“是否需要修改”和“哪些地方会损害体验”。
- Brainstorming skill：用于把修改控制为 PRD 和方案，不直接进入实现。
- 截图证据：
  - `docs/product-design-audits/reader-audio-ui/01-reader-page-audio-control.png`
  - `docs/product-design-audits/reader-audio-ui/02-reader-settings-open.png`
- 已有审查文档：
  - `docs/product-design-audits/reader-audio-ui/audit-and-change-plan.md`
- 项目文档：
  - `docs/product-requirements.md`
  - `docs/frontend-architecture-map.md`
  - `docs/wechat-miniprogram-working-rules.md`
- 源码证据：
  - `src/pages/index/index.vue`
  - `src/utils/tts.ts`
  - `scripts/ui-smoke-check.cjs`

没有使用 Figma、ImageGen 或 Creative Production。原因：本轮不是生成新设计稿，也不是做品牌素材，而是对已有小程序界面做产品审查和实现前 PRD。

## 3. 设计原则

1. 阅读优先：正文不能被工具按钮、弹层、动画持续打扰。
2. 只修缮，不重做：保留现有页面结构、封面方向、浅色渐变、阅读列和底部 Tab。
3. 统一图标语言：发音、朗读、播放、不可用状态必须使用同一套视觉逻辑。
4. 功能反馈诚实：没有音频资源时不进入假播放状态。
5. 微信真机优先：H5 预览只能辅助，最终以微信开发者工具和真机为准。
6. 后端边界清晰：翻译、单词解释、音频 URL 都应来自后端缓存；前端不直接接 TTS provider，不放 API Key。

## 4. 保留范围

以下内容不应在本轮改掉：

- 阅读页整体信息架构。
- 文章封面图和标题在首屏的表达方式。
- 图片取色后的浅色渐变背景。
- 正文居中阅读列：阅读列居中，英文文本左对齐。
- 句子翻译使用轻量气泡/弹窗，不改成正文内联块。
- 单词解释保持小学习卡片，不改成大底部抽屉。
- 设置面板主体结构：字号、夜间模式、生词本入口。
- 底部 Tab 结构。
- 旧底部三按钮 `reader-toolbar` 不允许回归。

## 5. 修改范围

### 5.1 顶部朗读按钮

当前问题：

- `♫` 语义偏音乐，不是英语朗读。
- 字符图标受字体影响，显得临时。
- 与 `Aa` 按钮大小、重量、状态不统一。

目标方案：

- 替换为统一的 speaker / volume 图标按钮。
- 与 `Aa` 使用同一按钮基座：约 40-42px 圆形、半透明浅底、轻阴影。
- 控件组避开微信胶囊安全区，保持清晰间距。
- 状态分为 idle、loading、playing、unavailable。

状态表现：

- idle：白色半透明圆形，深灰 speaker 图标。
- loading：保持圆形基座，小 loading 或三点状态。
- playing：主题 accent 绿色背景，白色 speaker/pause 图标。
- unavailable：低饱和 muted speaker，点击 toast。

### 5.2 正文句子区域

当前问题：

- 每句末尾常驻 `▸` 太小，像标点，影响阅读节奏。
- 触达面积不足，不适合作为真机主入口。

目标方案：

- 移除正文句尾常驻 `reader-body__play-mark`。
- 句子朗读入口放到长按后的句子弹窗动作区。
- 如果后续有句子正在播放，可只给当前句增加轻量状态，例如 2px 左侧 accent 线或 1px 进度线，不推动正文布局。

### 5.3 句子翻译弹窗

当前结构可保留。

需要微调：

- “朗读”动作增加同一套 speaker 图标。
- 划线、复制、朗读、重点句动作保持稳定点击区域。
- 弹窗动作区加入图标后不得撑高过多，不遮挡当前句。

### 5.4 单词卡发音

当前问题：

- `♪` 和顶部 `♫` 不统一，也不像标准发音控件。

目标方案：

- 替换为同一套 speaker 图标。
- 按钮尺寸约 32-36px，放在单词/音标右侧。
- 点击有轻微按压态。
- 没有音频时 toast：`单词音频稍后补充`。

### 5.5 字号三挡

建议三挡如下，保持精读阅读的克制感：

- 小：15px / 26px，适合信息密度高。
- 标准：16px / 28px，默认值。
- 大：18px / 32px，适合真机舒适阅读。

不建议继续放大到 20px 以上作为正文默认挡位，否则封面下方首屏阅读量会明显下降。

### 5.6 设置面板

当前设置面板不需要大改。

可选小改：

- 音频资源未接入时，增加只读状态行：`发音资源 准备中`。
- 暂不加入语速、英音/美音、多音色配置，等后端音频资源稳定后再做。

## 6. 音频与翻译数据路径

翻译和发音都不应长期写死在前端。

推荐路径：

1. 后端预生成文章精讲内容：文章、句子翻译、单词解释、重点短语。
2. 后端保存到数据库或云端缓存。
3. 前端通过 repository/service 读取缓存内容。
4. 句子和单词音频后续由后端生成并保存为 `audioUrl`。
5. 前端只播放 `audioUrl`，不直接调用 TTS provider。

这个路径合理，因为它符合学习类产品的稳定性和成本控制：翻译质量可控、AI 成本可控、用户点击时响应快，也避免 API Key 暴露在小程序前端。

## 7. 技术方案

### 7.1 音频状态模型

建议统一状态：

```ts
type AudioAvailability = 'missing' | 'ready' | 'loading' | 'playing' | 'failed'
```

含义：

- `missing`：没有音频资源，不播放。
- `ready`：有可播放 `audioUrl`。
- `loading`：正在创建音频上下文或加载资源。
- `playing`：真实播放中。
- `failed`：播放失败。

### 7.2 `tts.ts` 改造方向

目标：从“模拟播放”改为“真实音频播放 + 明确 fallback”。

建议接口：

```ts
playAudioUrl(url, hooks)
stopSpeech()
speakTextFallback(text, hooks)
speakSentencesByAudioUrls(items, hooks)
```

规则：

- 有 `audioUrl` 时使用 `uni.createInnerAudioContext()`。
- 设置 `audio.src` 后调用 `audio.play()`。
- 监听 `onPlay`、`onEnded`、`onError`。
- 页面卸载、切换文章、连续点击时必须 stop/destroy 旧 audio context。
- 没有 `audioUrl` 时不调用 fallback 假播放，只提示不可用。
- fallback 只能用于开发期调试，不能作为正式发音体验。

### 7.3 页面边界

页面只负责：

- 展示按钮状态。
- 接收点击。
- 调用音频 service/facade。
- 展示 toast。

页面不负责：

- 调用 TTS provider。
- 保存 API Key。
- 生成音频文件。
- 拼装云数据库复杂字段。

## 8. 动效规范

动效只服务状态，不做炫技。

- 按钮按压：scale 0.97，150-180ms。
- 弹窗出现：opacity + translateY，180-220ms。
- loading：小点或轻量 spinner。
- playing：背景色变化即可，可加极轻 pulse。

禁止：

- 大面积波形动画。
- 持续闪烁。
- 正文播放状态导致文本重排。
- 因动画遮挡正在阅读的句子。

## 9. 范围分级

### P0：下一轮优先实现

- 顶部朗读按钮替换为统一 speaker 图标按钮。
- 单词卡发音按钮替换为同一套 speaker 图标。
- 移除正文句尾常驻 `▸`。
- 没有音频时 toast，不再假播放。
- `tts.ts` 明确区分真实播放和 fallback。
- `scripts/ui-smoke-check.cjs` 增加旧字符图标禁用检查：`♫`、`♪`、`▸`、`■`。

### P1：P0 稳定后实现

- 句子弹窗“朗读”增加 speaker icon。
- 顶部 controls 进一步适配微信胶囊安全区。
- 加入统一 loading/playing/unavailable 视觉状态。
- 在学习内容类型中预留 sentence / word `audioUrl` 字段。

### P2：后端音频稳定后实现

- 多句连续真实音频队列。
- 当前句播放进度线。
- 设置面板展示发音资源状态。
- 语速、英音/美音、多音色配置。

## 10. 不修改清单

本轮不得修改：

- 文章正文解析算法。
- 句子翻译缓存逻辑。
- 生词本核心数据结构。
- 后端云函数实现，除非只是为音频字段联调。
- 页面主视觉方向。
- 文章封面视觉方向。
- 底部 Tab。
- `dist/build/mp-weixin` 和根目录同步产物。

## 11. 验收标准

视觉验收：

- 顶部朗读按钮和 `Aa` 尺寸、圆角、阴影、视觉重量一致。
- 不再出现 `♫`、`♪`、`▸`、`■` 字符图标。
- 正文阅读节奏不被发音控件打断。
- 设置面板仍然轻量。
- 整体仍是浅色、克制、阅读优先。

交互验收：

- 没有音频时，点击朗读 300ms 内出现明确 toast。
- 有 `audioUrl` 时，能听到真实声音。
- 播放失败后按钮状态能恢复。
- 连续点击不会产生多个 audio context 同时播放。
- 页面卸载或切换文章时停止音频。

构建验收：

- 阅读页 UI 或交互改动后运行 `npm.cmd run build:mp-weixin`。
- 阅读页改动后运行 `npm.cmd run check:ui`。
- TypeScript 改动后运行 `npm.cmd exec vue-tsc -- --noEmit`。
- 检查编译后的 WXML/WXSS/JS，确认新 UI 标记存在、旧字符图标不存在、`reader-toolbar` 不存在。

## 12. 实施顺序

1. 用户确认本 PRD。
2. 只实现 P0，不碰整体页面结构。
3. 构建并运行 UI smoke check。
4. 用户在微信开发者工具和真机上验收。
5. P0 稳定后，再决定是否进入 P1。

## 13. 最终建议

建议修改，但必须按精修执行。

当前界面的主要方向是对的，不应推倒重来。下一轮最有效的改动是统一音频图标、去掉正文常驻小三角、修正真实音频状态，并用 smoke check 防止旧临时字符回归。
