# 🎬 Nexus Player PC Pro - 现代全网影视播放器 (绿色版)

> **基于 Electron 29 + Vue 3 + Vite + ArtPlayer 5 + HLS.js 构建的高性能、暗黑科技风桌面影视播放器。**

[![Version](https://img.shields.io/badge/version-1.0.0-6366f1.svg)](README.md)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS-blue.svg)](README.md)
[![Electron](https://img.shields.io/badge/Electron-29.1.5-9061f9.svg)](README.md)
[![Vue](https://img.shields.io/badge/Vue-3.4-42b883.svg)](README.md)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](README.md)

---

## ⚡ 绿色版软件一键直接下载

下载解压即用，**无需安装向导、不写入注册表、不产生系统垃圾文件**，适合随身放入 U 盘使用。

| 运行平台 | 软件类型 | 描述说明 | 直接打开/下载链接 |
| :--- | :--- | :--- | :--- |
| **Windows 64位** | **单文件独立绿色版 (.exe)** | 推荐！单个 `.exe` 文件，双击即开即用 | 🚀 [直接运行 `NexusPlayer 1.0.0.exe`](file:///D:/wwwroot/pc_player/build-release/NexusPlayer%201.0.0.exe) |
| **Windows 64位** | **免安装绿色解压文件夹** | 解压即用文件夹，性能稳定，启动极快 | 📂 [直接打开 `win-unpacked/NexusPlayer.exe`](file:///D:/wwwroot/pc_player/build-release/win-unpacked/NexusPlayer.exe) |
| **macOS (Mac)** | **苹果 Mac 安装包 (.dmg/.zip)** | 依赖 Mac 原生环境构建，支持 M 芯片/Intel | 🍎 [查看 Mac 平台打包编译指引](#-macos-mac-客户端打包编译说明) |

> 📌 **提示**：如果在 Windows 资源管理器中打开，文件位于本项目的 [`build-release/`](file:///D:/wwwroot/pc_player/build-release/) 目录下。

---

## 🔥 核心特色功能

### 1. 💎 专线极速播放与自动故障转移 (Auto Failover)
- **多条高清蓝光专线**：动态解析并映射为 `💎 量子专线 01`、`✨ 光速专线 01`、`⚡ 非凡专线 01`、`🐂 红牛专线 01` 等专线资源。
- **1.2 秒无缝切线**：内置 HLS 网络层与媒体层死锁超时监控，当当前线路响应超时（>10s）或遭遇 404/500 异常时，播放器会在 **1.2 秒内自动、无感切换至下一条备用专线**。

### 2. 🎵 原生音质保真与零重音引擎
- **原生 Pitch 防沙哑/变声**：开启 `preservesPitch` 声音纠偏算法，彻底解决 Chrome 内核变声沙哑、音质失真问题。
- **媒体上下文自动解绑 (Anti-Echo)**：在切换剧集或销毁播放器时，强制执行 `hlsInstance.detachMedia()` 与 `video.pause()` 清空资源，**100% 杜绝背景残留声音与重音/回音现象**。

### 3. 🌊 瀑布流预加载 3 页 (120+ 资源)
- **并发预加载**：初始化加载“最近更新”时，后台并发请求前 3 页数据，首页瞬时呈现 **120+ 部全网最新影视资源**。
- **最近更新专属瀑布流**：在首页视图下启用瀑布流网格，向下滚动触底自动加载第 4 页、第 5 页...无限自动续载。
- **搜索模式隔离**：当进行关键词搜索时，自动切回精细结果网格，避免误触发瀑布流加载。

### 4. 🕒 实时更新标识与分段选集
- **实时更新时间**：卡片信息栏标注精确更新时间（如 `🕒 2026-08-07 10:30`）。
- **最新集数 Badge**：封面右下角高亮显示最新更新集数（如 `更新至第08集` / `全12集`）。
- **50 集分段选集**：针对百集以上的长篇动漫/电视剧，自动按照每 50 集进行分段切片 Tab（如 `1-50`, `51-100`, `101-150`），选集流畅不卡顿。

### 5. 🌌 极致暗黑科技风 Glassmorphic UI
- **专属 Logo 图标**：嵌入全新设计的 3D 霓虹光环播放器 Logo，支持软件图标、标题栏及任务栏展示。
- **Cyber 科技旋转加载动画**：双重反向旋转霓虹光环（`ring-outer` & `ring-inner`），带毛玻璃加记载面板。
- **Shimmer 极光扫屏骨架屏**：首屏与搜索时呈现 1.5 秒循环极光流扫 (`@keyframes shimmer-swipe`) 卡片。
- **Audio Wave 律动波形指示栏**：触底续载时呈现高能 5 轨音频律动指示动画。

---

## 🛠️ 本地开发与编译命令

已在 [`package.json`](file:///D:/wwwroot/pc_player/package.json) 中配置好了全套自动化构建脚本：

```bash
# 1. 安装项目依赖
npm install

# 2. 启动前端 + Electron 桌面热更新开发环境
npm run electron:dev

# 3. 单独构建 Vite 前端网页静态产物
npm run build

# 4. 一键打包 Windows 单文件绿色免安装版 (.exe)
npm run build:win

# 5. 打包 macOS 苹果安装包 (.dmg & .zip) - 需在 Mac 设备上运行
npm run build:mac
```

---

## 🍎 macOS (Mac) 客户端打包编译说明

根据 **Electron-Builder 官方规范**，macOS 应用程序（`.dmg` 镜像与 `.app` 绿色包）的封装需要依赖 macOS 原生系统工具（`hdiutil`）。

在 Mac 电脑或 macOS CI (如 GitHub Actions) 上运行：

```bash
# 进入项目目录并构建
npm run build:mac
```

打包完成后，产物将生成在 `release/` 目录下：
- `NexusPlayer-1.0.0.dmg`（Mac 官方镜像安装包）
- `NexusPlayer-1.0.0-mac.zip`（Mac 免安装绿色压缩包）

---

## 📁 项目工程目录架构

```
pc_player/
├── build/                 # 应用品牌图标资源
│   ├── icon.ico           # Windows 多分辨率应用图标 (16x16 ~ 256x256)
│   └── icon.png           # Mac 高清 Logo 图标
├── electron/              # Electron 主进程代码
│   └── main.js            # 主窗口创建、硬解配置、跨域拦截与外链处理
├── src/                   # Vue 3 前端渲染进程
│   ├── components/
│   │   └── PlayerView.vue # ArtPlayer 5 + Hls.js 音视频播放器核心组件
│   ├── services/
│   │   └── videoService.ts# API 数据对接、专线名称映射与并发预加载
│   ├── types/
│   │   └── video.ts       # TS 数据模型与接口类型定义
│   ├── App.vue            # 主界面 (导航栏、瀑布流、选集、加载动画)
│   ├── main.ts            # Vue 3 应用入口
│   └── style.css          # 全局 CSS 变量与设计系统
├── release/               # 打包编译产物输出目录
│   ├── NexusPlayer 1.0.0.exe # Windows 64位单文件绿色独立版
│   └── win-unpacked/      # Windows 64位解压即用文件夹
├── .gitignore             # 规范的 Git 版本控制忽略规则
├── package.json           # 依赖项与 Electron-Builder 构建配置
└── README.md              # 本说明文档
```
