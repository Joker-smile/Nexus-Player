# 🎬 Nexus Player Desktop Pro - 现代桌面全网影视播放器

> **基于 Electron 29 + Vue 3 + Vite + ArtPlayer 5 + HLS.js 构建的高性能、暗黑科技风无边框桌面播放器。**

[![Version](https://img.shields.io/badge/version-1.0.0-6366f1.svg)](README.md)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS-blue.svg)](README.md)
[![Electron](https://img.shields.io/badge/Electron-29.1.5-9061f9.svg)](README.md)
[![Vue](https://img.shields.io/badge/Vue-3.4-42b883.svg)](README.md)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](README.md)

---

## ⚡ 绿色免安装版快速使用

本软件打出的绿色版**双击即开即用，不写系统注册表、不产生系统垃圾**，适合随身放入 U 盘使用。

| 运行平台 | 软件类型 | 特性描述 | 打开/下载路径 |
| :--- | :--- | :--- | :--- |
| **Windows 64位** | **单文件绿色独立版 (.exe)** | 推荐！单个 `.exe` 文件，随时移动双击打开 | 🚀 [`release/NexusPlayer-1.0.0-win-portable.exe`](file:///D:/wwwroot/pc_player/release/NexusPlayer-1.0.0-win-portable.exe) |
| **Windows 64位** | **绿色免安装文件夹** | 解压即用目录，启动速度快，运行稳定 | 📂 [`release/win-unpacked/NexusPlayer.exe`](file:///D:/wwwroot/pc_player/release/win-unpacked/NexusPlayer.exe) |
| **macOS (Mac)** | **苹果 Mac 绿色包 (.zip/.dmg)** | 支持 Intel 及 M 系列芯片 | 🍎 [查看 macOS 客户端打包说明](#-macos-苹果客户端打包说明) |

---

## 🔥 核心特色功能

### 1. 🪟 原生级无边框桌面交互 (Frameless Desktop App)
- **精致无边框窗口**：主窗口采用 `frame: false`，结合现代 Glassmorphism 毛玻璃渐变设计。
- **自定义桌面标题栏 (`TitleBar.vue`)**：支持全屏按住拖拽、**双击空白处最大化/还原窗口**。
- **桌面专属控制按钮**：
  - 📌 **窗口置顶 Toggle**：一键锁定播放窗口处于系统最前端，追剧办公两不误。
  - ➖ 最小化 / 🗖 最大化与还原 / ✕ 关闭应用。
- **安全 IPC 进程交互**：基于 `electron/preload.js` 与 `contextBridge` 安全暴露 `electronAPI`。

### 2. 🎵 终极音频引擎：零重音与高保真抗沙哑 (Anti-Echo & Pitch Preservation)
- **彻底消除重音/声音叠加**：
  - 拦截 HTML5 `<video>` 默认 `src` 竞态赋值，确保由 `Hls.js` 独占控制 `MediaSource`。
  - 建立**原子级播放器销毁机制**（`hlsInstance.stopLoad()` -> `hlsInstance.detachMedia()` -> `video.pause()` -> `video.removeAttribute('src')` -> `video.load()`），100% 避免切换剧集/线路时后台声音残留。
- **彻底消除声音沙哑/破音/失真**：
  - 调校 `Hls.js` 缓冲区参数：`maxBufferHole: 0.1` (极限填补 100ms 丢包空隙)、`maxAudioFramesDrift: 1` 锁死音频帧漂移。
  - Electron 注入底层 Chromium 高保真音频开关：`no-user-gesture-required` 与 `disable-features=AudioServiceOutOfProcess`。

### 3. ⌨️ 全套桌面播放快捷键与音量偏好记忆
- `Space`（空格）：播放 / 暂停切换
- `←` / `→`：快退 5 秒 / 快进 5 秒
- `↑` / `↓`：音量调大 / 调小 10%
- `F`：一键开启 / 退出全屏
- `Esc`：退出全屏 / 关闭播放侧边栏
- **音量记忆**：自动记录您喜爱的音量级别并在下次打开时自动恢复。

### 4. 💎 专线极速播放与 1.2 秒自动故障转移 (Auto Failover)
- **多条蓝光高清专线**：动态解析并映射为 `💎 量子专线`、`✨ 光速专线`、`⚡ 非凡专线`、`🌀 暴风专线` 等。
- **自动切线**：当前线路连接超时（>10s）或遇到资源失效时，**1.2 秒内自动无感切换至下一备用线路**。

### 5. 🌊 瀑布流预加载 3 页 (120+ 资源) 与分段选集
- **并发预加载**：初始化时后台并发请求前 3 页数据，首页瞬时呈现 **120+ 部最新影视资源**。
- **50 集分段选集**：百集以上长篇动画/电视剧自动按每 50 集分段切片 Tab（`1-50`, `51-100`），网格支持整齐定高渲染，彻底杜绝打包后字压字重叠。

---

## 🛠️ 本地开发与编译命令

```bash
# 1. 安装项目依赖
pnpm install

# 2. 启动前端 + Electron 桌面热更新开发环境
pnpm run electron:dev

# 3. 构建 Vite 前端静态产物
pnpm run build

# 4. 打包 Windows 单文件绿色免安装版 (.exe) 及免安装解压包
pnpm run build:win

# 5. 打包 macOS 苹果客户端 (.zip/.dmg) - 需在 Mac 电脑或云端运行
pnpm run build:mac

# 6. 一键多平台打包
pnpm run build:all
```

---

## 🍎 macOS 苹果客户端打包说明

由于 **Electron-Builder** 机制限制，macOS 应用程序（`.dmg` 镜像与 `.app` 绿色包）需要依赖苹果 macOS 原生系统工具（`hdiutil`）。

- **本地打包**：在 Mac 电脑上运行 `pnpm run build:mac` 即可在 `release/` 目录打出 `.app.zip` 和 `.dmg`。
- **云端打包**：项目已配置 GitHub Actions 自动打包工作流 [`.github/workflows/build.yml`](file:///D:/wwwroot/pc_player/.github/workflows/build.yml)，代码 Push 推送至 GitHub 后将自动为您打出 Windows 与 macOS 绿色包。

---

## 📁 规范的项目结构

```
pc_player/
├── .github/
│   └── workflows/
│       └── build.yml      # GitHub Actions 跨平台 (Win/Mac) 云端自动打包工作流
├── build/                 # 应用品牌图标资源 (icon.ico / icon.png)
├── electron/              # Electron 主进程与 IPC 层
│   ├── main.js            # 主窗口创建、无边框配置、Chromium 底层音频优化
│   └── preload.js         # 安全 contextBridge 进程通信桥梁 (electronAPI)
├── src/                   # Vue 3 前端渲染进程
│   ├── components/
│   │   ├── TitleBar.vue   # 现代桌面无边框标题栏 (Logo、拖拽、双击最大化、最小化/关闭/置顶)
│   │   └── PlayerView.vue # ArtPlayer 5 + Hls.js 终极播放器核心组件 (防重音/防沙哑/音量记忆)
│   ├── services/
│   │   └── videoService.ts# API 数据对接、专线名称映射与并发预加载
│   ├── types/
│   │   └── video.ts       # TS 数据模型与接口定义
│   ├── App.vue            # 主界面 (TitleBar、导航栏、瀑布流选集网格)
│   ├── main.ts            # Vue 3 入口
│   └── style.css          # 全局 CSS 变量与设计系统
├── release/               # 打包编译产物目录
│   ├── NexusPlayer-1.0.0-win-portable.exe # Windows 64位单文件绿色独立版
│   └── win-unpacked/      # Windows 64位解压即用文件夹
├── package.json           # 依赖配置与 Electron-Builder 构建脚本
├── vite.config.ts         # Vite 构建与 Rollup 静态分包配置
└── README.md              # 项目说明文档
```
