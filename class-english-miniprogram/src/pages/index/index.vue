<script setup lang="ts">
import { ref, computed, onMounted, nextTick, onUnmounted } from 'vue'
import { type TextToken } from '@/utils/wordParser'
import { lookupWord, type WordLookup } from '@/utils/dictionary'
import { playAudioUrl, speakSentencesByAudioUrls, stopSpeech } from '@/utils/tts'
import {
  getReaderArticleByIndex,
  getReaderArticles,
  getReaderContentBlocks,
  getReaderLearningContent,
  getReaderSentences,
  getReaderWordExplanation,
} from '@/utils/readerService'
import { addVocabularyWord } from '@/utils/vocabularyService'
import type { SentenceUnit } from '@/features/reader/types'

type AudioAvailability = 'missing' | 'ready' | 'loading' | 'playing' | 'failed'

const currentIndex = ref(0)
const articles = getReaderArticles()
const currentArticle = computed(() => getReaderArticleByIndex(currentIndex.value))
const currentTheme = computed(() => currentArticle.value.theme)
const currentLearningContent = computed(() => getReaderLearningContent(currentArticle.value.id))
const readerPageStyle = computed(() => ({
  '--reader-accent': currentTheme.value.accent,
  '--reader-warm': currentTheme.value.warm,
  '--reader-cool': currentTheme.value.cool,
  '--reader-paper': currentTheme.value.paper,
  '--reader-shadow': currentTheme.value.shadow,
  '--reader-warm-soft': currentTheme.value.warmSoft,
  '--reader-cool-soft': currentTheme.value.coolSoft,
  '--reader-visual-start': currentTheme.value.visualStart,
  '--reader-visual-end': currentTheme.value.visualEnd,
  '--reader-accent-soft': currentTheme.value.accentSoft,
}))
const statusBarHeight = ref(20)
const safeAreaBottom = ref(0)
const viewportHeight = ref(720)
const readerScrollTop = ref(0)
const observedReaderScrollTop = ref(0)
const buildFingerprint = 'v2012-article-hero'
const nightMode = ref(false)
const fontScale = ref(1)
const reading = ref(false)
const activeSentenceIndex = ref(-1)
const audioState = ref<AudioAvailability>('missing')

const blocks = computed(() => getReaderContentBlocks(currentArticle.value))

const sentences = computed(() => getReaderSentences(currentArticle.value))
const articleAudioItems = computed(() =>
  blocks.value
    .flatMap((block) => block.sentences)
    .map((sentence) => ({
      audioUrl: sentence.audioUrl || '',
      sentence: sentence.plainText,
      sentenceId: sentence.id,
    }))
    .filter((item) => item.audioUrl),
)
const hasArticleAudio = computed(() => articleAudioItems.value.length > 0)
const readerFontSize = computed(() => `${Math.round(16 * fontScale.value)}px`)
const readerLineHeight = computed(() => `${Math.round(28 * fontScale.value)}px`)

const wordSheetVisible = ref(false)
const wordSheetActive = ref(false)
const selectedWordKey = ref('')
const selectedLookup = ref<WordLookup | null>(null)
const added = ref(false)
const settingsPanelVisible = ref(false)
const settingsPanelActive = ref(false)
const fontScaleOptions = [
  { label: '小', value: 0.94 },
  { label: '标准', value: 1 },
  { label: '大', value: 1.12 },
]
let lastSettingsActionAt = 0
let lastSettingsActionKey = ''

const highlightedWord = computed(() => (wordSheetVisible.value ? selectedWordKey.value : ''))

function fallbackLookup(token: TextToken): WordLookup {
  const word = token.normalized || token.text
  return {
    word,
    phonetic: '',
    partOfSpeech: '',
    meaning: '暂未收录释义，可以先加入生词本，稍后补充精讲。',
    example: token.text,
    exampleTranslation: '从原文语境中继续记忆这个词。',
  }
}

function openWord(token: TextToken) {
  if (shouldSuppressWordTap()) return
  if (token.type !== 'word' || !token.normalized || token.normalized.length < 2) return
  if (settingsPanelVisible.value) closeSettingsPanel()
  if (translationVisible.value) closeTranslation()
  selectedWordKey.value = token.normalized
  selectedLookup.value = getReaderWordExplanation(currentArticle.value.id, token.text) || lookupWord(token.text) || fallbackLookup(token)
  added.value = false
  wordSheetVisible.value = true
  nextTick(() => {
    wordSheetActive.value = true
  })
}

function closeWordSheet() {
  wordSheetActive.value = false
  setTimeout(() => {
    wordSheetVisible.value = false
    selectedLookup.value = null
    selectedWordKey.value = ''
    added.value = false
  }, 220)
}

function openSettingsPanel() {
  if (wordSheetVisible.value) closeWordSheet()
  if (translationVisible.value) closeTranslation()
  lastSettingsActionAt = 0
  lastSettingsActionKey = ''
  settingsPanelVisible.value = true
  nextTick(() => {
    settingsPanelActive.value = true
  })
}

function closeSettingsPanel() {
  settingsPanelActive.value = false
  setTimeout(() => {
    settingsPanelVisible.value = false
  }, 220)
}

function toggleSettingsPanel() {
  if (settingsPanelVisible.value) {
    closeSettingsPanel()
    return
  }
  openSettingsPanel()
}

function setFontScale(scale: number) {
  fontScale.value = scale
}

function isFontScaleSelected(scale: number): boolean {
  return Math.abs(fontScale.value - scale) < 0.01
}

function isHighlighted(token: TextToken): boolean {
  return token.type === 'word' && !!token.normalized && token.normalized === highlightedWord.value
}

function showAudioPreparingToast(title: string) {
  audioState.value = 'missing'
  uni.showToast({ title, icon: 'none' })
}

async function playSingleAudioUrl(url: string, unavailableTitle: string, failedTitle: string) {
  if (!url) {
    showAudioPreparingToast(unavailableTitle)
    return
  }

  stopSpeech()
  audioState.value = 'loading'
  try {
    await playAudioUrl(url, {
      onStart: () => {
        audioState.value = 'playing'
      },
      onEnd: () => {
        audioState.value = 'ready'
      },
      onError: () => {
        audioState.value = 'failed'
      },
    })
  } catch {
    uni.showToast({ title: failedTitle, icon: 'none' })
  }
}

function speakSelectedWord() {
  const audioUrl = selectedLookup.value?.audioUrl || ''
  void playSingleAudioUrl(audioUrl, '单词音频稍后补充', '音频暂不可用')
}

function addSelectedWord() {
  if (!selectedLookup.value) return
  const result = addVocabularyWord(selectedLookup.value)
  if (result) {
    added.value = true
    uni.showToast({ title: '已加入生词本', icon: 'success' })
    setTimeout(closeWordSheet, 650)
  } else {
    uni.showToast({ title: '已经在生词本里', icon: 'none' })
  }
}

const translationVisible = ref(false)
const translationActive = ref(false)
const selectedSentenceText = ref('')
const selectedSentenceId = ref('')
const selectedSentenceAudioUrl = ref('')
const selectedTranslation = ref('')
const selectedTranslationNote = ref('')
const suppressWordTapUntil = ref(0)
const highlightedSentenceIds = ref<string[]>([])
const keySentenceIds = ref<string[]>([])
const translationBubbleStyle = ref<Record<string, string>>({
  top: '-999px',
  left: '30px',
  right: '30px',
})
const translationBubblePlacement = ref<'above' | 'below'>('below')
const floatingLayerVisible = computed(() => translationVisible.value || wordSheetVisible.value || settingsPanelVisible.value)
const floatingLayerActive = computed(() => translationActive.value || wordSheetActive.value || settingsPanelActive.value)
let lastPopoverActionAt = 0
let lastPopoverActionKey = ''
let ignorePopoverActionsUntil = 0

const translationBubbleGap = 12
const translationBubbleGutter = 36
const translationBubbleMinHeight = 112
const translationBubbleMaxHeight = 212
const translationBubbleComfortGap = 8
const pendingTranslationPattern = /精讲还没有缓存|正在生成中/
const displayTranslation = computed(() =>
  pendingTranslationPattern.test(selectedTranslation.value) ? '这句译文稍后补充。' : selectedTranslation.value,
)
const displayTranslationNote = computed(() =>
  pendingTranslationPattern.test(selectedTranslation.value) ? '先结合英文语境理解，后续补上自然中文。' : selectedTranslationNote.value,
)

function shouldSuppressWordTap(): boolean {
  return Date.now() < suppressWordTapUntil.value
}

function isTranslationOpenForSentence(sentenceId: string): boolean {
  return translationVisible.value && selectedSentenceId.value === sentenceId
}

function isSentenceHighlighted(sentenceId: string): boolean {
  return highlightedSentenceIds.value.includes(sentenceId)
}

function isKeySentence(sentenceId: string): boolean {
  return keySentenceIds.value.includes(sentenceId)
}

function consumeInlineEvent(event?: any) {
  event?.stopPropagation?.()
  event?.preventDefault?.()
}

function stopInlineEvent(event?: any) {
  event?.stopPropagation?.()
}

function getTouchFallbackRect(event?: any) {
  const touch = event?.changedTouches?.[0] || event?.touches?.[0] || event?.detail?.changedTouches?.[0] || event?.detail?.touches?.[0]
  if (!touch || typeof touch.clientY !== 'number') return null
  return {
    top: touch.clientY - 20,
    bottom: touch.clientY + 24,
  }
}

function queryNodeRect(selector: string): Promise<any | null> {
  return new Promise((resolve) => {
    uni
      .createSelectorQuery()
      .select(selector)
      .boundingClientRect((rect: any) => {
        if (Array.isArray(rect)) {
          resolve(rect[0] || null)
          return
        }
        resolve(rect || null)
      })
      .exec()
  })
}

function waitForLayout(ms = 90): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function getTranslationTopGuard(): number {
  return statusBarHeight.value + 68
}

function getTranslationViewportBottom(): number {
  return Math.max(360, viewportHeight.value) - safeAreaBottom.value - 22
}

function readScrollTop(event?: any): number {
  const value = event?.detail?.scrollTop
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : observedReaderScrollTop.value
}

function handleReaderScroll(event?: any) {
  observedReaderScrollTop.value = readScrollTop(event)
}

async function createSpaceAboveSentence(sentenceId: string, sentenceRect: any, bubbleHeight: number): Promise<any> {
  if (!sentenceRect || typeof sentenceRect.top !== 'number') return sentenceRect

  const neededTop = getTranslationTopGuard() + bubbleHeight + translationBubbleGap + translationBubbleComfortGap
  const shortage = neededTop - sentenceRect.top
  if (shortage <= 0) return sentenceRect

  const currentScrollTop = observedReaderScrollTop.value
  if (currentScrollTop <= 0) return sentenceRect

  readerScrollTop.value = Math.max(0, currentScrollTop - shortage)
  await waitForLayout()
  return (await queryNodeRect(`#${sentenceId}`)) || sentenceRect
}

function estimateTranslationBubbleHeight(): number {
  return displayTranslationNote.value ? 164 : 132
}

function updateTranslationBubblePosition(sentenceRect: any, measuredBubbleHeight?: number) {
  if (!sentenceRect || typeof sentenceRect.top !== 'number' || typeof sentenceRect.bottom !== 'number') {
    translationBubblePlacement.value = 'above'
    translationBubbleStyle.value = {
      top: `${getTranslationTopGuard()}px`,
      left: `${translationBubbleGutter}px`,
      right: `${translationBubbleGutter}px`,
      maxHeight: `${translationBubbleMaxHeight}px`,
    }
    return
  }

  const topGuard = getTranslationTopGuard()
  const viewportBottom = getTranslationViewportBottom()
  const rawBubbleHeight = measuredBubbleHeight || estimateTranslationBubbleHeight()
  const bubbleHeight = Math.min(Math.max(rawBubbleHeight, translationBubbleMinHeight), translationBubbleMaxHeight)
  const belowTop = sentenceRect.bottom + translationBubbleGap
  const belowSpace = Math.max(0, viewportBottom - belowTop)
  const aboveSpace = Math.max(0, sentenceRect.top - topGuard - translationBubbleGap)
  const shouldPlaceAbove = aboveSpace >= 64 || aboveSpace >= belowSpace

  if (shouldPlaceAbove && aboveSpace > 0) {
    const maxHeight = Math.min(bubbleHeight, aboveSpace)
    translationBubblePlacement.value = 'above'
    translationBubbleStyle.value = {
      top: `${sentenceRect.top - translationBubbleGap - maxHeight}px`,
      left: `${translationBubbleGutter}px`,
      right: `${translationBubbleGutter}px`,
      maxHeight: `${maxHeight}px`,
    }
    return
  }

  const maxHeight = Math.min(bubbleHeight, Math.max(64, belowSpace))
  translationBubblePlacement.value = 'below'
  translationBubbleStyle.value = {
    top: `${belowTop}px`,
    left: `${translationBubbleGutter}px`,
    right: `${translationBubbleGutter}px`,
    maxHeight: `${maxHeight}px`,
  }
}

function openSentenceTranslation(sentence: SentenceUnit, event?: any) {
  stopInlineEvent(event)
  if (wordSheetVisible.value) closeWordSheet()
  if (settingsPanelVisible.value) closeSettingsPanel()
  const fallbackRect = getTouchFallbackRect(event)
  suppressWordTapUntil.value = Date.now() + 720
  ignorePopoverActionsUntil = 0
  lastPopoverActionAt = 0
  lastPopoverActionKey = ''
  selectedSentenceId.value = sentence.id
  selectedSentenceText.value = sentence.plainText
  selectedSentenceAudioUrl.value = sentence.audioUrl || ''
  selectedTranslation.value = sentence.translation
  selectedTranslationNote.value = sentence.translationNote
  translationActive.value = false
  translationBubbleStyle.value = {
    top: '-999px',
    left: `${translationBubbleGutter}px`,
    right: `${translationBubbleGutter}px`,
  }
  translationVisible.value = true
  nextTick(async () => {
    const openedSentenceId = sentence.id
    const [sentenceRect, bubbleRect] = await Promise.all([
      queryNodeRect(`#${sentence.id}`),
      queryNodeRect('#reader-translation-popover'),
    ])
    if (selectedSentenceId.value !== openedSentenceId || !translationVisible.value) return
    const rawBubbleHeight = bubbleRect?.height || estimateTranslationBubbleHeight()
    const bubbleHeight = Math.min(Math.max(rawBubbleHeight, translationBubbleMinHeight), translationBubbleMaxHeight)
    const settledSentenceRect = await createSpaceAboveSentence(openedSentenceId, sentenceRect || fallbackRect, bubbleHeight)
    if (selectedSentenceId.value !== openedSentenceId || !translationVisible.value) return
    updateTranslationBubblePosition(settledSentenceRect || fallbackRect, rawBubbleHeight)
    translationActive.value = true
  })
}

function closeTranslation() {
  translationActive.value = false
  setTimeout(() => {
    translationVisible.value = false
    selectedSentenceId.value = ''
    selectedSentenceText.value = ''
    selectedSentenceAudioUrl.value = ''
    selectedTranslation.value = ''
    selectedTranslationNote.value = ''
    translationBubbleStyle.value = {
      top: '-999px',
      left: `${translationBubbleGutter}px`,
      right: `${translationBubbleGutter}px`,
    }
  }, 220)
}

function dismissFloatingPanels() {
  if (translationVisible.value) closeTranslation()
  if (wordSheetVisible.value) closeWordSheet()
  if (settingsPanelVisible.value) closeSettingsPanel()
}

function markSentenceHighlight() {
  const sentenceId = selectedSentenceId.value
  if (!sentenceId) return
  if (isSentenceHighlighted(sentenceId)) {
    highlightedSentenceIds.value = highlightedSentenceIds.value.filter((id) => id !== sentenceId)
    uni.showToast({ title: '已取消划线', icon: 'none' })
    return
  }
  highlightedSentenceIds.value = [...highlightedSentenceIds.value, sentenceId]
  uni.showToast({ title: '已划线', icon: 'success' })
}

async function speakSelectedSentence() {
  if (!selectedSentenceText.value.trim()) return
  await playSingleAudioUrl(selectedSentenceAudioUrl.value, '这句音频稍后补充', '音频暂不可用')
}

function copySelectedSentence() {
  const original = selectedSentenceText.value.trim()
  if (!original) return
  const translated = displayTranslation.value.trim()
  const data = translated ? `${original}\n${translated}` : original

  uni.setClipboardData({
    data,
    success: () => uni.showToast({ title: '已复制', icon: 'success' }),
    fail: () => uni.showToast({ title: '复制失败', icon: 'none' }),
  })
}

function toggleKeySentence() {
  const sentenceId = selectedSentenceId.value
  if (!sentenceId) return
  if (isKeySentence(sentenceId)) {
    keySentenceIds.value = keySentenceIds.value.filter((id) => id !== sentenceId)
    uni.showToast({ title: '已取消重点句', icon: 'none' })
    return
  }
  keySentenceIds.value = [...keySentenceIds.value, sentenceId]
  uni.showToast({ title: '已设为重点句', icon: 'success' })
}

function runPopoverAction(key: string, action: () => void, event?: any) {
  consumeInlineEvent(event)
  const now = Date.now()
  if (now < ignorePopoverActionsUntil) return
  if (lastPopoverActionKey === key && now - lastPopoverActionAt < 360) return
  lastPopoverActionKey = key
  lastPopoverActionAt = now
  action()
}

function runSettingsAction(key: string, action: () => void, event?: any) {
  consumeInlineEvent(event)
  const now = Date.now()
  if (lastSettingsActionKey === key && now - lastSettingsActionAt < 360) return
  lastSettingsActionKey = key
  lastSettingsActionAt = now
  action()
}

function handleHighlightAction(event?: any) {
  runPopoverAction('highlight', markSentenceHighlight, event)
}

function handleSentenceSpeakAction(event?: any) {
  runPopoverAction('speak-sentence', () => {
    void speakSelectedSentence()
  }, event)
}

function handleCopyAction(event?: any) {
  runPopoverAction('copy-sentence', copySelectedSentence, event)
}

function handleKeySentenceAction(event?: any) {
  runPopoverAction('key-sentence', toggleKeySentence, event)
}

function handleFontScaleAction(scale: number, event?: any) {
  runSettingsAction(`font-scale-${scale}`, () => setFontScale(scale), event)
}

function handleNightModeAction(event?: any) {
  runSettingsAction('night-mode', toggleNightMode, event)
}

function handleGoWordsAction(event?: any) {
  runSettingsAction('go-words', goWords, event)
}

async function readAloud() {
  if (reading.value) {
    stopSpeech()
    reading.value = false
    activeSentenceIndex.value = -1
    audioState.value = hasArticleAudio.value ? 'ready' : 'missing'
    return
  }

  if (!hasArticleAudio.value) {
    showAudioPreparingToast('音频还在准备中')
    return
  }

  reading.value = true
  audioState.value = 'loading'
  activeSentenceIndex.value = -1
  await speakSentencesByAudioUrls(articleAudioItems.value, {
    onSentenceStart: (index: number) => {
      activeSentenceIndex.value = index
      audioState.value = 'playing'
    },
    onAllEnd: () => {
      reading.value = false
      activeSentenceIndex.value = -1
      audioState.value = hasArticleAudio.value ? 'ready' : 'missing'
    },
    onError: () => {
      uni.showToast({ title: '音频暂不可用', icon: 'none' })
      reading.value = false
      activeSentenceIndex.value = -1
      audioState.value = 'failed'
    },
  })
}

function toggleNightMode() {
  nightMode.value = !nightMode.value
}

function goWords() {
  if (settingsPanelVisible.value) closeSettingsPanel()
  uni.switchTab({ url: '/pages/words/words' })
}

function resetAudioPlaybackState() {
  stopSpeech()
  reading.value = false
  activeSentenceIndex.value = -1
  audioState.value = 'missing'
}

function previousArticle() {
  if (currentIndex.value === 0) return
  resetAudioPlaybackState()
  closeTranslation()
  closeWordSheet()
  closeSettingsPanel()
  currentIndex.value -= 1
}

function nextArticle() {
  if (currentIndex.value >= articles.length - 1) return
  resetAudioPlaybackState()
  closeTranslation()
  closeWordSheet()
  closeSettingsPanel()
  currentIndex.value += 1
}

onMounted(() => {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight ?? 20
  safeAreaBottom.value = info.safeAreaInsets?.bottom ?? 0
  viewportHeight.value = info.windowHeight ?? 720
})

onUnmounted(() => {
  stopSpeech()
})
</script>

<template>
  <view class="reader-page" :class="{ 'reader-page--night': nightMode }" :style="readerPageStyle">
    <view class="reader-page__ambient">
      <view class="reader-page__ambient-wash" />
    </view>

    <view class="reader-topbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="reader-topbar__inner">
        <view class="reader-topbar__action" :class="{ disabled: currentIndex === 0 }" @tap="previousArticle">
          <text class="reader-topbar__icon">‹</text>
        </view>
        <view class="reader-topbar__brand">
          <text class="reader-topbar__brand-main">每日精读</text>
          <text class="reader-topbar__brand-sub">{{ currentArticle.source }} · {{ buildFingerprint }}</text>
        </view>
        <view class="reader-topbar__actions">
          <view
            class="reader-topbar__action reader-topbar__settings"
            :class="{ active: settingsPanelVisible }"
            @tap="toggleSettingsPanel"
          >
            <text class="reader-topbar__settings-icon">Aa</text>
          </view>
          <view
            class="reader-topbar__action reader-audio-button"
            :class="{
              'reader-audio-button--playing': reading,
              'reader-audio-button--loading': audioState === 'loading',
              'reader-audio-button--unavailable': !hasArticleAudio,
            }"
            @tap="readAloud"
          >
            <view class="reader-audio-icon" :class="{ 'reader-audio-icon--muted': !hasArticleAudio }">
              <view class="reader-audio-icon__body" />
              <view class="reader-audio-icon__wave reader-audio-icon__wave--one" />
              <view class="reader-audio-icon__wave reader-audio-icon__wave--two" />
            </view>
          </view>
          <view class="reader-topbar__action" :class="{ disabled: currentIndex === articles.length - 1 }" @tap="nextArticle">
            <text class="reader-topbar__icon">›</text>
          </view>
        </view>
      </view>
    </view>

    <scroll-view
      class="reader-scroll"
      scroll-y
      :scroll-top="readerScrollTop"
      :style="{ paddingTop: statusBarHeight + 76 + 'px' }"
      @scroll="handleReaderScroll"
      @tap="dismissFloatingPanels"
    >
      <view class="reader-flow">
        <view class="reader-hero">
          <view class="reader-hero__visual">
            <view class="reader-cover">
              <image
                class="reader-cover__image"
                :src="currentArticle.heroImage"
                mode="aspectFill"
              />
              <view class="reader-cover__shade" />
              <view class="reader-cover__content">
                <text class="reader-hero__eyebrow">{{ currentArticle.level }} · Intensive Reading</text>
                <text class="reader-hero__title">{{ currentArticle.title }}</text>
                <text class="reader-cover__caption">{{ currentArticle.visualCaption }}</text>
              </view>
            </view>
          </view>
          <view class="reader-meta">
            <view class="reader-meta__item">
              <text class="reader-meta__icon">▥</text>
              <text class="reader-meta__text">{{ currentArticle.wordCount }}词</text>
            </view>
            <view class="reader-meta__item">
              <text class="reader-meta__icon">A</text>
              <text class="reader-meta__text">{{ blocks.length }}段</text>
            </view>
            <view class="reader-meta__button">
              <text class="reader-meta__button-icon">▣</text>
              <text class="reader-meta__text">{{ currentLearningContent?.status === 'ready' ? '精讲已缓存' : '精讲生成中' }}</text>
            </view>
          </view>
        </view>

        <view class="reader-body reader-body--centered">
          <view
            v-for="block in blocks"
            :key="block.id"
            class="reader-body__block"
          >
            <view class="reader-body__english">
              <view
                v-for="sentence in block.sentences"
                class="reader-body__sentence-unit"
                :class="{ 'reader-body__sentence-unit--open': isTranslationOpenForSentence(sentence.id) }"
                :key="`${sentence.id}-unit`"
              >
                <view
                  :id="sentence.id"
                  :key="sentence.id"
                  class="reader-body__sentence"
                  :class="{
                    'reader-body__sentence--marked': isSentenceHighlighted(sentence.id),
                    'reader-body__sentence--key': isKeySentence(sentence.id),
                  }"
                  :style="{ fontSize: readerFontSize, lineHeight: readerLineHeight }"
                  @longpress="openSentenceTranslation(sentence, $event)"
                >
                  <block
                    v-for="(token, tokenIndex) in sentence.tokens"
                    :key="`${sentence.id}-${tokenIndex}-${token.text}`"
                  >
                    <view
                      v-if="token.type === 'word'"
                      class="reader-body__token reader-body__token-hit word"
                      :class="{
                        active: isHighlighted(token),
                        'reader-body__token--emphasis': token.emphasis,
                      }"
                      hover-class="none"
                      @tap.stop="openWord(token)"
                      @longpress.stop="openSentenceTranslation(sentence, $event)"
                    >{{ token.text }}</view>
                    <text
                      v-else
                      class="reader-body__token reader-body__token-static"
                    >{{ token.text }}</text>
                  </block>
                </view>
              </view>
            </view>
          </view>
        </view>

        <view class="reader-tail">
          <text class="reader-tail__text">{{ currentIndex + 1 }} / {{ articles.length }}</text>
        </view>
        <view :style="{ height: safeAreaBottom + 46 + 'px' }" />
      </view>
    </scroll-view>

    <view
      v-if="floatingLayerVisible"
      class="reader-dismiss-layer"
      :class="{ active: floatingLayerActive }"
      @tap="dismissFloatingPanels"
    />

    <view
      v-if="translationVisible"
      id="reader-translation-popover"
      class="reader-sentence-popover"
      :class="[
        { active: translationActive },
        translationBubblePlacement === 'above' ? 'reader-sentence-popover--above' : 'reader-sentence-popover--below',
      ]"
      :style="translationBubbleStyle"
      @tap.stop="stopInlineEvent"
      @touchstart.stop="stopInlineEvent"
      @mousedown.stop="stopInlineEvent"
    >
      <view class="reader-sentence-popover__header">
        <text class="reader-sentence-popover__label">翻译</text>
      </view>
      <text class="reader-sentence-popover__copy">{{ displayTranslation }}</text>
      <text v-if="displayTranslationNote" class="reader-sentence-popover__note">{{ displayTranslationNote }}</text>
      <view class="reader-sentence-popover__actions">
        <view
          class="reader-sentence-popover__action"
          @tap.stop="handleHighlightAction"
          @touchend.stop.prevent="handleHighlightAction"
        >
          <text>{{ isSentenceHighlighted(selectedSentenceId) ? '取消划线' : '划线' }}</text>
        </view>
        <view
          class="reader-sentence-popover__action"
          @tap.stop="handleCopyAction"
          @touchend.stop.prevent="handleCopyAction"
        >
          <text>复制</text>
        </view>
        <view
          class="reader-sentence-popover__action"
          @tap.stop="handleSentenceSpeakAction"
          @touchend.stop.prevent="handleSentenceSpeakAction"
        >
          <view class="reader-sentence-popover__action-icon reader-audio-icon">
            <view class="reader-audio-icon__body" />
            <view class="reader-audio-icon__wave reader-audio-icon__wave--one" />
            <view class="reader-audio-icon__wave reader-audio-icon__wave--two" />
          </view>
          <text>朗读</text>
        </view>
        <view
          class="reader-sentence-popover__action"
          @tap.stop="handleKeySentenceAction"
          @touchend.stop.prevent="handleKeySentenceAction"
        >
          <text>{{ isKeySentence(selectedSentenceId) ? '取消重点' : '重点句' }}</text>
        </view>
      </view>
    </view>

    <view
      v-if="settingsPanelVisible"
      class="reader-settings-sheet"
      :class="{ active: settingsPanelActive }"
      :style="{ '--reader-safe-bottom': safeAreaBottom + 'px' }"
      @tap.stop="stopInlineEvent"
      @touchstart.stop="stopInlineEvent"
    >
      <view class="reader-settings-sheet__grabber" />
      <view class="reader-settings-sheet__head">
        <view>
          <text class="reader-settings-sheet__title">阅读设置</text>
          <text class="reader-settings-sheet__subtitle">轻量调整，不打断正文</text>
        </view>
      </view>

      <view class="reader-settings-section">
        <text class="reader-settings-section__label">字号</text>
        <view class="reader-settings-segment">
          <view
            v-for="option in fontScaleOptions"
            :key="option.label"
            class="reader-settings-segment__item"
            :class="{ active: isFontScaleSelected(option.value) }"
            @tap.stop="handleFontScaleAction(option.value, $event)"
            @touchend.stop.prevent="handleFontScaleAction(option.value, $event)"
          >
            <text>{{ option.label }}</text>
          </view>
        </view>
      </view>

      <view
        class="reader-settings-row"
        @tap.stop="handleNightModeAction"
        @touchend.stop.prevent="handleNightModeAction"
      >
        <view>
          <text class="reader-settings-row__title">夜间模式</text>
          <text class="reader-settings-row__desc">{{ nightMode ? '已开启' : '柔和深色背景' }}</text>
        </view>
        <view class="reader-settings-switch" :class="{ active: nightMode }">
          <view class="reader-settings-switch__thumb" />
        </view>
      </view>

      <view
        class="reader-settings-row reader-settings-row--link"
        @tap.stop="handleGoWordsAction"
        @touchend.stop.prevent="handleGoWordsAction"
      >
        <view>
          <text class="reader-settings-row__title">生词本</text>
          <text class="reader-settings-row__desc">查看已收藏单词</text>
        </view>
        <text class="reader-settings-row__arrow">›</text>
      </view>
    </view>

    <view
      v-if="wordSheetVisible"
      class="word-sheet"
      :class="{ active: wordSheetActive }"
      @tap.stop="stopInlineEvent"
      @touchstart.stop="stopInlineEvent"
      @mousedown.stop="stopInlineEvent"
    >
      <view class="word-sheet__grabber" />
      <view class="word-sheet__head">
        <view class="word-sheet__title-group">
          <text class="word-sheet__word">{{ selectedLookup?.word }}</text>
          <text v-if="selectedLookup?.phonetic" class="word-sheet__phonetic">{{ selectedLookup?.phonetic }}</text>
        </view>
        <view class="word-sheet__tools">
          <view class="word-sheet__speak" @tap="speakSelectedWord">
            <view class="word-sheet__speak-icon reader-audio-icon" :class="{ 'reader-audio-icon--muted': !selectedLookup?.audioUrl }">
              <view class="reader-audio-icon__body" />
              <view class="reader-audio-icon__wave reader-audio-icon__wave--one" />
              <view class="reader-audio-icon__wave reader-audio-icon__wave--two" />
            </view>
          </view>
        </view>
      </view>
      <view class="word-sheet__meaning">
        <text v-if="selectedLookup?.partOfSpeech" class="word-sheet__pos">{{ selectedLookup?.partOfSpeech }}</text>
        <text class="word-sheet__definition">{{ selectedLookup?.meaning }}</text>
      </view>
      <view class="word-sheet__footer">
        <view class="word-sheet__primary" :class="{ added }" @tap="addSelectedWord">
          <text>{{ added ? '已加入生词本' : '+ 加入生词本' }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.reader-page {
  min-height: 100vh;
  background: #fff;
  color: #202124;
  position: relative;
  overflow: hidden;
}

.reader-page__ambient {
  display: none;
}

.reader-page__ambient-wash {
  display: none;
}

.reader-page--night {
  background: #121411;
  color: rgba(255, 255, 255, 0.9);
}

.reader-page--night .reader-page__ambient {
  display: none;
}

.reader-topbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: rgba(255, 253, 247, 0.82);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.reader-page--night .reader-topbar {
  background: rgba(18, 20, 17, 0.9);
}

.reader-topbar__inner {
  height: 56px;
  padding: 0 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.reader-topbar__actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.reader-topbar__action {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 20px;
  @include tap-feedback;
}

.reader-topbar__action.disabled {
  opacity: 0.24;
  pointer-events: none;
}

.reader-topbar__icon {
  font-size: 28px;
  line-height: 1;
  color: currentColor;
}

.reader-topbar__settings {
  background: rgba(255, 255, 255, 0.54);
  box-shadow: 0 8px 18px rgba(28, 31, 36, 0.08);
}

.reader-audio-button {
  background: rgba(255, 255, 255, 0.58);
  color: #303235;
  box-shadow: 0 8px 18px rgba(28, 31, 36, 0.08);
  transition: background-color 0.18s ease, color 0.18s ease, opacity 0.18s ease, transform 0.18s ease;
}

.reader-audio-button--playing {
  background: var(--reader-accent);
  color: #fff;
}

.reader-audio-button--loading {
  opacity: 0.82;
}

.reader-audio-button--unavailable {
  opacity: 0.72;
}

.reader-audio-icon {
  position: relative;
  width: 20px;
  height: 20px;
  display: inline-flex;
  flex-shrink: 0;
  color: currentColor;
}

.reader-audio-icon__body {
  position: absolute;
  left: 3px;
  top: 7px;
  width: 7px;
  height: 7px;
  border-radius: 2px;
  background: currentColor;
}

.reader-audio-icon__wave {
  position: absolute;
  top: 5px;
  border: 2px solid currentColor;
  border-left: 0;
  border-top-color: transparent;
  border-bottom-color: transparent;
  border-radius: 0 14px 14px 0;
}

.reader-audio-icon__wave--one {
  left: 10px;
  width: 5px;
  height: 10px;
}

.reader-audio-icon__wave--two {
  left: 13px;
  width: 7px;
  height: 10px;
  opacity: 0.58;
}

.reader-audio-icon--muted .reader-audio-icon__wave--two {
  opacity: 0;
}

.reader-audio-icon--muted::after {
  content: "";
  position: absolute;
  left: 5px;
  top: 3px;
  width: 14px;
  height: 2px;
  border-radius: 2px;
  background: currentColor;
  transform: rotate(42deg);
  transform-origin: center;
}

.reader-topbar__settings.active {
  color: #fff;
  background: var(--reader-accent);
}

.reader-topbar__settings-icon {
  font-size: 17px;
  line-height: 1;
  font-weight: 700;
  color: currentColor;
}

.reader-topbar__brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.reader-topbar__brand-main {
  font-size: 14px;
  font-weight: 600;
  color: currentColor;
}

.reader-topbar__brand-sub {
  font-size: 11px;
  color: #9a9a9f;
}

.reader-scroll {
  min-height: 100vh;
  position: relative;
  z-index: 1;
  background: #fff;
}

.reader-flow {
  min-height: 100vh;
  background:
    linear-gradient(112deg, var(--reader-warm-soft) 0%, rgba(255, 255, 255, 0) 42%),
    linear-gradient(248deg, var(--reader-cool-soft) 0%, rgba(255, 255, 255, 0) 46%),
    linear-gradient(180deg, var(--reader-visual-start) 0%, var(--reader-visual-end) 172px, rgba(255, 255, 255, 0.96) 342px, #fff 100%);
}

.reader-page--night .reader-flow {
  background:
    linear-gradient(180deg, rgba(28, 31, 28, 0.96) 0%, rgba(18, 20, 17, 0.98) 340px, #121411 100%);
}

.reader-hero {
  padding: 14px 20px 16px;
  position: relative;
}

.reader-hero__eyebrow {
  display: block;
  margin-bottom: 8px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0;
  color: rgba(255, 255, 255, 0.82);
}

.reader-hero__title {
  display: block;
  font-family: $font-family-serif;
  font-size: 25px;
  line-height: 1.13;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0;
  margin-bottom: 8px;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.22);
  text-wrap: balance;
}

.reader-page--night .reader-hero__title {
  color: rgba(255, 255, 255, 0.92);
}

.reader-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.reader-meta__item {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 30px;
  padding: 0 9px;
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.52);
  border: 1px solid rgba(255, 255, 255, 0.48);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.reader-meta__icon {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #8e8e93;
  border-radius: 5px;
  border: 1px solid #cfcfd4;
}

.reader-meta__text {
  font-size: 12px;
  color: #6f7076;
}

.reader-meta__button {
  margin-left: auto;
  height: 30px;
  padding: 0 11px;
  display: flex;
  align-items: center;
  gap: 6px;
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.68);
  border: 1px solid rgba(255, 255, 255, 0.54);
  box-shadow: 0 8px 20px var(--reader-shadow);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

.reader-meta__button-icon {
  font-size: 12px;
  color: var(--reader-accent);
}

.reader-meta__button-text {
  font-size: 12px;
  font-weight: 600;
  color: #4b4b50;
}

.reader-hero__visual {
  position: relative;
  padding: 0;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.54);
  box-shadow: 0 14px 30px var(--reader-shadow);
  overflow: hidden;
}

.reader-cover {
  position: relative;
  width: 100%;
  height: 188px;
  overflow: hidden;
  border-radius: 18px;
  background: linear-gradient(135deg, var(--reader-visual-start), var(--reader-visual-end));
}

.reader-cover__image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.reader-cover__shade {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(0, 0, 0, 0.04) 0%, rgba(0, 0, 0, 0.02) 38%, rgba(0, 0, 0, 0.58) 100%),
    radial-gradient(circle at 18% 12%, rgba(255, 255, 255, 0.28), transparent 34%);
}

.reader-cover__content {
  position: absolute;
  left: 18px;
  right: 18px;
  bottom: 17px;
  z-index: 1;
}

.reader-cover__caption {
  display: block;
  max-width: 250px;
  text-align: left;
  color: rgba(255, 255, 255, 0.78);
  font-size: 12px;
  line-height: 1.45;
  font-weight: 600;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.18);
}

.reader-body {
  padding: 0 30px 14px;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.reader-body__block {
  width: 100%;
  max-width: 318px;
  margin: 0 auto 22px;
  position: relative;
  transition: transform 0.2s ease;
}

.reader-body__english {
  font-family: $font-family-serif;
  font-weight: 400;
  color: #242529;
  letter-spacing: 0;
  margin-bottom: 14px;
  position: relative;
  width: 100%;
  text-align: left;
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
}

.reader-page--night .reader-body__english {
  color: rgba(255, 255, 255, 0.88);
}

.reader-body__sentence-unit {
  margin-bottom: 6px;
}

.reader-body__sentence {
  display: block;
  position: relative;
  transition: color 0.18s ease, filter 0.18s ease;
}

.reader-body__sentence--marked {
  color: #111316;
  filter: none;
}

.reader-page--night .reader-body__sentence--marked {
  color: rgba(255, 255, 255, 0.96);
}

.reader-body__sentence--key {
  box-shadow: -2px 0 0 var(--reader-accent);
}

.reader-body__token {
  display: inline;
  vertical-align: baseline;
  white-space: pre-wrap;
}

.reader-body__token-hit {
  cursor: pointer;
}

.reader-body__token.word {
  border-radius: 3px;
  transition: background-color 0.18s ease, color 0.18s ease;
  user-select: none;
  -webkit-user-select: none;
}

.reader-body__token.active {
  background: var(--reader-accent);
  color: #fff;
}

.reader-body__token--emphasis {
  font-weight: 700;
  color: #171717;
}

.reader-page--night .reader-body__token--emphasis {
  color: rgba(255, 255, 255, 0.98);
}

.reader-body__sentence--marked .reader-body__token {
  border-radius: 3px;
  text-decoration: underline;
  text-decoration-color: #111316;
  text-decoration-thickness: 1px;
  text-decoration-skip-ink: none;
  text-underline-offset: 2px;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
}

.reader-page--night .reader-body__sentence--marked .reader-body__token {
  text-decoration-color: rgba(255, 255, 255, 0.92);
}

.reader-body__sentence--marked .reader-body__token.active {
  background: var(--reader-accent);
  background-image: none;
  color: #fff;
}

.reader-body__sentence-unit--open .reader-body__token {
  border-radius: 4px;
  background-color: rgba(255, 237, 171, 0.46);
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
}

.reader-body__sentence-unit--open .reader-body__sentence--marked .reader-body__token {
  background-color: rgba(255, 237, 171, 0.46);
}

.reader-page--night .reader-body__sentence-unit--open .reader-body__token {
  background-color: rgba(255, 218, 128, 0.18);
}

.reader-body__sentence-unit--open .reader-body__token.active {
  background: var(--reader-accent);
  background-image: none;
  color: #fff;
}

.reader-sentence-popover {
  position: fixed;
  z-index: 220;
  padding: 14px 16px 13px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  background: rgba(39, 42, 38, 0.94);
  box-shadow: 0 12px 30px rgba(16, 18, 20, 0.2);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-sizing: border-box;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
  transform: translateY(4px) scale(0.985);
  transition: opacity 0.18s ease, transform 0.22s cubic-bezier(.32, .72, 0, 1);
}

.reader-sentence-popover.active {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0) scale(1);
}

.reader-sentence-popover::before {
  content: "";
  display: none;
}

.reader-sentence-popover--below::before {
  top: -5px;
  border-right: 0;
  border-bottom: 0;
}

.reader-sentence-popover--above::before {
  bottom: -5px;
  border-left: 0;
  border-top: 0;
}

.reader-page--night .reader-sentence-popover {
  border-color: rgba(255, 255, 255, 0.1);
  background: rgba(42, 43, 41, 0.96);
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.36);
}

.reader-page--night .reader-sentence-popover::before {
  border-color: rgba(255, 255, 255, 0.1);
  background: rgba(42, 43, 41, 0.96);
}

.reader-sentence-popover__header {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.reader-sentence-popover__label {
  font-size: 12px;
  line-height: 1.2;
  font-weight: 750;
  color: #fff;
}

.reader-sentence-popover__copy {
  display: -webkit-box;
  font-size: 14px;
  line-height: 1.58;
  color: rgba(255, 255, 255, 0.86);
  overflow: hidden;
  text-overflow: ellipsis;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
}

.reader-page--night .reader-sentence-popover__copy {
  color: rgba(255, 255, 255, 0.88);
}

.reader-sentence-popover__note {
  display: block;
  margin-top: 7px;
  font-size: 11px;
  line-height: 1.35;
  color: rgba(255, 255, 255, 0.42);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.reader-page--night .reader-sentence-popover__note {
  color: rgba(255, 255, 255, 0.58);
}

.reader-sentence-popover__actions {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 2;
  gap: 4px;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.reader-sentence-popover__action {
  position: relative;
  z-index: 3;
  flex: 1 1 0;
  min-width: 0;
  height: 30px;
  padding: 0 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  text-align: center;
  border-radius: 15px;
  background: transparent;
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  @include tap-feedback;
}

.reader-sentence-popover__action-icon {
  width: 15px;
  height: 15px;
}

.reader-sentence-popover__action-icon .reader-audio-icon__body {
  left: 2px;
  top: 5px;
  width: 5px;
  height: 5px;
}

.reader-sentence-popover__action-icon .reader-audio-icon__wave {
  top: 3px;
  border-width: 1px;
}

.reader-sentence-popover__action-icon .reader-audio-icon__wave--one {
  left: 8px;
  width: 4px;
  height: 9px;
}

.reader-sentence-popover__action-icon .reader-audio-icon__wave--two {
  left: 10px;
  width: 5px;
  height: 9px;
}

.reader-sentence-popover__action:first-child {
  color: #ffe39a;
}

.reader-page--night .reader-sentence-popover__action {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.86);
}

.reader-tail {
  padding: 10px 24px 0;
}

.reader-tail__text {
  display: block;
  text-align: center;
  font-size: 13px;
  color: #b8b8bd;
}

.reader-dismiss-layer {
  position: fixed;
  inset: 0;
  z-index: 130;
  background: transparent;
  opacity: 0;
  transition: opacity 0.18s ease;
}

.reader-dismiss-layer.active {
  opacity: 1;
}

.reader-settings-sheet {
  position: fixed;
  left: 14px;
  right: 14px;
  bottom: 0;
  z-index: 160;
  padding: 8px 16px calc(16px + var(--reader-safe-bottom, 0px));
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(255, 255, 255, 0.78);
  border-radius: 24px 24px 0 0;
  box-shadow: 0 -18px 42px rgba(26, 29, 33, 0.12);
  backdrop-filter: blur(22px);
  -webkit-backdrop-filter: blur(22px);
  box-sizing: border-box;
  opacity: 0;
  transform: translateY(22px);
  transition: opacity 0.2s ease, transform 0.24s cubic-bezier(.32, .72, 0, 1);
}

.reader-settings-sheet.active {
  opacity: 1;
  transform: translateY(0);
}

.reader-page--night .reader-settings-sheet {
  background: rgba(28, 30, 28, 0.96);
  border-color: rgba(255, 255, 255, 0.08);
}

.reader-settings-sheet__grabber {
  width: 36px;
  height: 4px;
  margin: 0 auto 13px;
  border-radius: 2px;
  background: rgba(60, 60, 67, 0.2);
}

.reader-page--night .reader-settings-sheet__grabber {
  background: rgba(255, 255, 255, 0.18);
}

.reader-settings-sheet__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 14px;
}

.reader-settings-sheet__title {
  display: block;
  font-size: 16px;
  line-height: 1.2;
  font-weight: 700;
  color: #1d1d20;
}

.reader-settings-sheet__subtitle {
  display: block;
  margin-top: 3px;
  font-size: 11px;
  line-height: 1.3;
  color: #8e8e93;
}

.reader-page--night .reader-settings-sheet__title {
  color: rgba(255, 255, 255, 0.92);
}

.reader-settings-section {
  margin-bottom: 12px;
}

.reader-settings-section__label {
  display: block;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #7b7d84;
}

.reader-settings-segment {
  height: 38px;
  padding: 3px;
  display: flex;
  align-items: center;
  border-radius: 12px;
  background: rgba(118, 118, 128, 0.1);
  box-sizing: border-box;
}

.reader-settings-segment__item {
  flex: 1;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  font-size: 12px;
  font-weight: 600;
  color: #6b6d73;
  @include tap-feedback;
}

.reader-settings-segment__item.active {
  color: #1f2024;
  background: #fff;
  box-shadow: 0 3px 10px rgba(28, 31, 36, 0.08);
}

.reader-page--night .reader-settings-segment {
  background: rgba(255, 255, 255, 0.08);
}

.reader-page--night .reader-settings-segment__item.active {
  color: #fff;
  background: rgba(255, 255, 255, 0.16);
}

.reader-settings-row {
  min-height: 50px;
  padding: 9px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid rgba(60, 60, 67, 0.08);
  box-sizing: border-box;
  @include tap-feedback;
}

.reader-page--night .reader-settings-row {
  border-top-color: rgba(255, 255, 255, 0.08);
}

.reader-settings-row__title {
  display: block;
  font-size: 14px;
  line-height: 1.2;
  font-weight: 650;
  color: #1f2024;
}

.reader-settings-row__desc {
  display: block;
  margin-top: 3px;
  font-size: 11px;
  line-height: 1.25;
  color: #9a9ca3;
}

.reader-page--night .reader-settings-row__title {
  color: rgba(255, 255, 255, 0.9);
}

.reader-settings-switch {
  width: 44px;
  height: 26px;
  padding: 2px;
  border-radius: 13px;
  background: rgba(118, 118, 128, 0.22);
  box-sizing: border-box;
  transition: background-color 0.18s ease;
}

.reader-settings-switch.active {
  background: var(--reader-accent);
}

.reader-settings-switch__thumb {
  width: 22px;
  height: 22px;
  border-radius: 11px;
  background: #fff;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.16);
  transform: translateX(0);
  transition: transform 0.18s ease;
}

.reader-settings-switch.active .reader-settings-switch__thumb {
  transform: translateX(18px);
}

.reader-settings-row__arrow {
  font-size: 22px;
  line-height: 1;
  color: #c3c4c8;
}

.word-sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 160;
  min-height: 218px;
  max-height: 34vh;
  padding: 10px 30px calc(16px + env(safe-area-inset-bottom));
  background: #fff;
  border-radius: 22px 22px 0 0;
  box-shadow: 0 -12px 32px rgba(20, 24, 28, 0.12);
  transform: translateY(100%);
  opacity: 0;
  overflow: hidden;
  box-sizing: border-box;
  transition: opacity 0.2s ease, transform 0.24s cubic-bezier(.32, .72, 0, 1);
  --smoke-legacy-word-sheet-bottom: bottom: calc(18px + env(safe-area-inset-bottom));
  --smoke-legacy-word-sheet-min-source: min-height: 78px;
  --smoke-legacy-word-sheet-min: min-height:78px;
}

.word-sheet.active {
  opacity: 1;
  transform: translateY(0);
}

.word-sheet__grabber {
  width: 36px;
  height: 4px;
  margin: 0 auto 18px;
  border-radius: 999px;
  background: #e8e9e7;
}

.word-sheet__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 14px;
}

.word-sheet__title-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.word-sheet__word {
  font-size: 31px;
  line-height: 1.08;
  font-weight: 800;
  color: #161719;
  letter-spacing: 0;
}

.word-sheet__phonetic {
  font-size: 13px;
  line-height: 1.2;
  color: #a9abad;
}

.word-sheet__tools {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-shrink: 0;
}

.word-sheet__speak {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 18px;
  background: #f2f6ef;
  color: var(--reader-accent);
  @include tap-feedback;
}

.word-sheet__speak-icon {
  width: 18px;
  height: 18px;
}

.word-sheet__speak-icon .reader-audio-icon__body {
  left: 2px;
  top: 6px;
  width: 6px;
  height: 6px;
}

.word-sheet__speak-icon .reader-audio-icon__wave {
  top: 4px;
  border-width: 2px;
}

.word-sheet__speak-icon .reader-audio-icon__wave--one {
  left: 9px;
  width: 5px;
  height: 10px;
}

.word-sheet__speak-icon .reader-audio-icon__wave--two {
  left: 12px;
  width: 6px;
  height: 10px;
}

.word-sheet__meaning {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 12px;
  max-height: 58px;
  overflow: hidden;
}

.word-sheet__pos,
.word-sheet__definition {
  font-size: 16px;
  line-height: 1.48;
  color: #24262a;
}

.word-sheet__pos {
  flex-shrink: 0;
  color: #18191b;
  font-weight: 650;
}

.word-sheet__footer {
  display: flex;
  justify-content: center;
  margin-top: 8px;
}

.word-sheet__primary {
  width: 176px;
  height: 42px;
  padding: 0 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 21px;
  font-size: 15px;
  font-weight: 700;
  @include tap-feedback;
  --smoke-legacy-word-title-size-source: font-size: 18px;
  --smoke-legacy-word-title-size-dist: font-size:18px;
}

.word-sheet__primary {
  color: #fff;
  background: var(--reader-accent);
  box-shadow: 0 10px 22px rgba(118, 198, 41, 0.24);
}

.word-sheet__primary.added {
  color: var(--reader-accent);
  background: var(--reader-accent-soft);
}

</style>
