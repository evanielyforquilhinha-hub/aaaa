<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { loadVocab, reviewWord, removeWord, getTodayReviewWords, type VocabWord } from '@/utils/storage'
import { speakWord, stopSpeech } from '@/utils/tts'

const statusBarHeight = ref(20)
const safeAreaBottom = ref(0)
const words = ref<VocabWord[]>([])
const currentIndex = ref(0)
const showHint = ref(false)
const showMeaning = ref(false)
const sessionDone = ref(false)
const markedTooEasy = ref<Set<string>>(new Set())

const todayReviewCount = ref(0)
const todayNewCount = ref(0)
const studyMinutes = ref(0)

const currentWord = computed(() => words.value[currentIndex.value] || null)

const daysSinceAdded = computed(() => {
  if (!currentWord.value) return ''
  const diff = Date.now() - currentWord.value.addTime
  const days = Math.floor(diff / 86400000)
  if (days === 0) return '今天新学'
  return days + '天前学过'
})

const highlightedExample = computed(() => {
  if (!currentWord.value) return ''
  const word = currentWord.value.word
  const example = currentWord.value.example
  if (!example || !word) return ''
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp('(' + escaped + ')', 'gi')
  return example.replace(regex, '<text class="word-card__hint-highlight">$1</text>')
})

function loadData() {
  words.value = getTodayReviewWords()
  if (words.value.length === 0) {
    sessionDone.value = true
    return
  }
  currentIndex.value = 0
  showHint.value = false
  showMeaning.value = false
  sessionDone.value = false
  markedTooEasy.value = new Set()

  const all = loadVocab()
  const now = new Date()
  todayReviewCount.value = getTodayReviewWords().length
  todayNewCount.value = all.filter(w => {
    const d = new Date(w.addTime)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  }).length
  studyMinutes.value = all.reduce((sum, w) => sum + w.reviewCount, 0)
}

function flipCard() {
  if (!showHint.value) {
    showHint.value = true
  } else {
    showMeaning.value = true
  }
}

function markKnown() {
  if (!currentWord.value) return
  reviewWord(currentWord.value.id, true)
  nextCard()
}

function markUnknown() {
  if (!currentWord.value) return
  reviewWord(currentWord.value.id, false)
  nextCard()
}

function nextCard() {
  if (currentIndex.value >= words.value.length - 1) {
    sessionDone.value = true
    return
  }
  currentIndex.value++
  showHint.value = false
  showMeaning.value = false
}

function markTooEasy() {
  if (!currentWord.value) return
  reviewWord(currentWord.value.id, true)
  removeWord(currentWord.value.id)
  markedTooEasy.value.add(currentWord.value.id)
  uni.showToast({ title: '已标记为太简单', icon: 'success' })
  if (currentIndex.value >= words.value.length - 1) {
    sessionDone.value = true
    return
  }
  currentIndex.value++
  showHint.value = false
  showMeaning.value = false
}

function playAudio() {
  if (currentWord.value) {
    speakWord(currentWord.value.word)
  }
}

function restartReview() {
  loadData()
}

function goBack() {
  uni.navigateBack()
}

onMounted(() => {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight ?? 20
  safeAreaBottom.value = info.safeAreaInsets?.bottom ?? 0
  loadData()
})

onUnmounted(() => {
  stopSpeech()
})
</script>

<template>
  <view class="review-page">
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-bar__inner">
        <view class="nav-bar__left" @tap="goBack">
          <text class="nav-bar__back-icon">&#8592;</text>
        </view>
        <view class="nav-bar__center">
          <view class="nav-bar__magic-wand">
            <text class="nav-bar__wand-icon">&#10022;</text>
          </view>
        </view>
        <view class="nav-bar__right">
          <view class="nav-bar__icon"><view class="nav-bar__icon-search-dot" /></view>
          <view class="nav-bar__icon"><view class="nav-bar__icon-heart" /></view>
          <view class="nav-bar__icon"><view class="nav-bar__icon-dots"><view class="nav-bar__icon-dot" /><view class="nav-bar__icon-dot" /><view class="nav-bar__icon-dot" /></view></view>
        </view>
      </view>
    </view>

    <scroll-view class="review-scroll" scroll-y :style="{ paddingTop: `${statusBarHeight + 56}px`, height: `calc(100vh - ${statusBarHeight + 56}px)` }">
      <view v-if="sessionDone" class="review-done">
        <view class="review-done__icon">&#127881;</view>
        <text class="review-done__title">今日复习完成！</text>
        <text class="review-done__desc">已复习 {{ words.length }} 个单词</text>
        <view class="review-done__btn" @tap="restartReview">再复习一遍</view>
      </view>
      <view v-else-if="currentWord" class="review-content">
        <view class="stats-bar">
          <view class="stats-bar__item"><text class="stats-bar__label">今日复习</text><text class="stats-bar__value">{{ currentIndex + 1 }}/{{ words.length }}</text></view>
          <view class="stats-bar__item"><text class="stats-bar__label">今日新词</text><text class="stats-bar__value">0/{{ todayNewCount }}</text></view>
          <view class="stats-bar__item"><text class="stats-bar__label">学习时间</text><text class="stats-bar__value">{{ studyMinutes }}min</text></view>
        </view>
        <view class="word-card" @tap="flipCard">
          <view class="word-card__front" :class="{ 'word-card__front--hidden': showMeaning }">
            <view class="word-card__tag"><text class="word-card__tag-text">{{ daysSinceAdded }}</text></view>
            <view class="word-card__word-block"><text class="word-card__word">{{ currentWord.word }}</text></view>
            <view class="word-card__phonetic-row">
              <text class="word-card__phonetic">{{ currentWord.phonetic }}</text>
              <view class="word-card__speak-btn" @tap.stop="playAudio">
                <view class="icon-speak"><view class="icon-speak__bar" /><view class="icon-speak__bar icon-speak__bar--mid" /><view class="icon-speak__bar icon-speak__bar--delay" /></view>
              </view>
            </view>
            <view class="word-card__too-easy" @tap.stop="markTooEasy">
              <text class="word-card__too-easy-icon">&#128465;</text>
              <text class="word-card__too-easy-text">标记为太简单</text>
            </view>

            <view class="hint-card" :class="{ 'hint-card--visible': showHint }">
              <view class="hint-card__header">
                <view class="hint-card__label"><text class="hint-card__label-text">例句</text></view>
                <view class="hint-card__header-right">
                  <text class="hint-card__guide-text">根据提示，判断释义</text>
                  <view class="word-card__speak-btn word-card__speak-btn--small" @tap.stop="playAudio">
                    <view class="icon-speak"><view class="icon-speak__bar" /><view class="icon-speak__bar icon-speak__bar--mid" /><view class="icon-speak__bar icon-speak__bar--delay" /></view>
                  </view>
                </view>
              </view>
              <view class="hint-card__example">
                <rich-text :nodes="highlightedExample"></rich-text>
              </view>
            </view>

            <view v-if="!showHint" class="word-card__hint">
              <text class="word-card__hint-text">尝试回想释义</text>
              <text class="word-card__hint-text">点击空白处查看提示</text>
            </view>
          </view>

          <view class="word-card__back" :class="{ 'word-card__back--visible': showMeaning }">
            <view class="word-card__back-header">
              <text class="word-card__back-word">{{ currentWord.word }}</text>
              <view class="word-card__speak-btn word-card__speak-btn--back" @tap.stop="playAudio">
                <view class="icon-speak"><view class="icon-speak__bar" /><view class="icon-speak__bar icon-speak__bar--mid" /><view class="icon-speak__bar icon-speak__bar--delay" /></view>
              </view>
            </view>
            <text class="word-card__back-phonetic">{{ currentWord.phonetic }}</text>
            <view class="word-card__back-meaning">
              <text class="word-card__back-pos">{{ currentWord.partOfSpeech }}</text>
              <text class="word-card__back-def">{{ currentWord.meaning }}</text>
            </view>
            <view class="word-card__back-example">
              <text class="word-card__back-example-label">例句</text>
              <text class="word-card__back-example-en">{{ currentWord.example }}</text>
              <text class="word-card__back-example-zh">{{ currentWord.exampleTranslation }}</text>
            </view>
          </view>
        </view>

        <view class="action-bar">
          <view class="action-bar__btn action-bar__btn--unknown" @tap="markUnknown">
            <text class="action-bar__btn-text">{{ showHint ? '没想起来' : '不认识' }}</text>
          </view>
          <view class="action-bar__btn action-bar__btn--known" @tap="markKnown">
            <text class="action-bar__btn-text">{{ showHint ? '想起来了' : '我认识' }}</text>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<style lang="scss" scoped>
.review-page { min-height: 100vh; background: linear-gradient(180deg, $bg-gradient-start 0%, $bg-gradient-end 200px, $page-bg 500px); }
.nav-bar { position: fixed; top: 0; left: 0; right: 0; z-index: 100; background: linear-gradient(180deg, $bg-gradient-start 0%, rgba($bg-gradient-end, 0.95) 100%); backdrop-filter: blur(10px); }
.nav-bar__inner { display: flex; align-items: center; justify-content: space-between; height: 48px; padding: 0 20px; }
.nav-bar__left { width: 44px; height: 44px; display: flex; align-items: center; justify-content: flex-start; }
.nav-bar__back-icon { font-size: 28px; font-weight: 400; color: $text-primary; line-height: 1; }
.nav-bar__center { flex: 1; display: flex; align-items: center; justify-content: center; }
.nav-bar__magic-wand { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: linear-gradient(135deg, #7B61FF, #4A90D9); }
.nav-bar__wand-icon { font-size: 18px; color: $white; }
.nav-bar__right { display: flex; align-items: center; gap: 24px; }
.nav-bar__icon { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; }
.nav-bar__icon-search-dot { width: 14px; height: 14px; border: 2px solid $text-primary; border-radius: 50%; position: relative; }
.nav-bar__icon-search-dot::after { content: ''; position: absolute; bottom: -2px; right: -4px; width: 2px; height: 7px; background: $text-primary; border-radius: 1px; transform: rotate(-45deg); }
.nav-bar__icon-heart { width: 14px; height: 14px; background: $text-primary; transform: rotate(45deg); position: relative; }
.nav-bar__icon-heart::before, .nav-bar__icon-heart::after { content: ''; position: absolute; width: 14px; height: 14px; background: $text-primary; border-radius: 50%; }
.nav-bar__icon-heart::before { top: -7px; left: 0; }
.nav-bar__icon-heart::after { top: 0; left: -7px; }
.nav-bar__icon-dots { display: flex; flex-direction: column; gap: 3px; }
.nav-bar__icon-dot { width: 4px; height: 4px; border-radius: 50%; background: $text-primary; }
.stats-bar { display: flex; gap: 12px; padding: 16px 20px; }
.stats-bar__item { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 12px 8px; background: rgba(255, 255, 255, 0.65); border-radius: $radius-card; backdrop-filter: blur(8px); }
.stats-bar__label { font-size: $font-size-label; color: $text-secondary; margin-bottom: 6px; }
.stats-bar__value { font-size: 20px; font-weight: $font-weight-title; color: $text-primary; }
.review-content { display: flex; flex-direction: column; padding: 0 20px; min-height: calc(100vh - 200px); }
.word-card { flex: 1; position: relative; min-height: 440px; margin-top: 16px; }
.word-card__front { display: flex; flex-direction: column; align-items: center; padding: 24px 20px; transition: opacity $transition-normal, transform $transition-normal; }
.word-card__front--hidden { opacity: 0; pointer-events: none; transform: translateY(-10px); }
.word-card__tag { padding: 6px 16px; background-color: rgba($text-secondary, 0.1); border-radius: 20px; margin-bottom: 16px; }
.word-card__tag-text { font-size: $font-size-label; color: $text-secondary; }
.word-card__word-block { margin-bottom: 16px; }
.word-card__word { font-size: $font-size-word; font-weight: $font-weight-word; color: $text-primary; text-align: center; line-height: 1; }
.word-card__phonetic-row { display: flex; align-items: center; gap: 12px; margin-bottom: 28px; }
.word-card__phonetic { font-size: $font-size-body; color: $text-secondary; }
.word-card__speak-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border: 1px solid $primary-green; border-radius: 50%; @include tap-feedback; }
.word-card__speak-btn--small { width: 28px; height: 28px; }
.word-card__speak-btn--back { width: 28px; height: 28px; }
.icon-speak { display: flex; align-items: flex-end; gap: 2px; height: 14px; }
.icon-speak__bar { width: 2.5px; height: 9px; border-radius: 1px; background-color: $primary-green; }
.icon-speak__bar--mid { height: 14px; }
.icon-speak__bar--delay { height: 6px; }
.word-card__too-easy { display: flex; align-items: center; gap: 8px; padding: 10px 20px; background-color: rgba($text-secondary, 0.06); border-radius: $radius-btn; margin-bottom: 20px; @include tap-feedback; }
.word-card__too-easy-icon { font-size: 16px; color: $text-secondary; }
.word-card__too-easy-text { font-size: $font-size-secondary; color: $text-secondary; }

.hint-card {
  width: 100%;
  background: rgba(255, 255, 255, 0.85);
  border-radius: $radius-card;
  @include card-shadow;
  padding: 16px;
  margin-top: 8px;
  opacity: 0;
  transform: translateY(16px);
  transition: opacity $transition-normal, transform $transition-normal;
  pointer-events: none;
}
.hint-card--visible {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}
.hint-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.hint-card__label {
  padding: 4px 12px;
  background-color: #FFF3D6;
  border-radius: 4px;
}
.hint-card__label-text {
  font-size: $font-size-label;
  color: #B8860B;
  font-weight: 500;
}
.hint-card__header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.hint-card__guide-text {
  font-size: $font-size-label;
  color: $text-secondary;
}
.hint-card__example {
  padding: 12px 0 4px;
  font-size: 15px;
  color: $text-primary;
  line-height: 1.8;
}
:deep(.word-card__hint-highlight) {
  color: $primary-green;
  font-weight: 600;
}

.word-card__hint { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.word-card__hint-text { font-size: 18px; color: $text-tertiary; line-height: 1.5; }
.word-card__back { position: absolute; top: 0; left: 0; right: 0; display: flex; flex-direction: column; padding: 28px 24px; background: $white; border-radius: $radius-card; @include card-shadow; opacity: 0; pointer-events: none; transform: translateY(10px); transition: opacity $transition-normal, transform $transition-normal; }
.word-card__back--visible { opacity: 1; pointer-events: auto; transform: translateY(0); }
.word-card__back-header { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
.word-card__back-word { font-size: 28px; font-weight: $font-weight-word; color: $text-primary; line-height: 1; }
.word-card__back-phonetic { display: block; font-size: $font-size-secondary; color: $text-secondary; margin-bottom: 16px; }
.word-card__back-meaning { display: flex; align-items: flex-start; gap: 8px; padding: 14px 16px; background-color: rgba($primary-green, 0.06); border-radius: $radius-sm; margin-bottom: 20px; }
.word-card__back-pos { font-size: $font-size-body; color: $text-secondary; flex-shrink: 0; }
.word-card__back-def { font-size: $font-size-body; font-weight: 500; color: $text-primary; line-height: 1.6; }
.word-card__back-example { padding-top: 16px; border-top: 1px solid $border-color; }
.word-card__back-example-label { display: block; font-size: $font-size-label; color: $text-tertiary; margin-bottom: 8px; }
.word-card__back-example-en { display: block; font-size: $font-size-secondary; color: $text-primary; line-height: 1.6; margin-bottom: 6px; }
.word-card__back-example-zh { display: block; font-size: $font-size-secondary; color: $text-secondary; line-height: 1.6; }
.action-bar { display: flex; gap: 16px; padding: 20px; padding-bottom: calc(20px + env(safe-area-inset-bottom)); margin-top: auto; }
.action-bar__btn { flex: 1; height: 60px; display: flex; align-items: center; justify-content: center; border-radius: $radius-btn; font-size: 18px; font-weight: $font-weight-title; background: $white; @include card-shadow; @include tap-feedback; }
.action-bar__btn--unknown { color: $primary-orange; }
.action-bar__btn--known { color: $primary-green; }
.review-done { display: flex; flex-direction: column; align-items: center; padding-top: 80px; }
.review-done__icon { font-size: 64px; margin-bottom: 16px; }
.review-done__title { font-size: 22px; font-weight: $font-weight-word; color: $text-primary; margin-bottom: 8px; }
.review-done__desc { font-size: $font-size-secondary; color: $text-secondary; margin-bottom: 32px; }
.review-done__btn { padding: 14px 40px; background-color: $primary-green; color: $white; border-radius: $radius-btn; font-size: $font-size-body; font-weight: $font-weight-title; @include tap-feedback; }
</style>