// 根据上一个 tag 到当前 tag 之间的提交，按规范提交前缀生成 Release 说明（输出到 stdout）
// 用法：node scripts/release-notes.mjs v0.3.0
// 不用 GitHub 的 --generate-notes：它只收录已合并的 PR，而本仓库直接推 main，生成结果为空
import { execFileSync } from 'node:child_process'

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim()

const tag = process.argv[2]
if (!tag) {
  console.error('用法：node scripts/release-notes.mjs <tag>')
  process.exit(1)
}

// 上一个 tag；首个版本没有上一个 tag，此时取该 tag 可达的全部提交
const prevTag = (() => {
  try {
    return git('describe', '--tags', '--abbrev=0', `${tag}^`)
  } catch {
    return ''
  }
})()

// 面向使用者无意义的提交类型，不进入说明
const SKIPPED_TYPES = new Set(['docs', 'ci'])

// 分组顺序即输出顺序；未命中的类型归入「其他改进」
const SECTIONS = [
  { title: '新功能', types: ['feat'] },
  { title: '问题修复', types: ['fix'] },
]

// "feat(scope)!: 内容" → { type: 'feat', text: '内容' }；不符合规范的提交归为 other
const parseSubject = (subject) => {
  const match = subject.match(/^(\w+)(?:\([^)]*\))?!?:\s*(.+)$/)
  return match ? { type: match[1], text: match[2] } : { type: 'other', text: subject }
}

const commits = git('log', '--no-merges', '--format=%s', prevTag ? `${prevTag}..${tag}` : tag)
  .split('\n')
  .filter(Boolean)
  .map(parseSubject)
  .filter(({ type }) => !SKIPPED_TYPES.has(type))

const knownTypes = SECTIONS.flatMap(({ types }) => types)
const groups = [
  ...SECTIONS,
  { title: '其他改进', types: null },
].map(({ title, types }) => ({
  title,
  items: commits
    .filter(({ type }) => (types ? types.includes(type) : !knownTypes.includes(type)))
    .map(({ text }) => `- ${text}`),
}))

const body = groups
  .filter(({ items }) => items.length > 0)
  .map(({ title, items }) => `## ${title}\n\n${items.join('\n')}`)
  .join('\n\n')

const repo = process.env.GITHUB_REPOSITORY ?? 'MonkeyDTH/MirrorSync'
const footer = prevTag
  ? `**完整对比**：https://github.com/${repo}/compare/${prevTag}...${tag}`
  : ''

console.log([body || '本版本无面向使用者的变更。', footer].filter(Boolean).join('\n\n'))
