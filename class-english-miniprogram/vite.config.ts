import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

const tempCacheDir = `${process.env.TEMP || process.env.TMP || '.'}\\class-english-miniprogram-vite-cache`

export default defineConfig({
  cacheDir: process.env.VITE_CACHE_DIR || tempCacheDir,
  plugins: [uni()]
})
