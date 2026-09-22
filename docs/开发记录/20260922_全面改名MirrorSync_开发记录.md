# 全面改名 MirrorSync 开发记录

**开发周期**: 2026-09-22
**文档创建时间**: 2026-09-22
**作者**: Leili + Claude Code
**主题**: 把 File_Sync → MirrorSync 的改名从「只改显示名」推进到标识符层面全部替换干净

---

## 1. 背景

2026-09-22 早些时候的 `8c85210` 已经把应用改名 MirrorSync，但那一轮**只动了显示层**：
`productName`、窗口标题、README 标题。所有标识符仍是 File_Sync 系：

| 层面 | 改名前状态 |
|---|---|
| GitHub 仓库 | `MonkeyDTH/File_Sync` |
| npm / Cargo 包名 | `file-sync` |
| Rust lib 名 | `file_sync_lib` |
| Tauri identifier | `com.leili.filesync` |
| design-system theme id | `file-sync` |
| 本地目录 | `D:\Projects\Personal\File_Sync` |

当时刻意不改，理由写在 `20260922_品牌图标与应用改名MirrorSync设计方案.md` 里：identifier
决定配置落盘路径，改了等于换一个应用，用户已有的目录对配置会全部丢失。

本轮用户明确要求「全部替换，用户我让他重新设置就好」——即接受配置丢失的代价，
把改名做彻底。

## 2. 结论先行

**改名的成本不在替换字符串，在两个点上：**

| 点 | 性质 | 本次处置 |
|---|---|---|
| `identifier` | 它是 `appConfigDir` 的键，不是一个名字 | 改（用户接受老配置失效） |
| `src/theme.css` 的 id | 它是 design-system 的**生成物**，不是源码 | 回到源头改 `tokens.config.mjs` 并重新生成 |

第二点是最容易做错的地方：直接改项目里的 `theme.css` 看起来立刻生效，但下一次任何人跑
`build-tokens.mjs` 就会覆盖回 `file-sync`。改名这类任务必须先分清**哪些文件是源、哪些是产物**，
只改源。

另一个本轮才暴露的结论：**目录改名这件事，运行在该目录里的工具自己做不到**。详见第 4 节。

## 3. 设计决策记录

### 3.1 新 id 用 `mirror-sync` 而不是 `mirrorsync`

design-system 现有 7 个 theme 文件全是 kebab-case，且规则是「驼峰项目名拆 kebab」：
`MyAsset` → `my-asset`、`GameCompany` → `game-company`、`WeightRecorderWeb` → `weight-recorder`。
`MirrorSync` 按同一条规则拆成 `mirror-sync`，跟已有 7 个保持同构，不为一个项目开特例。

npm / Cargo 包名同步用 `mirror-sync`（原本就是 `file-sync` 这种 kebab 形式），Rust lib 名
`mirror_sync_lib`（Cargo 的 lib 名不允许连字符）。

### 3.2 identifier 用 `com.leili.mirrorsync`（不带连字符）

反域名标识符的惯例是不用连字符，且原值 `com.leili.filesync` 本来就是无分隔形式，保持一致。

### 3.3 推翻上一轮「包名不动」的判断

上一轮的理由是「让显示名与代码里的名保持同语系（`file-sync` ↔ MirrorSync 都是 mirror/sync 语义）」。
这条理由在「只改显示名」的前提下成立，但用户本轮要的是彻底统一，前提变了，理由随之失效。
两处名字对不上带来的长期认知成本，大于一次性改名的成本。

## 4. 踩坑记录

### 坑 1：本地目录改不了名，"being used by another process"

**现象**：

```
Rename-Item D:\Projects\Personal\File_Sync -NewName MirrorSync
FAILED: The process cannot access the file because it is being used by another process.
```

**错误尝试**：

1. 以为是残留的 `node` 进程（vite dev server）占用 → 查 `Win32_Process` 列出全部 6 个 node
   进程的命令行，没有一个指向 File_Sync，排除
2. 以为是 Zed 编辑器打开了该项目 → 查 Zed 进程命令行，它开的是
   `D:\Projects\X\CharacterVoice\vocoflow`，排除
3. 以为 `mcp__ccd_directory__change_directory` 把会话切到父目录就能解锁 → 切了，仍然失败

**定位方法**（这步值得复用）：测试**子目录**能不能改名——

```powershell
Rename-Item "...\File_Sync\scripts" "scripts_t"   # 成功
```

子目录可改、顶层不可改，说明不是文件句柄占用（那样子目录也会锁），而是**某个进程把顶层目录
当作工作目录（cwd）**。Windows 不允许重命名任何进程的 cwd。

**真正原因**：占用者就是本次会话的 Claude Code 进程自己。`change_directory` 改的是会话的
**逻辑**工作目录（后续工具调用的路径解析基准），改不了宿主 node 进程的 **OS 级 cwd**。

**最终处置**：由用户在会话之外手动改名，随后在新路径下验证全部通过（见第 5 节）。

**教训**：**运行在某目录里的工具，改不了自己脚下的目录**。这类任务的正确收尾方式是：把目录内
所有内容改完、提交，然后由人在会话之外执行改名。排查「目录被占用」时，先用子目录改名测试
区分「句柄占用」和「是某进程的 cwd」，能省掉逐个进程排查的时间——但要注意这个测试只能告诉你
锁的**类型**，告诉不了你是**哪个**进程：本次查遍 node / Zed / explorer / PowerShell 会话都
不是，最后也没定位到具体进程，直接由人在外部改名更省时间。持久 shell（Bash 工具的工作目录跨
调用保持）也是一个容易被忽略的 cwd 持有者，排查时记得先把它切走。

### 坑 2：design-system 的 README 状态表是错的（存量问题，本次顺带修正）

改 theme id 时发现 `design-system/README.md` 的项目状态表里这一行：

```
| File_Sync | sky | 浅 | 延后 | 延后 |
```

而实际情况是它 2026-09-22 就已接入、品牌色族改判 teal、是 Tailwind 项目。「尚未完成」章节
第 1、2 条也仍把它列为延后项目。

**原因**：上次接入时改了 `tokens.config.mjs`，但 README 里的状态表和「尚未完成」清单是手写的
第二份副本，没跟着改。

**教训**：状态类信息一旦有两份副本（config 一份、README 一份），就一定会漂移。这次先人工改对，
根治要么让 README 的状态表从 config 生成，要么删掉表只留指向 config 的链接。已记入未完成事项。

### 坑 3：目录改名后必须 `cargo clean`，否则编译报「系统找不到指定的路径」

**现象**：目录改名完成后第一次 `cargo check`：

```
failed to read plugin permissions: failed to read file
'\\?\D:\Projects\Personal\File_Sync\target\debug\build\tauri-.../permissions/app/.../app_hide.toml':
系统找不到指定的路径。 (os error 3)
```

**原因**：Cargo 的构建缓存（尤其 tauri-build 生成的权限文件索引）里存的是**绝对路径**，
目录一改全部失效。报错信息里还写着旧路径 `File_Sync`，很容易误以为是哪里没替换干净。

**处置**：`cargo clean` 后重编即可（本次清掉 9979 个文件 / 7.7 GiB，重编 49.01s）。

**教训**：Rust 项目换目录 = 必须 `cargo clean`。看到报错里出现已经不存在的旧路径，先想缓存，
不要去搜代码里的残留字符串。

### 坑 4：Cargo.lock 改包名后需要 cargo 自己重排

`Cargo.lock` 里的 `[[package]]` 条目按名字字母序排列，手改 `name = "file-sync"` →
`"mirror-sync"` 后位置就不对了。跑一次 `cargo check` 会自动重排（本次 diff 14 增 14 删，
就是这个位移），不用手工调整，但**必须跑一次**再提交，否则下次任何 cargo 命令都会产生噪音 diff。

## 5. 主要变更

### MirrorSync 仓库（3 个 commit）

- `69425e3`：npm / Cargo 包名、Rust lib 名、Tauri identifier、launch.json 配置名全部改到
  mirror-sync 系；README 补仓库地址与 design-system 说明，构建产物名改为
  `MirrorSync_<version>`——**版本号不再写死**，原来写死的 `0.1.0` 在版本升到 0.3.0 后就成了
  错误信息，而上一个 commit `b5bb686` 刚把版本号收敛到 `package.json` 单一真源，README 再写
  一份等于又开副本
- `c673366`：同步 design-system 重新生成的主题产物

remote 由 `MonkeyDTH/File_Sync` 改为 `MonkeyDTH/MirrorSync`（GitHub 侧改名由用户在网页完成），
`git ls-remote` 验证可达。

### design-system 仓库（1 个 commit）

- theme / consumer 的 `id` → `mirror-sync`、`label` → `MirrorSync`、`dir` → 新路径
- `themes/file-sync.css` 重新生成为 `themes/mirror-sync.css`
- README 修正第 4 节坑 2 所述的陈旧状态

### 会话外配置

- `sync-docs` 的 `project-map.json`：key 由 `File_Sync` 改为 `MirrorSync`
- Obsidian 笔记目录 `应用开发/File_Sync/` → `应用开发/MirrorSync/`，笔记内补改名说明与
  「升级后需重新设置目录对」提醒

### 验证结果

改名前（旧路径）与目录改名后（新路径）各验证一轮：

| 项 | 结果 |
|---|---|
| `npx tsc --noEmit` | 通过（两轮） |
| `npm run build` | 通过，1.95s / 1.98s / 1.95s |
| `cargo check` | 旧路径 43.34s 通过；新路径首次因缓存失效报错，`cargo clean` 后 49.01s 通过，输出 `Compiling mirror-sync v0.0.0 (D:\Projects\Personal\MirrorSync\src-tauri)` |
| `git ls-remote origin` | 通过，返回 `refs/heads/main` |
| `sync-tokens.ps1 -Only mirror-sync` | 目录改名后 5 项全绿（tokens / theme / tailwind / fonts.css / fonts/），印证新 id 与新路径在 design-system 侧完全对上 |

theme.css 本次只有注释头和 id 变化，色值零变化（品牌色族仍是 teal），构建产物 CSS 哈希
`index-6KbSDeaw.css` 前后一致，可反向印证。

## 6. 未完成 / 搁置事项

| 事项 | 说明 |
|---|---|
| 两个仓库的 push | **待办**。共 4 个 commit 未推送 |
| design-system README 状态表的副本问题 | **搁置**。本次人工改对了，根治（从 config 生成或删表留链接）需要动 README 的组织方式，不在本次范围 |
| 老用户配置迁移 | **有意不做**。identifier 变更导致 `appConfigDir` 路径改变，老配置读不到。用户明确选择「让他重新设置」，不写迁移逻辑——只有单一用户，迁移代码的成本大于收益 |

## 7. 给后续对话的提示

1. **`src/theme.css` 和 `src/tokens.css` 是 design-system 的生成物，不要直接改**。要改回到
   `D:/Projects/Personal/design-system/tokens.config.mjs`，改完跑 `node scripts/build-tokens.mjs`
   重新生成，再分发到本项目。文件头部的注释里也写了这句。
2. **identifier 已经改过一次，不要再改**。`com.leili.mirrorsync` 现在是配置落盘路径的键，
   再改一次又会丢一次配置。
3. 已证伪、不用再试的方向：想在会话内改掉项目根目录的名字——进程 cwd 锁死，`change_directory`
   也解不开（第 4 节坑 1）。
4. 版本号的单一真源是 `package.json` 的 `version`，`tauri.conf.json` 通过
   `"version": "../package.json"` 引用，`Cargo.toml` 刻意不写 version。改版本用
   `npm version x.y.z --no-git-tag-version`，**不要在任何文档或配置里再写一份具体版本号**。

---

*本次开发由 Claude Code 辅助完成，人工审核所有代码变更。调试期间的临时脚本已清理。*
