# 品牌图标与应用改名 MirrorSync

**创建时间**: 2026-09-22 17:41
**背景**: 项目刚接入跨项目设计系统（见同目录 `20260922_接入跨项目设计系统设计方案.md`），色彩与字体已统一，但**图标仍是 Tauri 脚手架默认图**——和项目族毫无关系。同时应用名「目录同步工具」偏工具书式，一并改掉。版本升至 0.3.0。

---

## 1. 项目族的图标范式

先探查了 6 个已接入项目的图标，范式高度一致（MyFlowers 是尚未接入的例外，不作参照）：

```
24 格画布 + rx 6 圆角瓦片，瓦片填品牌 accent
白字形 #fefbf8，靠 fill-opacity 分层（1 / .62 / .42），不用描边
字形占 50~54%
SVG 注释里写明各色值镜像哪个语义角色，便于改品牌色时手动同步
```

| 项目 | 瓦片色 | 字形 |
|---|---|---|
| GameCompany | teal `#0c6d5f` | 领奖台（三根柱，1 / .62 / .42） |
| money_dashboard | teal `#0c6d5f` | 美元符 |
| WeightRecorderWeb | green `#2c6d3e` | 秤台（三块，1 / .42 / .62） |
| 影游志 | green `#2c6d3e` | 电影票（镂空细节） |

本项目品牌色已是 teal，瓦片色直接取 `#0c6d5f`（accent = teal 色族第 9 阶）。

**不走 MyAsset 那条全出血路线**：MyAsset 是 PWA，iOS / Android 会各自套圆角遮罩，图里再画圆角会双重圆角。本项目是 Windows / macOS 桌面应用，系统**不**套遮罩，圆角必须自己画，所以落 24 格瓦片这一支。

## 2. 字形选型

### 第一轮：5 个方向，16px 实测淘汰

把候选渲成真实位图，按 96 / 32 / 16 三档看，16px 是裁判（标题栏、文件列表、任务栏小图标都在这一档）。

| 方案 | 96px | 16px 实测 | 结论 |
|---|---|---|---|
| A 横排 块→块 | 好看 | 三元素黏连成一条，`.42` 副本块层次消失 | 淘汰 |
| B 竖排 块↓块 | 尚可 | 糊成「工字/沙漏」，认不出 | 淘汰 |
| C 箭头主导 | 清晰 | **唯一完全清晰**，但 `.42` 尾块消失，退化成通用「下一步」箭头 | 语义不足 |
| D 重叠双块 | 清晰 | **唯一保住「两个东西」**，但无方向 | 语义不足 |
| E 环绕箭头 | 一般 | 弧线糊掉，箭头认不出 | 淘汰（对照组） |

**根因**：24 格里塞「两个对象 + 一个方向」是三份信息，超标了。项目族里所有立得住的图标都是**一个物体**（领奖台、秤台、电影票），不是「两个物体 + 关系」。C 和 D 各自只保住了一半语义，正是这个约束的体现。

### 第二轮：A 的几何调校

用户选定 A（横排 块→块）的构思。A 在 16px 下失败是**几何问题不是构思问题**——元素间隙只有 1.4 格，换算 16px 是 0.93 物理像素，不到一个像素自然会并。针对性调了四版：

| 版本 | 改动 | 16px 实测 |
|---|---|---|
| A1 | 基线（间隙 1.4 格，带杆箭头） | 箭头与左块粘住，箭头糊成一团 |
| A2 | 间隙拉到 2.0 格 | 元素分开了，但箭头仍认不出形状 |
| A3 | A2 + 箭头去杆改纯三角 | 三元素首次分明，三角可辨 |
| **A4** | A3 + 副本块 `.42 → .55` | **层次差留住了，定稿** |

### 定稿的三条几何依据

这三条都写进了 `src-tauri/icons/icon.svg` 的注释头，改图标的人第一眼就能看到：

1. **元素间隙 2.0 格**。24 格落到 16px 时 1 格 = 0.667px，间隙小于 2 格就不足一个物理像素，三个元素会并成一条。
2. **箭头是纯三角，没有杆**。带杆版的杆高 2 格 = 1.33px，是整枚图标里最先垮掉的笔画；糊掉之后箭头认不出方向——而方向正是这枚图标要传达的信息。去杆同时把它拉回了范式内：项目族里没有任何一枚图标用细笔画。
3. **副本块用 `.55` 而非家族常用的 `.42`**。`.42` 在 16px 下与瓦片色几乎并拢，层次差没了。这是本项目对范式的唯一一处偏离，理由是本图标的字形元素比领奖台/秤台更小（要分给三个元素），需要更高的对比度托底。

最终字形：**左满色块 = 输入目录，中间三角 = 单向，右 `.55` 块 = 输出目录的镜像副本**。

## 3. 图标工具链

单一真源：`src-tauri/icons/icon.svg`。18 个产物全部由 `scripts/gen-icons.mjs` 生成。

**脚本两步分工**：

1. 本脚本只把 SVG 渲成一张 1024 PNG（sharp）
2. 其余 17 个尺寸 + `.ico` + `.icns` 交给 `tauri icon`

为什么不自己拼 ico/icns：Windows 的 `.ico` 是多尺寸容器、macOS 的 `.icns` 有自己的封装格式，自己实现没有收益，而 Tauri CLI 本来就带着实现。

两个实现细节：

- **不给 sharp 设 `density`**。SVG 自身声明了 `width/height` 1024，sharp 直接按这个尺寸矢量渲染，边缘是精确的。设 density 会在 1024 之上再乘一个 dpi 倍率（首次实现设了 2048，等于渲 28672px），撑爆像素上限。
- **删掉 `tauri icon` 副产的 `android/` `ios/` 目录**。本项目只出桌面端，留着会被误认为支持移动端。

为什么留脚本而不是手工导出：18 个产物手工导出必然漂移——改一次 SVG 忘了重导某个尺寸，任务栏和标题栏就会长得不一样。

新增开发依赖 `sharp`（与 MyAsset / 影游志的 `gen-icons.mjs` 同一做法）。

## 4. 改名 MirrorSync

改**显示名**：

| 位置 | 旧 | 新 |
|---|---|---|
| `tauri.conf.json` `productName` | 目录同步工具 | MirrorSync |
| `tauri.conf.json` 窗口 `title` | 目录同步工具 | MirrorSync |
| `Cargo.toml` `description` | 目录同步工具 | MirrorSync · 目录单向镜像 |
| `App.tsx` 页面 h1 | 目录同步 | MirrorSync |
| `README.md` 标题 | 目录同步工具（File Sync） | MirrorSync · 目录单向镜像 |

**一律不动**：`identifier`（`com.leili.filesync`）、Cargo `name`、npm `name`。

`identifier` 是硬约束：它决定 `appConfigDir` 的落盘路径，改了等于换了一个应用，用户已有的目录对配置会全部丢失。Cargo / npm 的包名不动则是为了让显示名与代码里的名保持同一语系（`file-sync` ↔ MirrorSync 都是 mirror/sync 语义），避免「显示名和仓库名完全对不上」。

选 MirrorSync 而不是 Syncline / Mirrorfold / Echo：与 identifier 同语系是决定性理由；且 Mirror 点出单向，比 Sync 单用准确——本工具的实际逻辑是仅新增/更新、不删除输出目录多余文件，是镜像不是双向同步。

h1 用 `font-display`（Fraunces），英文名在这套衬线字体下表现好于中文名——这是改英文名的附带收益，不是理由。header 上方的小标签「本地 · 单向镜像」保留，正好补足 MirrorSync 的中文释义。

## 5. 顺带清掉的脚手架残留

改名时发现 `index.html` 三处从未改过的脚手架内容，属同一件事的范围内：

- `<title>Tauri + React + Typescript</title>` → `MirrorSync`
- `lang="en"` → `lang="zh-CN"`（界面全中文）
- favicon 指向 `/vite.svg` → `/favicon.svg`（由 `gen-icons.mjs` 从同一个 `icon.svg` 复制，保持单一真源）

删除无人引用的 `public/vite.svg`、`public/tauri.svg`。

Tauri 窗口图标走 bundle 配置、不看 favicon，但 `npm run dev` 起的页面看——留着 Vite 默认图标会误导。

## 6. 版本

0.2.0 → 0.3.0，四处同步：`package.json` / `package-lock.json` / `src-tauri/Cargo.toml` / `src-tauri/Cargo.lock` / `src-tauri/tauri.conf.json`。

## 7. 影响文件

```
src-tauri/icons/icon.svg        新增 · 唯一真源
src-tauri/icons/*.png|ico|icns  重新生成（18 个，含新增的 64x64.png）
scripts/gen-icons.mjs           新增
public/favicon.svg              新增 · 由 icon.svg 复制
public/vite.svg                 删除 · 脚手架残留
public/tauri.svg                删除 · 脚手架残留
index.html                      title / lang / favicon
src-tauri/tauri.conf.json       productName / title / version
src-tauri/Cargo.toml            description / version
src-tauri/Cargo.lock            version
package.json                    version / 新增 devDep sharp
package-lock.json               同上
src/App.tsx                     h1 文案
README.md                       标题
docs/*.md → docs/设计方案/*.md   已有两篇设计方案迁入子目录
```

`src-tauri/src/` 一行不动。布局、交互、同步逻辑一行不动。

## 8. 验证

```bash
# 1 类型检查 + 构建
cd D:/Projects/Personal/File_Sync && npx tsc --noEmit && npm run build

# 2 设计系统闸门：确认新增的 icon.svg 不触发第 5 条「无颜色字面量」
cd D:/Projects/Personal/design-system && node scripts/check-tokens.mjs

# 3 图标可重复生成（改完 SVG 跑这一条即可，18 个产物全部刷新）
cd D:/Projects/Personal/File_Sync && node scripts/gen-icons.mjs

# 4 真机
cd D:/Projects/Personal/File_Sync && npm run tauri dev
```

实测结果：1 通过（构建 1.83s）；2 File_Sync 四项全绿——`icon.svg` 里的 `#0c6d5f` 不触发色值断言，与其他项目的 `favicon.svg` 同等待遇，在扫描范围外；3 通过；dev 页面目视确认 Fraunces 下的 MirrorSync 完整无裁切，标签页标题正确。

真机需目视：标题栏图标、任务栏图标、开始菜单项名称、`%APPDATA%` 下配置路径未变（`com.leili.filesync`，老配置仍能读出）。

## 9. 不纳入本次范围

- **深色模式下的图标变体**。主题是 `scheme: 'light'`，且桌面图标不跟随应用主题。
- **移动端图标**。本项目只出桌面端，`tauri icon` 生成的 android/ios 目录已删除。
- **中文应用名**。显示名全面英文化，不做中英双名。
- **同步逻辑、布局、交互**。
