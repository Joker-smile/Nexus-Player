# 🎬 Nexus Player PC Pro - 现代全网影视播放器

基于 **Electron 29 + Vue 3 + Vite + ArtPlayer 5 + HLS.js** 构建的高性能、现代暗黑科技风桌面影视播放器。

---

## 🌟 核心特性

- **⚡ 专线极速播放**：支持量子专线、光速专线、非凡专线等多条高清 HLS (M3U8) 蓝光专线。
- **🔄 自动线路故障转移**：某线路响应超时或网络异常时，播放器将在 1.2 秒内自动、无缝切换至下一个可用备用线路。
- **🎵 高保真音频引擎**：开启原生 Pitch 纠偏防变声，彻底清除声音沙哑、重音与背景回音问题。
- **🌊 瀑布流预加载**：首页“最近更新”一次性并发预加载前 3 页（共 120+ 部最新影视），向下滚动触底自动瀑布流续载。
- **🕒 详细资源标识**：卡片实时展示更新时间（如 `🕒 2026-08-07 10:30`）与最新集数状态（如 `更新至第08集` / `全12集`）。
- **✨ 跨页选集分组**：剧集较多时自动进行 50 集分段切片（如 `1-50`, `51-100`），选集直观不卡顿。
- **🌌 科技感动态 UI**：拥有毛玻璃 Glassmorphic 界面、Cyber 科技旋转加载动画与 Shimmer 极光扫光骨架屏。

---

## 📦 绿色免安装版运行指引

### 1. Windows 用户

项目已在 `release/` 目录中编译好了**绿色免安装版本**：

- **单文件独立绿色版**（推荐）：
  - 路径：[`release/NexusPlayer 1.0.0.exe`](file:///D:/wwwroot/pc_player/release/NexusPlayer%201.0.0.exe)
  - 使用方式：单个 `.exe` 文件，直接双击运行，无需安装，随用随走！
- **解压即用文件夹版**：
  - 路径：[`release/win-unpacked/NexusPlayer.exe`](file:///D:/wwwroot/pc_player/release/win-unpacked/NexusPlayer.exe)
  - 使用方式：直接双击 `NexusPlayer.exe` 运行。

---

### 2. macOS (Mac) 用户打包说明

由于 **Electron 官方标准规范** 要求 macOS 专属应用（`.dmg` 安装包与 `.app` 应用程序）的制作与签名依赖 Mac 原生的 `hdiutil` 命令行工具，因此建议在 **macOS 设备环境** 中（或通过 GitHub Actions 持续集成）运行打包命令。

#### 在 Mac 设备上打包步骤：

1. 将本项目源码克隆/解压至 Mac 电脑。
2. 终端运行以下命令：

```bash
# 1. 安装依赖
npm install

# 2. 一键编译 Mac 安装包 (.dmg 与 .zip)
npm run build:mac
```

3. 编译完成后，将在 `release/` 目录下生成：
   - `NexusPlayer-1.0.0.dmg`（苹果 Mac 镜像安装包）
   - `NexusPlayer-1.0.0-mac.zip`（Mac 免安装绿色压缩包）

---

## 🛠️ 本地开发与构建命令

```bash
# 启动前端+Electron热更新开发模式
npm run electron:dev

# 单独编译前端网页静态文件
npm run build

# 编译 Windows 绿色独立免安装版 (.exe)
npm run build:win

# 编译 macOS 绿色安装包 (需在 Mac 或 macOS CI 下运行)
npm run build:mac
```

---

## 📁 项目目录结构

```
pc_player/
├── electron/
│   └── main.js          # Electron 主进程 (窗口、拦截器、硬解配置)
├── src/
│   ├── components/
│   │   └── PlayerView.vue   # ArtPlayer 5 + Hls.js 核心播放器组件
│   ├── services/
│   │   └── videoService.ts # 专线解析、API 数据对接与预加载逻辑
│   ├── types/
│   │   └── video.ts        # TS 数据模型接口定义
│   ├── App.vue             # 首页瀑布流、搜索与选集主界面
│   └── main.ts             # Vue 3 入口
├── package.json            # Electron 打包配置与依赖
└── README.md               # 项目使用与编译说明文档
```
