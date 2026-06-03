<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { loadVocab, type VocabWord } from '@/utils/storage'
import { speakWord, stopSpeech } from '@/utils/tts'

const statusBarHeight = ref(20)
const wordData = ref<VocabWord | null>(null)
const activeTab = ref<'cet6' | 'collins'>('cet6')

const currentWord = computed(() => wordData.value?.word || '')
const phonetic = computed(() => wordData.value?.phonetic || '')

const highlightedExample = computed(() => {
  if (!wordData.value) return ''
  const word = wordData.value.word
  const example = wordData.value.example
  if (!example || !word) return ''
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp('(' + escaped + ')', 'gi')
  return example.replace(regex, '<text class="detail-example__highlight">$1</text>')
})

onMounted(() => {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight ?? 20

  // Get word from route params or load from storage
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  const wordId = currentPage?.options?.id || ''
  const word = currentPage?.options?.word || 'partly'

  if (wordId) {
    const all = loadVocab()
    const found = all.find(w => w.id === wordId)
    if (found) {
      wordData.value = found
      return
    }
  }

  // Fallback: search by word name
  const all = loadVocab()
  const found = all.find(w => w.word.toLowerCase() === word.toLowerCase())
  if (found) {
    wordData.value = found
  } else {
    // Demo data
    wordData.value = {
      id: 'demo-1',
      word: 'partly',
      phonetic: '/ˈpɑːrtli/',
      partOfSpeech: 'adv.',
      meaning: '一定程度上，部分地',
      example: 'The shopkeeper was only partly responsible for the accident.',
      exampleTranslation: '店主只对这次事故负有部分责任。',
      addTime: Date.now() - 33 * 86400000,
      nextReviewTime: Date.now(),
      familiarity: 0,
      reviewCount: 0,
      correctCount: 0,
    }
  }
})

onUnmounted(() => {
  stopSpeech()
})

function playAudio() {
  if (currentWord.value) {
    speakWord(currentWord.value)
  }
}

function goBack() {
  uni.navigateBack()
}

function goNext() {
  uni.showToast({ title: '下一个单词', icon: 'none' })
}
</script>

<template>
  <view class="word-detail-page">
    <!-- Gradient header -->
    <view class="detail-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="detail-header__top">
        <view class="detail-header__back" @tap="goBack">
          <text class="detail-header__back-icon">&#8592;</text>
        </view>
        <view class="detail-header__main">
          <text class="detail-header__word">{{ currentWord }}</text>
          <text class="detail-header__phonetic">{{ phonetic }}</text>
        </view>
        <view class="detail-header__speak" @tap="playAudio">
          <view class="detail-header__speak-btn">
            <view class="icon-speak"><view class="icon-speak__bar" /><view class="icon-speak__bar icon-speak__bar--mid" /><view class="icon-speak__bar icon-speak__bar--delay" /></view>
          </view>
        </view>
      </view>
    </view>

    <!-- Dictionary tabs -->
    <view class="dict-tabs">
      <view class="dict-tabs__container">
        <view
          class="dict-tabs__item"
          :class="{ 'dict-tabs__item--active': activeTab === 'cet6' }"
          @tap="activeTab = 'cet6'"
        >
          <text class="dict-tabs__text">六级词典</text>
        </view>
        <view
          class="dict-tabs__item"
          :class="{ 'dict-tabs__item--active': activeTab === 'collins' }"
          @tap="activeTab = 'collins'"
        >
          <text class="dict-tabs__text">柯林斯词典</text>
        </view>
      </view>
      <view class="dict-tabs__divider" />
    </view>

    <scroll-view class="detail-scroll" scroll-y>
      <!-- Meaning section -->
      <view class="detail-meaning">
        <text class="detail-meaning__text">{{ wordData?.partOfSpeech }} {{ wordData?.meaning }}</text>
      </view>

      <!-- Example section -->
      <view class="detail-example">
        <text class="detail-example__label">【例句】</text>
        <view class="detail-example__row">
          <view class="detail-example__content">
            <rich-text :nodes="highlightedExample" class="detail-example__en"></rich-text>
            <text class="detail-example__zh">{{ wordData?.exampleTranslation }}</text>
          </view>
          <view class="detail-example__speak" @tap="playAudio">
            <view class="icon-speak"><view class="icon-speak__bar" /><view class="icon-speak__bar icon-speak__bar--mid" /><view class="icon-speak__bar icon-speak__bar--delay" /></view>
          </view>
        </view>
      </view>

      <!-- Word notes card -->
      <view class="notes-card">
        <view class="notes-card__header">
          <text class="notes-card__header-text">单词笔记</text>
          <text class="notes-card__header-arrow">&#8250;</text>
        </view>
        <view class="notes-card__section">
          <text class="notes-card__section-label">扇贝官方词根拓展</text>
          <text class="notes-card__section-content">partial adj. / partially adv. / particle n. / impart v.</text>
        </view>
        <view class="notes-card__divider" />
        <view class="notes-card__note">
          <view class="notes-card__note-content">
            <text class="notes-card__note-text">partly--adv.在一定程度上</text>
          </view>
          <view class="notes-card__note-meta">
            <text class="notes-card__note-author">aivea</text>
            <text class="notes-card__note-star">&#9734;</text>
          </view>
        </view>
        <view class="notes-card__divider" />
        <view class="notes-card__note">
          <view class="notes-card__note-content">
            <text class="notes-card__note-text">part 部分 partly 一部分地</text>
          </view>
          <view class="notes-card__note-meta">
            <text class="notes-card__note-author">阿葱shir_locked</text>
            <text class="notes-card__note-star">&#9734;</text>
          </view>
        </view>
      </view>

      <!-- Spacer for bottom button -->
      <view class="detail-spacer" />
    </scroll-view>

    <!-- Bottom button -->
    <view class="detail-bottom">
      <view class="detail-bottom__btn" @tap="goNext">
        <text class="detail-bottom__btn-text">下一个</text>
        <text class="detail-bottom__btn-arrow">&#8593;</text>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.word-detail-page {
  min-height: 100vh;
  background: $page-bg;
  display: flex;
  flex-direction: column;
}

.detail-header {
  background: linear-gradient(180deg, $bg-gradient-start 0%, $bg-gradient-end 100%);
  height: 200px;
  position: relative;
}
.detail-header__top {
  display: flex;
  align-items: flex-start;
  padding: 12px 20px 0;
}
.detail-header__back {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  flex-shrink: 0;
}
.detail-header__back-icon {
  font-size: 28px;
  font-weight: 400;
  color: $text-primary;
  line-height: 1;
}
.detail-header__main {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 16px;
}
.detail-header__word {
  font-size: 36px;
  font-weight: 700;
  color: $text-highlight;
  line-height: 1.2;
}
.detail-header__phonetic {
  font-size: $font-size-secondary;
  color: $text-secondary;
  margin-top: 8px;
}
.detail-header__speak {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-shrink: 0;
}
.detail-header__speak-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid $primary-green;
  border-radius: 50%;
  @include tap-feedback;
}
.icon-speak {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 14px;
}
.icon-speak__bar {
  width: 2.5px;
  height: 9px;
  border-radius: 1px;
  background-color: $primary-green;
}
.icon-speak__bar--mid { height: 14px; }
.icon-speak__bar--delay { height: 6px; }

.dict-tabs {
  background: $white;
  padding: 0 20px;
}
.dict-tabs__container {
  display: flex;
  gap: 32px;
  padding-top: 16px;
}
.dict-tabs__item {
  padding-bottom: 10px;
  position: relative;
  @include tap-feedback;
}
.dict-tabs__item--active {
  border-bottom: 2px solid $primary-green;
}
.dict-tabs__text {
  font-size: $font-size-body;
  color: $text-secondary;
}
.dict-tabs__item--active .dict-tabs__text {
  color: $text-primary;
  font-weight: 500;
}
.dict-tabs__divider {
  height: 1px;
  background: $border-color;
  margin-bottom: 0;
}

.detail-scroll {
  flex: 1;
  overflow-y: auto;
}

.detail-meaning {
  padding: 20px;
}
.detail-meaning__text {
  font-size: $font-size-body;
  color: $text-primary;
  line-height: 1.8;
}

.detail-example {
  padding: 0 20px 20px;
}
.detail-example__label {
  display: block;
  font-size: $font-size-label;
  color: $text-secondary;
  margin-bottom: 10px;
}
.detail-example__row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.detail-example__content {
  flex: 1;
}
.detail-example__en {
  font-size: 15px;
  color: $text-primary;
  line-height: 1.8;
  margin-bottom: 8px;
}
:deep(.detail-example__highlight) {
  color: $primary-green;
  font-weight: 600;
}
.detail-example__zh {
  font-size: $font-size-secondary;
  color: $text-secondary;
  line-height: 1.6;
}
.detail-example__speak {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid $primary-green;
  border-radius: 50%;
  flex-shrink: 0;
  @include tap-feedback;
}

.notes-card {
  margin: 0 20px;
  background: $white;
  border-radius: $radius-card;
  @include card-shadow;
  padding: 16px;
}
.notes-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.notes-card__header-text {
  font-size: $font-size-label;
  color: $text-secondary;
}
.notes-card__header-arrow {
  font-size: 20px;
  color: $text-tertiary;
  line-height: 1;
}
.notes-card__section {
  margin-bottom: 12px;
}
.notes-card__section-label {
  display: block;
  font-size: $font-size-label;
  color: $text-tertiary;
  margin-bottom: 6px;
}
.notes-card__section-content {
  font-size: $font-size-secondary;
  color: $text-primary;
  line-height: 1.6;
}
.notes-card__divider {
  height: 1px;
  background: $border-color;
  margin: 12px 0;
}
.notes-card__note {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}
.notes-card__note-content {
  flex: 1;
}
.notes-card__note-text {
  font-size: $font-size-secondary;
  color: $text-primary;
  line-height: 1.6;
}
.notes-card__note-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  margin-left: 12px;
}
.notes-card__note-author {
  font-size: $font-size-label;
  color: $text-tertiary;
}
.notes-card__note-star {
  font-size: 16px;
  color: $text-tertiary;
}

.detail-spacer {
  height: 80px;
}

.detail-bottom {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 20px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
  background: $white;
}
.detail-bottom__btn {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: $primary-green;
  border-radius: $radius-btn;
  @include tap-feedback;
}
.detail-bottom__btn-text {
  font-size: 18px;
  font-weight: 600;
  color: $white;
}
.detail-bottom__btn-arrow {
  font-size: 18px;
  color: $white;
}
</style>