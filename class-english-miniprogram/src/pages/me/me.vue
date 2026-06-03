<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getStats } from '@/utils/storage'

const statusBarHeight = ref(20)
interface Stats { total: number; reviewed: number; mastered: number; todayReview: number; todayAdded: number }

const stats = ref<Stats>({
  total: 0, reviewed: 0, mastered: 0,
  todayReview: 0, todayAdded: 0
})
const todayDate = ref('')

const masteredPercent = computed(() => {
  if (stats.value.total === 0) return 0
  return Math.round((stats.value.mastered / stats.value.total) * 100)
})

const reviewedPercent = computed(() => {
  if (stats.value.total === 0) return 0
  return Math.round((stats.value.reviewed / stats.value.total) * 100)
})

function startReview() {
  uni.navigateTo({ url: '/pages/review/review' })
}

function refresh() {
  stats.value = getStats()
  const d = new Date()
  const months = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二']
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  todayDate.value = `${d.getFullYear()}年${months[d.getMonth()]}月${d.getDate()}日 星期${weekdays[d.getDay()]}`
}

onMounted(() => {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight ?? 20
  refresh()
})
</script>

<template>
  <view style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:9999;font-size:120px;font-weight:900;color:#FF3B30;">1</view>
  <view class="me-page">
    <view class="nav-bar" :style="{ paddingTop: `${statusBarHeight}px` }">
      <view class="nav-bar__inner">
        <text class="nav-bar__title">我的</text>
      </view>
    </view>

    <scroll-view class="me-scroll" scroll-y :style="{ paddingTop: `${statusBarHeight + 50}px`, height: `calc(100vh - ${statusBarHeight + 50}px)` }">

      <view class="date-card">
        <text class="date-card__text">{{ todayDate }}</text>
        <text class="date-card__subtitle">阇观英语 · 每日打卡</text>
      </view>

      <view class="stats-card">
        <text class="stats-card__title">学习统计</text>
        <view class="stats-grid">
          <view class="stat-item">
            <text class="stat-item__value stats--green">{{ stats.total }}</text>
            <text class="stat-item__label">总词文</text>
          </view>
          <view class="stat-item">
            <text class="stat-item__value stats--orange">{{ stats.todayAdded }}</text>
            <text class="stat-item__label">今日新墟</text>
          </view>
          <view class="stat-item">
            <text class="stat-item__value stats--green">{{ stats.todayReview }}</text>
            <text class="stat-item__label">待复习</text>
          </view>
          <view class="stat-item">
            <text class="stat-item__value">{{ masteredPercent }}%</text>
            <text class="stat-item__label">掌握率</text>
          </view>
        </view>

        <view class="progress-section">
          <view class="progress-row">
            <text class="progress-row__label">已复习</text>
            <view class="progress-row__track">
              <view class="progress-row__fill" :style="{ width: `${reviewedPercent}%` }" />
            </view>
            <text class="progress-row__value">{{ stats.reviewed }} / {{ stats.total }}</text>
          </view>
          <view class="progress-row">
            <text class="progress-row__label">已掌握</text>
            <view class="progress-row__track">
              <view class="progress-row__fill progress-row__fill--mastered" :style="{ width: `${masteredPercent}%` }" />
            </view>
            <text class="progress-row__value">{{ stats.mastered }} / {{ stats.total }}</text>
          </view>
        </view>
      </view>

      <view class="menu-card">
        <text class="menu-card__title">功能</text>
        <view class="menu-item" @tap="startReview">
          <text class="menu-item__label">开始复习</text>
          <text class="menu-item__arrow">&#8250;</text>
        </view>
        <view class="menu-item" @tap="refresh">
          <text class="menu-item__label">挴新统计</text>
          <text class="menu-item__arrow">×··</text>
        </view>
        <view class="menu-item" @tap="uni.switchTab({ url: '/pages/words/words' })">
          <text class="menu-item__label">词库管理</text>
          <text class="menu-item__arrow">×··</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<style lang="scss" scoped>
.me-page { min-height: 100vh; background: linear-gradient(180deg, $bg-gradient-start 0%, $bg-gradient-end 200px, $page-bg 400px); }
.nav-bar { position: fixed; top: 0; left: 0; right: 0; z-index: 100; background: linear-gradient(180deg, $bg-gradient-start 0%, $white 100%); }
.nav-bar__inner { display: flex; align-items: center; justify-content: center; height: 44px; }
.nav-bar__title { font-size: 18px; font-weight: 600; color: $text-primary; }
.me-scroll { padding: 0 $spacing-page; }
.date-card { background: $white; border-radius: $radius-card; padding: 20px; margin-bottom: 16px; text-align: center; @include card-shadow; }
.date-card__text { font-size: 16px; font-weight: 500; color: $text-primary; display: block; margin-bottom: 6px; }
.date-card__subtitle { font-size: 13px; color: $text-secondary; }
.stats-card { background: $white; border-radius: $radius-card; padding: 20px; margin-bottom: 16px; @include card-shadow; }
.stats-card__title { font-size: 16px; font-weight: 600; color: $text-primary; margin-bottom: 16px; display: block; }
.stats-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; margin-bottom: 20px; }
.stat-item { text-align: center; }
.stat-item__value { display: block; font-size: 28px; font-weight: 700; color: $text-primary; margin-bottom: 4px; }
.stats--green { color: $primary-green; }
.stats--orange { color: $primary-orange; }
.stat-item__label { font-size: 11px; color: $text-secondary; }
.progress-section {}
.progress-row { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.progress-row__label { font-size: 12px; color: $text-secondary; width: 50px; flex-shrink: 0; }
.progress-row__track { flex: 1; height: 8px; background-color: rgba($primary-green, 0.1); border-radius: 4px; overflow: hidden; }
.progress-row__fill { height: 100%; background-color: $primary-green; border-radius: 4px; transition: width 0.5s ease; }
.progress-row__fill--mastered { background-color: rgba($primary-orange, 0.7); }
.progress-row__value { font-size: 12px; color: $text-secondary; width: 60px; text-align: right; flex-shrink: 0; }
.menu-card { background: $white; border-radius: $radius-card; padding: 20px; margin-bottom: 40px; @include card-shadow; }
.menu-card__title { font-size: 16px; font-weight: 600; color: $text-primary; margin-bottom: 12px; display: block; }
.menu-item { display: flex; justify-content: space-between; align-items: center; padding: 14px 0; border-bottom: 1px solid $border-color; @include tap-feedback; }
.menu-item:last-child { border-bottom: none; }
.menu-item__label { font-size: 15px; color: $text-primary; }
.menu-item__arrow { font-size: 14px; color: $text-tertiary; }
</style>