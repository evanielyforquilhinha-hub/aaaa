<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'

onLaunch(() => {})
onShow(() => {})
onHide(() => {})
</script>

<style lang="scss">
page {
  font-family: $font-family-base;
  font-size: 16px;
  line-height: 1.5;
  color: $text-primary;
  background: linear-gradient(180deg, $bg-gradient-start 0%, $bg-gradient-end 200px, $page-bg 400px);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}

view, text, image, button, input, textarea, label, navigator {
  box-sizing: border-box;
}

button {
  margin: 0;
  padding: 0;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  color: inherit;
  background-color: transparent;
  border: none;
  border-radius: 0;

  &::after {
    border: none;
  }
}

image {
  display: block;
  max-width: 100%;
}

::-webkit-scrollbar {
  width: 0;
  height: 0;
  background: transparent;
}
</style>
