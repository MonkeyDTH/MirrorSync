# MirrorSync · 目录单向镜像

> 仓库地址：https://github.com/MonkeyDTH/MirrorSync

一个基于 Tauri + React 开发的 Windows 桌面小工具，用于维护多组「输入目录 → 输出目录」的目录对，一键将输入目录的新增/更新文件同步到输出目录（不会删除输出目录中已有的其他文件）。

## 功能特性

- 添加/编辑/删除多个目录对，支持备注名，通过系统文件夹选择器选取目录
- **子目录范围可选**：每个目录对可单独设置是否作用于所有子目录（默认关闭，仅同步该目录下第一层的文件）
- 勾选任意多个目录对批量同步，支持全选/取消全选
- **仅新增/更新同步**：增量复制输入目录中新增或有变化的文件，输出目录中原有的其他文件保持不变
- 同步过程实时展示进度（当前文件、进度条），完成后展示复制/跳过数量、耗时及错误详情
- 目录对配置与勾选状态自动持久化，重启应用后自动恢复

## 技术栈

- [Tauri 2](https://tauri.app/)（Rust 后端，负责文件系统遍历与同步）
- React + TypeScript + Vite
- Tailwind CSS 4 + shadcn 风格组件（Radix UI Primitives）
- 跨项目 design-system（品牌色族 teal，主题产物落在 `src/tokens.css` / `src/theme.css`）

## 环境要求

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://www.rust-lang.org/tools/install)（stable 工具链）
- Windows 桌面开发环境（[Tauri 官方前置依赖](https://tauri.app/start/prerequisites/)，需安装 WebView2 运行时，Win11 一般已内置）

## 安装与启动

```bash
# 安装前端依赖
npm install

# 开发模式启动（同时拉起 Vite 与 Tauri 窗口）
npm run tauri dev
```

## 打包构建

```bash
npm run tauri build
```

构建产物（安装包/可执行文件）位于项目根目录的 `target/release/bundle/` 下：

```
target/release/bundle/msi/MirrorSync_<version>_x64_zh-CN.msi   # MSI 安装包
target/release/bundle/nsis/MirrorSync_<version>_x64-setup.exe  # NSIS 安装包
```

> `<version>` 取自 `package.json` 的 `version` 字段——它是版本号的单一真源，`tauri.conf.json` 通过 `"version": "../package.json"` 引用它，不要在别处重复维护。

### 发布 Release（自动构建）

推送 `v*` tag 即触发 [.github/workflows/release.yml](.github/workflows/release.yml)：在 GitHub Actions 的 Windows 环境构建，并把上面两个安装包发布到仓库的 Releases 页面。

```bash
npm version 0.3.1 --no-git-tag-version   # 改版本号
git commit -am "chore: 发布 v0.3.1"
git tag v0.3.1
git push origin main v0.3.1
```

> tag 必须与 `package.json` 的版本一致，否则流水线会在第一步报错退出。安装包未做代码签名，首次运行时 Windows SmartScreen 会提示"未知发布者"，点"更多信息 → 仍要运行"即可。

> `target/` 是 Cargo 的编译缓存目录（已通过 `.cargo/config.toml` 从 `src-tauri/target` 移到根目录，并加入 `.gitignore`），体积较大（约 1GB+）属正常现象，可随时用 `cargo clean` 清理，不影响最终安装包（仅几 MB）。

## 项目结构

```
src/                前端代码（React + TypeScript）
  components/         UI 组件（目录对卡片、添加/编辑弹窗、同步日志面板）
  lib/                Tauri 命令调用封装、类型定义
  fonts/              自托管字体（Fraunces 等）
  tokens.css          design-system 生成的设计令牌
  theme.css           design-system 生成的主题（teal 色族）
src-tauri/          Rust 后端
  src/config.rs       目录对配置读写（持久化到本地 JSON）
  src/sync.rs         核心镜像同步算法
  src/commands.rs     暴露给前端的 Tauri 命令
  icons/              应用图标（由 scripts/gen-icons.mjs 从 icon.svg 生成）
scripts/gen-icons.mjs  品牌图标生成脚本
docs/               设计文档
```

> 应用的 `identifier` 为 `com.leili.mirrorsync`（v0.3.0 起由 `com.leili.filesync` 改来，旧版保存的目录对配置不会迁移，需重新添加）。它决定配置文件的落盘路径（`appConfigDir`），**不要再改**，否则已保存的目录对配置会再次丢失。Cargo / npm 包名为 `mirror-sync`。
