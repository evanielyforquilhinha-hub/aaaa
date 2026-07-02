const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const distRoot = path.join(root, 'dist', 'build', 'mp-weixin')

function assertExists(target) {
  if (!fs.existsSync(target)) {
    throw new Error(`Missing build output: ${path.relative(root, target)}`)
  }
}

function copyDir(from, to) {
  assertExists(from)
  fs.mkdirSync(to, { recursive: true })
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const sourcePath = path.join(from, entry.name)
    const targetPath = path.join(to, entry.name)
    if (entry.isDirectory()) {
      copyDir(sourcePath, targetPath)
    } else if (entry.isFile()) {
      fs.copyFileSync(sourcePath, targetPath)
    }
  }
}

function copyDirIfExists(from, to) {
  if (fs.existsSync(from)) {
    copyDir(from, to)
  }
}

function copyFile(from, to) {
  assertExists(from)
  fs.copyFileSync(from, to)
}

try {
  copyDir(path.join(distRoot, 'pages'), path.join(root, 'pages'))
  copyDir(path.join(distRoot, 'pages'), path.join(root, 'pages', 'pages'))
  copyDir(path.join(distRoot, 'common'), path.join(root, 'common'))
  copyDirIfExists(path.join(distRoot, 'features'), path.join(root, 'features'))
  copyDirIfExists(path.join(distRoot, 'repositories'), path.join(root, 'repositories'))
  copyDirIfExists(path.join(distRoot, 'services'), path.join(root, 'services'))
  copyDir(path.join(distRoot, 'utils'), path.join(root, 'utils'))
  copyDir(path.join(distRoot, 'static'), path.join(root, 'static'))

  for (const filename of ['app.js', 'app.json', 'app.wxss']) {
    copyFile(path.join(distRoot, filename), path.join(root, filename))
  }

  console.log('Synced mp-weixin build output to root mini-program fallback files')
} catch (error) {
  console.error(error && error.stack ? error.stack : error)
  process.exitCode = 1
}
