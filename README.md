# 🎬 Nexus Player Pro - 现代全平台全网影视播放器 (Win / Mac / Android)

> **基于 Electron 29 + Vue 3 + Vite + ArtPlayer 5 + HLS.js + Capacitor 构建的高性能全平台桌面与移动端播放器。**

[![Version](https://img.shields.io/badge/version-1.0.0-6366f1.svg)](README.md)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Android-blue.svg)](README.md)
[![Electron](https://img.shields.io/badge/Electron-29.1.5-9061f9.svg)](README.md)
[![Vue](https://img.shields.io/badge/Vue-3.4-42b883.svg)](README.md)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](README.md)

---

## ⚡ 多端打包产物一览

本项目支持 **Windows 单文件绿色独立版**、**macOS 绿色包** 以及 **Android 安卓 APK 安装包**，无需繁琐安装向导，解压或双击即开即用！

| 运行平台 | 应用类型 | 特性说明 | 直接打开/文件路径 |
| :--- | :--- | :--- | :--- |
| **Android (安卓)** | **手机安装包 (.apk)** | 推荐！安卓手机/平板专用版本，全局 16:9 手机屏无折叠适配，含炫彩 Logo | 📱 [`android/app/build/outputs/apk/debug/NexusPlayer-1.0.apk`](file:///D:/wwwroot/pc_player/android/app/build/outputs/apk/debug/NexusPlayer-1.0.apk) |
| **Windows 64位** | **单文件绿色独立版 (.exe)** | 推荐！单个 `.exe` 文件，随身 U 盘双击即开即用 | 🚀 [`release/NexusPlayer-1.0.0-win-portable.exe`](file:///D:/wwwroot/pc_player/release/NexusPlayer-1.0.0-win-portable.exe) |
| **Windows 64位** | **绿色免安装文件夹** | 解压即用目录，启动极快，运行稳定 | 📂 [`release/win-unpacked/NexusPlayer.exe`](file:///D:/wwwroot/pc_player/release/win-unpacked/NexusPlayer.exe) |
| **macOS (Mac)** | **苹果 Mac 绿色包 (.zip/.dmg)** | 支持 Intel 及 M 系列芯片，原生跨平台构建 | 🍎 [查看 macOS 客户端打包说明](#-macos-苹果客户端打包说明) |

---

## 🔥 核心特色功能

### 1. ❤️ 追番 (收藏) 与 🕒 观看记录面板
- **即时响应追番**：在影片详情侧边栏提供 `💖 已追番` / `❤️ 追番` 按钮，集成 Vue 3 响应式依赖，状态毫秒级即时切换。
- **看至百分比**：观看历史自动保存播放进度（如 `已看至 14:20 / 24:00 (75%)`）与上次观影时间。
- **⏩ 断点自动续播**：从追番或历史记录点击剧集，播放器**自动 seek 跳转到上次暂停/观看到的时间点**，并弹出浮层提醒。

### 2. 📱 手机端 16:9 黄金比例自适应 (格局清晰分明)
- **全局自适应布局**：在移动端/手机窄屏下自动切换为**上下单列布局**。
- **隐藏重复页头**：移动端自动隐去内部重复页头，播放器呈现标准的 **16:9 黄金比例**。
- **格局分明**：播放器顶部置顶，选集网格、线路 Tab、简介面板有序错落，绝不重叠挤压，手感顺滑。

### 3. 🌐 全网多源并发故障转移 (Auto Failover)
- **多源线路自动补全**：选中任何影片时，自动并发聚合**量子专线 (💎)**、**光速专线 (✨)**、**非凡专线 (⚡)**。
- **无限自动切线**：当某条线路超时或破损时，自动毫秒级无感切换至下一备用专线，全线路无限轮询，绝不卡死。

### 4. 🪟 原生级无边框桌面交互 (Frameless Desktop UI)
- **精致无边框窗口**：开启 `frame: false`，结合现代 Glassmorphism 毛玻璃渐变设计。
- **自定义桌面标题栏 (`TitleBar.vue`)**：支持全屏按住拖拽、**双击空白处最大化/还原窗口**。
- **📌 窗口置顶 Toggle**：一键锁定播放窗口处于系统最前端，追剧办公两不误。

### 5. 🎵 终极音频引擎：零重音与高保真抗沙哑 (Anti-Echo & Pitch Preservation)
- **彻底消除重音/声音叠加**：拦截 HTML5 `<video>` 默认 `src` 竞态赋值，由 `Hls.js` 独占控制 `MediaSource`；建立原子级强力销毁机制。
- **彻底消除声音沙哑/破音**：调校 `Hls.js` 缓冲区参数（`maxBufferHole: 0.1`）、`maxAudioFramesDrift: 1`。

---

## 📱 Android (安卓) APK 打包指南 (途径 A)

项目中已内置了移动端打包引擎 **Capacitor** 配置文件 [`capacitor.config.json`](file:///d:/wwwroot/pc_player/capacitor.config.json)。

### 1. 一键同步并编译 APK
在项目根目录运行：
```bash
# 1. 构建 Vite 前端静态资源
pnpm run build

# 2. 同步资源至 Android 原生工程
pnpm run cap:sync

# 3. 命令行一键打包 Android APK
cd android
./gradlew assembleDebug
```

编译完成后，生成的 APK 安装包存储在：
`android/app/build/outputs/apk/debug/NexusPlayer-1.0.apk`

---

## 🛠️ 本地桌面端编译命令

```bash
# 1. 启动前端 + Electron 桌面热更新开发环境
pnpm run electron:dev

# 2. 打包 Windows 单文件绿色免安装版 (.exe)
pnpm run build:win

# 3. 打包 macOS 苹果客户端 (.zip/.dmg) - 需在 Mac 电脑或云端运行
pnpm run build:mac

# 4. 一键打包双平台绿色包
pnpm run build:all
```

---

## 🍎 macOS 苹果客户端打包说明

根据 **Electron-Builder 规范**，macOS 应用程序（`.dmg` 镜像与 `.app` 绿色包）需要依赖苹果 macOS 原生系统工具（`hdiutil`）。

- **本地打包**：在 Mac 电脑上运行 `pnpm run build:mac` 即可在 `release/` 目录打出 `.app.zip` 和 `.dmg`。
- **云端打包**：项目已配置 GitHub Actions 自动打包工作流 [`.github/workflows/build.yml`](file:///D:/wwwroot/pc_player/.github/workflows/build.yml)，代码 Push 推送至 GitHub 后将自动为您打出 Windows 与 macOS 绿色包。

---

## 📁 规范的项目结构

```
pc_player/
├── .github/
│   └── workflows/
│       └── build.yml      # GitHub Actions 跨平台 (Win/Mac) 云端自动打包工作流
├── android/               # Capacitor 安卓原生工程目录
│   └── app/build/outputs/apk/debug/
│       └── NexusPlayer-1.0.apk  # 编译打包生成的安卓 APK 安装包
├── build/                 # 应用品牌图标资源 (icon.ico / icon.png)
├── capacitor.config.json  # Capacitor 安卓 APK 移动端打包配置文件
├── electron/              # Electron 主进程与 IPC 层 (main.js / preload.js)
├── src/                   # Vue 3 前端渲染进程
│   ├── components/
│   │   ├── TitleBar.vue   # 现代桌面无边框标题栏 (Logo、拖拽、双击最大化、置顶)
│   │   ├── UserLibraryModal.vue # 追番与历史记录抽屉弹窗组件
│   │   └── PlayerView.vue # ArtPlayer 5 + Hls.js 播放器 (断点自动续播)
│   ├── services/
│   │   ├── userLibraryService.ts # 追番与历史记录 LocalStorage 数据持久化服务
│   │   └── videoService.ts # 跨平台数据请求 (CapacitorHttp 原生隔离) 与多源自动切线
│   └── App.vue            # 主界面 (TitleBar、导航栏、追番侧边栏按钮、手机端全屏 16:9 自适应)
├── release/               # 桌面打包产物目录 (NexusPlayer-1.0.0-win-portable.exe)
├── package.json           # 依赖配置与构建脚本
└── README.md              # 本说明文档
```
