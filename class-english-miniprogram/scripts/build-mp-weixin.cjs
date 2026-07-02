const { spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const uniCli = path.join(root, 'node_modules', '@dcloudio', 'vite-plugin-uni', 'bin', 'uni.js')
const distRoot = path.join(root, 'dist', 'build', 'mp-weixin')
const buildStartedAt = Date.now()
const requiredOutputs = [
  path.join(distRoot, 'app.js'),
  path.join(distRoot, 'app.json'),
  path.join(distRoot, 'app.wxss'),
  path.join(distRoot, 'pages', 'index', 'index.wxml'),
  path.join(distRoot, 'pages', 'index', 'index.wxss'),
  path.join(distRoot, 'pages', 'index', 'index.js'),
]

const buildResult = spawnSync(process.execPath, [uniCli, 'build', '-p', 'mp-weixin'], {
  cwd: root,
  stdio: 'inherit',
  shell: false,
})

if (buildResult.error) {
  console.error(buildResult.error && buildResult.error.stack ? buildResult.error.stack : buildResult.error)
  process.exit(1)
}

if (buildResult.status !== 0) {
  console.error(`uni build failed with status ${buildResult.status}`)
  process.exit(buildResult.status || 1)
}

const missingOutputs = requiredOutputs.filter((target) => !fs.existsSync(target))
if (missingOutputs.length) {
  console.error('Mini-program build output is incomplete:')
  for (const target of missingOutputs) {
    console.error(`- ${path.relative(root, target)}`)
  }
  process.exit(buildResult.status || 1)
}

const staleOutputs = requiredOutputs.filter((target) => {
  const stats = fs.statSync(target)
  return stats.mtimeMs < buildStartedAt - 5000
})

if (staleOutputs.length) {
  console.error('Mini-program build output looks stale; refusing to sync old files:')
  for (const target of staleOutputs) {
    console.error(`- ${path.relative(root, target)} (${fs.statSync(target).mtime.toISOString()})`)
  }
  process.exit(1)
}

const syncResult = spawnSync(process.execPath, [path.join(root, 'scripts', 'sync-mp-root.cjs')], {
  cwd: root,
  stdio: 'inherit',
  shell: false,
})

if (syncResult.status && syncResult.status !== 0) {
  process.exit(syncResult.status)
}

console.log('Run method: open Weixin Mini Program DevTools, import the project root, then click compile.')
