// 根据构建产物生成 updater 清单 latest.json（输出到 stdout），随 Release 一起上传
// 用法：node scripts/updater-manifest.mjs v0.4.0 release-notes.md > latest.json
// 客户端按 {os}-{arch}-{安装包类型} → {os}-{arch} 的顺序匹配 platforms，
// 所以 msi/nsis 各写一份，保证用户沿用自己装的那种；无类型兜底指向 nsis
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const [tag, notesFile] = process.argv.slice(2)
if (!tag || !notesFile) {
  console.error('用法：node scripts/updater-manifest.mjs <tag> <notes 文件>')
  process.exit(1)
}

const REPO = 'MonkeyDTH/MirrorSync'
const BUNDLE_DIR = 'target/release/bundle'

// 在 bundle 子目录里找唯一的安装包及其 .sig，找不到或不唯一直接失败，绝不发布残缺清单
const artifact = (subdir, suffix) => {
  const dir = join(BUNDLE_DIR, subdir)
  const files = readdirSync(dir).filter((f) => f.endsWith(suffix))
  if (files.length !== 1) {
    console.error(`${dir} 下应恰好有 1 个 *${suffix}，实际：${JSON.stringify(files)}`)
    process.exit(1)
  }
  const [file] = files
  return {
    // gh release 上传时会把文件名中的空格替换为点，产物名不含空格，直接拼即可
    url: `https://github.com/${REPO}/releases/download/${tag}/${file}`,
    signature: readFileSync(join(dir, `${file}.sig`), 'utf8').trim(),
  }
}

const nsis = artifact('nsis', '-setup.exe')
const msi = artifact('msi', '.msi')

// Release 说明是给 GitHub 页面的 Markdown；应用内弹窗（含已安装的旧版本）按纯文本显示，
// 这里转成纯文本也好看的格式：去掉 ## 标题符号、列表改圆点、删除应用内无用的对比链接
const toPlainNotes = (markdown) =>
  markdown
    .split('\n')
    .filter((line) => !line.startsWith('**完整对比**'))
    .map((line) => line.replace(/^#+\s*/, '').replace(/^-\s+/, '• '))
    .join('\n')
    .trim()

const manifest = {
  version: tag.replace(/^v/, ''),
  notes: toPlainNotes(readFileSync(notesFile, 'utf8')),
  pub_date: new Date().toISOString(),
  platforms: {
    'windows-x86_64-nsis': nsis,
    'windows-x86_64-msi': msi,
    'windows-x86_64': nsis,
  },
}

console.log(JSON.stringify(manifest, null, 2))
