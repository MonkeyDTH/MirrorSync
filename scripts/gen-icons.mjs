// 从 src-tauri/icons/icon.svg 生成全套应用图标。改完 SVG 跑一次：node scripts/gen-icons.mjs
//
// 分两步：本脚本只把 SVG 渲成一张 1024 PNG，其余 17 个尺寸 + ico + icns 交给
// `tauri icon` —— Windows 的 .ico 是多尺寸容器、macOS 的 .icns 有自己的封装格式，
// 自己拼这两个格式没有收益，而 Tauri CLI 本来就带着实现。
//
// 为什么留脚本而不是手工导出：图标有 18 个产物，手工导出必然漂移
// （改一次 SVG 忘了重导某个尺寸，任务栏和标题栏就会长得不一样）。
import sharp from "sharp";
import { execFileSync } from "node:child_process";
import { copyFile, readFile, writeFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SVG = join(ROOT, "src-tauri", "icons", "icon.svg");
const SEED = join(ROOT, "src-tauri", "icons", "icon.png");

// 不设 density：SVG 自身声明了 width/height 1024，sharp 直接按这个尺寸矢量渲染，
// 边缘是精确的。设 density 反而会在 1024 之上再乘一个 dpi 倍率，撑爆像素上限。
const png = await sharp(await readFile(SVG))
  .resize(1024, 1024)
  .png({ compressionLevel: 9 })
  .toBuffer();
await writeFile(SEED, png);
console.log(`1024×1024 种子图  ${(png.length / 1024).toFixed(1)} KB`);

execFileSync("npx", ["tauri", "icon", SEED], { cwd: ROOT, stdio: "inherit", shell: true });

// 本项目只出桌面端，移动端目录是 tauri icon 的副产物，留着会被误认为支持 Android / iOS
await Promise.all(
  ["android", "ios"].map((d) =>
    rm(join(ROOT, "src-tauri", "icons", d), { recursive: true, force: true }),
  ),
);
// 开发时浏览器标签页的 favicon。Tauri 窗口图标走 bundle 配置，不看这个文件，
// 但 npm run dev 起的页面看，留着 vite 默认图标会误导。
await copyFile(SVG, join(ROOT, "public", "favicon.svg"));

console.log("完成");
