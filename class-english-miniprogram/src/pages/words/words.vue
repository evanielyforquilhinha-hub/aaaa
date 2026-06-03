<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { loadVocab, reviewWord, removeWord, getTodayReviewWords, type VocabWord } from '@/utils/storage'
import { speakWord, stopSpeech } from '@/utils/tts'

const words = ref<VocabWord[]>([])
const todayReview = ref<VocabWord[]>([])
const statusBarHeight = ref(20)
const currentCardIndex = ref(0)
const showMeaning = ref(false)
const reviewSessionDone = ref(false)
const isEmpty = ref(true)

const currentCard = computed(() => todayReview.value[currentCardIndex.value] || null)

const reviewProgress = computed(() => {
  if (todayReview.value.length === 0) return 0
  return Math.round(((currentCardIndex.value / todayReview.value.length) * 100))
})

function loadData() {
  words.value = loadVocab()
  todayReview.value = getTodayReviewWords()
  isEmpty.value = words.value.length === 0 && todayReview.value.length === 0
  currentCardIndex.value = 0
  showMeaning.value = false
  reviewSessionDone.value = false
}

function flipCard() {
  showMeaning.value = true
}

function markKnown() {
  if (!currentCard.value) return
  reviewWord(currentCard.value.id, true)
  nextCard()
}

function markUnknown() {
  if (!currentCard.value) return
  reviewWord(currentCard.value.id, false)
  nextCard()
}

function nextCard() {
  if (currentCardIndex.value >= todayReview.value.length - 1) {
    reviewSessionDone.value = true
    return
  }
  currentCardIndex.value++
  showMeaning.value = false
}

function restartReview() {
  loadData()
}

function playWord(word: string) {
  speakWord(word)
}

function confirmRemove(id: string, word: string) {
  uni.showModal({ title: '确认删除', content: `确定融生词本中删除《${word}」吗？`, success: (res) => { if (res.confirm) { removeWord(id); words.value = loadVocab(); todayReview.value = getTodayReviewWords(); if (words.value.length === 0) isEmpty.value = true } } })
}

const searchQuery = ref('')
const filteredWords = computed(() => {
  if (!searchQuery.value) return words.value
  const q = searchQuery.value.toLowerCase()
  return words.value.filter(w => w.word.toLowerCase().includes(q) || w.meaning.includes(q))
})

function getFamiliarityStars(f: number): string { return new Array(f+1).join("u2605") + new Array(6-f).join("u2606") }

onMounted(() => {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight ?? 20
  loadData()
})

onUnmounted(() => {
  stopSpeech()
})
</script>

<template>
  <view style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9999;font-size:120px;font-weight:900;color:#FF3B30;">1</view>
  <view class="vocab-page">
    <view class="nav-bar" :style="{ paddingTop: `${statusBarHeight}px` }">
      <view class="nav-bar__inner">
        <text class="nav-bar__title">单词</text>
      </view>
    </view>

    <scroll-view class="vocab-scroll" scroll-y :style="{ paddingTop: `${statusBarHeight + 50}px`, height: `calc(100vh - ${statusBarHeight + 50}px)` }">
      <view v-if="isEmpty" class="empty-state">
        <view class="empty-state__icon"><text class="empty-state__icon-text">W</text></view>
        <text class="empty-state__title">生词本还是空能</text>
        <text class="empty-state__desc">Yl��阵郭中点击单词，加入到生词本吧</text>
      </view>

      <view v-else-if="!reviewSessionDone && todayReview.length > 0" class="review-session">
        <view class="review-header">
          <text class="review-header__title">今日复习</text>
          <text class="review-header__count">{{ currentCardIndex + 1 }} / {{ todayReview.length }}</text>
        </view>
        <view class="review-progress">
          <view class="review-progress__bar" :style="{ width: `${reviewProgress}%` }" />
        </view>

        <view class="flashcard" :class="{ 'flashcard--flipped': showMeaning }" @tap="flipCard">
          <view class="flashcard__inner">
            <view class="flashcard__front">
              <text class="flashcard__word">{{ currentCard?.word }}</text>
              <text class="flashcard__hint">点击显示介义</text>
            </view>
            <view class="flashcard__back">
              <view class="flashcard__back-header">
                <text class="flashcard__word">{{ currentCard?.word }}</text>
                <view class="flashcard__speak" @tap.stop="playWord(currentCard?.word || '')">
                  <view class="icon-speak">
                    <view class="icon-speak__bar" />
                    <view class="icon-speak__bar icon-speak__bar--mid" />
                    <view class="icon-speak__bar icon-speak__bar--delay" />
                  </view>
                </view>
              </view>
              <text class="flashcard__phonetic">{{ currentCard?.phonetic }}</text>
              <text class="flashcard__meaning">{{ currentCard?.partOfSpeech }} {{ currentCard?.meaning }}</text>
              <view class="flashcard__example-section">
                <text class="flashcard__example-label">侊句</text>
                <text class="flashcard__example-en">{{ currentCard?.example }}</text>
                <text class="flashcard__example-zh">{{ currentCard?.exampleTranslation }}</text>
              </view>
            </view>
          </view>
        </view>

        <view v-if="showMeaning" class="review-actions">
          <view class="review-actions__btn review-actions__btn--forgot" @tap="markUnknown">
            <text class="review-actions__btn-icon">&#010009;</text>
            <text class="review-actions__btn-label">没记住</text>
          </view>
          <view class="review-actions__btn review-actions__btn--know" @tap="markKnown">
            <text class="review-actions__btn-icon">&#010007;</text>
            <text class="review-actions__btn-label">记住了</text>
          </view>
        </view>
      </view>

      <view v-else-if="reviewSessionDone" class="review-done">
        <view class="review-done__icon">&#0127381;</view>
        <text class="review-done__title">今日复习完成！</text>
        <text class="review-done__desc">已复习 {{ todayReview.length }} 个单词</text>
        <view class="review-done__btn" @tap="restartReview">再复习一轮</view>
      </view>

      <view v-else class="vocab-list">
        <view class="vocab-list__search">
          <text class="vocab-list__search-icon">&#128269;</text>
          <input class="vocab-list__search-input" v-model="searchQuery" placeholder="搜索单词..." />
        </view>
        <view v-for="w in filteredWords" :key="w.id" class="word-item" @longpress="confirmRemove(w.id, w.word)">
          <view class="word-item__main">
            <view class="word-item__top">
              <text class="word-item__word" @tap="playWord(w.word)">{{ w.word }}</text>
              <text class="word-item__phonetic">{{ w.phonetic }}</text>
            </view>
            <text class="word-item__meaning">{{ w.partOfSpeech }} {{ w.meaning }}</text>
            <text class="word-item__familiarity">{{ getFamiliarityStars(w.familiarity) }}</text>
          </view>
          <view class="word-item__action" @tap="confirmRemove(w.id, w.word)">
            <text class="word-item__delete">删除</text>
          </view>
        </view>
        <view class="vocab-list__footer">长按单词可删除</view>
      </view>
    </scroll-view>
  </view>
</template>

<style lang="scss" scoped>
.vocab-page { min-height: 100vh; background: linear-gradient(180deg, $bg-gradient-start 0%, $bg-gradient-end 200px, $page-bg 400px); }
.nav-bar { position: fixed; top: 0; left: 0; right: 0; z-index: 100; background: linear-gradient(180deg, $bg-gradient-start 0%, $white 100%); }
.nav-bar__inner { display: flex; align-items: center; justify-content: center; height: 44px; }
.nav-bar__title { font-size: 18px; font-weight: 600; color: $text-primary; }
.vocab-scroll { padding: 0 $spacing-page; }
.empty-state { display: flex; flex-direction: column; align-items: center; padding-top: 80px; }
.empty-state__icon { width: 80px; height: 80px; border-radius: 50%; background-color: rgba($primary-green, 0.1); display: flex; align-items: center; justify-content: center; margin-bottom: 20px; }
.empty-state__icon-text { font-size: 36px; font-weight: 700; color: $primary-green; }
.empty-state__title { font-size: 18px; font-weight: 600; color: $text-primary; margin-bottom: 8px; }
.empty-state__desc { font-size: 14px; color: $text-secondary; text-align: center; line-height: 1.5; }
.review-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 0 12px; }
.review-header__title { font-size: 22px; font-weight: 700; color: $text-primary; }
.review-header__count { font-size: 14px; color: $text-secondary; }
.review-progress { height: 4px; background-color: rgba($primary-green, 0.15); border-radius: 2px; margin-bottom: 28px; overflow: hidden; }
.review-progress__bar { height: 100%; background-color: $primary-green; border-radius: 2px; transition: width 0.3s ease; }
.flashcard { perspective: 1000px; margin-bottom: 24px; min-height: 340px; }
.flashcard__inner { position: relative; width: 100%; min-height: 340px; transition: all 0.4s ease; }
.flashcard__front, .flashcard__back { position: absolute; top: 0; left: 0; right: 0; border-radius: $radius-card; padding: 32px 24px; background: $white; @include card-shadow; }
.flashcard--flipped .flashcard__front { opacity: 0; pointer-events: none; }
.flashcard:not(.flashcard--flipped) .flashcard__back { opacity: 0; pointer-events: none; }
.flashcard__front { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 340px; }
.flashcard__word { font-size: 28px; font-weight: 700; color: $text-primary; text-align: center; margin-bottom: 16px; }
.flashcard__hint { font-size: 14px; color: $text-secondary; }
.flashcard__back { min-height: 340px; }
.flashcard__back-header { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
.flashcard__speak { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border: 1px solid $border-color; border-radius: 50%; }
.icon-speak { display: flex; align-items: flex-end; gap: 2px; height: 16px; }
.icon-speak__bar { width: 2.5px; height: 10px; border-radius: 1px; background-color: $primary-green; }
.icon-speak__bar--mid { height: 15px; }
.icon-speak__bar--delay { height: 7px; }
.flashcard__phonetic { font-size: 16px; color: $text-secondary; margin-bottom: 12px; }
.flashcard__meaning { font-size: 18px; font-weight: 500; color: $text-primary; line-height: 1.6; margin-bottom: 16px; padding: 12px; background-color: rgba($primary-green, 0.06); border-radius: $radius-sm; }
.flashcard__example-section { padding-top: 12px; border-top: 1px solid $border-color; }
.flashcard__example-label { font-size: 12px; color: $text-tertiary; margin-bottom: 6px; display: block; }
.flashcard__example-en { display: block; font-size: 14px; color: $text-primary; line-height: 1.5; margin-bottom: 4px; }
.flashcard__example-zh { display: block; font-size: 14px; color: $text-secondary; line-height: 1.5; }
.review-actions { display: flex; gap: 16px; padding-bottom: 40px; }
.review-actions__btn { flex: 1; height: 52px; display: flex; align-items: center; justify-content: center; gap: 8px; border-radius: $radius-btn; font-weight: 600; @include tap-feedback; }
.review-actions__btn--forgot { background-color: rgba($primary-orange, 0.12); color: $primary-orange; border: 1.5px solid $primary-orange; }
.review-actions__btn--know { background-color: $primary-green; color: $white; }
.review-actions__btn-icon { font-size: 18px; }
.review-actions__btn-label { font-size: 16px; }
.review-done { display: flex; flex-direction: column; align-items: center; padding-top: 60px; }
.review-done__icon { font-size: 64px; margin-bottom: 16px; }
.review-done__title { font-size: 22px; font-weight: 700; color: $text-primary; margin-bottom: 8px; }
.review-done__desc { font-size: 15px; color: $text-secondary; margin-bottom: 32px; }
.review-done__btn { padding: 14px 40px; background-color: $primary-green; color: $white; border-radius: $radius-btn; font-size: 16px; font-weight: 600; }
.vocab-list { padding-top: 20px; }
.vocab-list__search { display: flex; align-items: center; background-color: $white; border-radius: $radius-sm; padding: 8px 12px; margin-bottom: 12px; border: 1px solid $border-color; }
.vocab-list__search-icon { margin-right: 8px; font-size: 14px; }
.vocab-list__search-input { flex: 1; font-size: 14px; color: $text-primary; height: 24px; }
.word-item { display: flex; align-items: center; background-color: $white; border-radius: $radius-sm; padding: 14px 16px; margin-bottom: 8px; @include card-shadow; }
.word-item__main { flex: 1; }
.word-item__top { display: flex; align-items: baseline; gap: 8px; margin-bottom: 4px; }
.word-item__word { font-size: 16px; font-weight: 600; color: $text-primary; }
.word-item__phonetic { font-size: 12px; color: $text-secondary; }
.word-item__meaning { font-size: 14px; color: $text-secondary; margin-bottom: 4px; }
.word-item__familiarity { font-size: 12px; color: rgba($primary-orange, 0.7); letter-spacing: 2px; }
.word-item__action { margin-left: 12px; }
.word-item__delete { font-size: 12px; color: $primary-red; padding: 6px 10px; border: 1px solid rgba($primary-red, 0.3); border-radius: 4px; }
.vocab-list__footer { text-align: center; padding: 20px 0 40px; font-size: 12px; color: $text-tertiary; }
</style>