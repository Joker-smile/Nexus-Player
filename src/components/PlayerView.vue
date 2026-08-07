<template>
  <div class="player-container">
    <!-- 顶部播放栏 -->
    <div class="player-header">
      <div class="left-actions">
        <button class="back-btn" @click="$emit('close')" title="返回列表 (Esc)">
          ← 返回列表
        </button>
        <div class="playing-info">
          <span class="playing-dot"></span>
          <span class="playing-title">{{ title }}</span>
          <span class="playing-ep" v-if="epName"> - {{ epName }}</span>
          <span class="source-badge" v-if="sourceName">📡 源: {{ sourceName }}</span>
          <span class="quality-badge" :class="qualityClass">
            {{ currentQualityText }}
          </span>
        </div>
      </div>
      <div class="right-actions">
        <span class="shortcut-tip" title="快捷键: [空格] 暂停/播放 | [←/→] 快退/快进 5s | [↑/↓] 音量 | [F] 全屏">
          ⌨️ 快捷键支持
        </span>
        <button class="close-btn" @click="$emit('close')" title="关闭播放器 (Esc)">✕</button>
      </div>
    </div>

    <!-- 播放器主体 -->
    <div class="player-body">
      <!-- 错误/超时加载提示遮罩 -->
      <div v-if="errorMessage" class="player-error-mask">
        <div class="error-box glass-panel">
          <div class="error-icon">⚠️</div>
          <p class="error-msg">{{ errorMessage }}</p>
          <button class="retry-btn" @click="$emit('autoSwitchLine')">
            🔄 切换备用线路
          </button>
        </div>
      </div>

      <!-- 自动续播浮层提示 -->
      <div v-if="resumeTip" class="resume-tip-banner">
        <span>⏩ {{ resumeTip }}</span>
      </div>

      <div ref="artRef" class="artplayer-app"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue';
import Artplayer from 'artplayer';
import Hls from 'hls.js';

const props = defineProps<{
  videoUrl: string;
  title: string;
  epName?: string;
  sourceName?: string;
  lines?: any[];
  currentLineIdx?: number;
  initialTime?: number;
}>();

const emit = defineEmits(['close', 'ended', 'autoSwitchLine', 'switchLine', 'timeUpdate']);

const artRef = ref<HTMLDivElement | null>(null);
const currentQualityText = ref('加载中...');
const realHeight = ref(0);
const errorMessage = ref('');
const resumeTip = ref('');

let instance: Artplayer | null = null;
let hlsInstance: Hls | null = null;
let timeoutTimer: any = null;

const qualityClass = computed(() => {
  if (realHeight.value >= 1080) return 'badge-fhd';
  if (realHeight.value >= 720) return 'badge-hd';
  if (realHeight.value > 0) return 'badge-sd';
  return 'badge-loading';
});

const getHonestQualityLabel = (h: number): string => {
  if (h >= 2160) return `🔥 4K 极清原画 (${h}P)`;
  if (h >= 1080) return `💎 1080P 蓝光全高清`;
  if (h >= 720) return `✨ 720P 高清`;
  if (h >= 480) return `📺 480P 标清`;
  if (h > 0) return `📱 ${h}P 移动低清`;
  return '🔍 解析清晰度中...';
};

const sanitizeUrl = (rawUrl: string): string => {
  if (!rawUrl) return rawUrl;
  let clean = rawUrl.trim();
  // 修复带端口 999 / 8888 等非加密端口误用 https:// 导致的 ERR_CONNECTION_CLOSED 错误
  if (clean.startsWith('https://') && /:\d+/.test(clean) && !clean.includes(':443')) {
    clean = clean.replace(/^https:/, 'http:');
  }
  return clean;
};

/**
 * 彻底销毁上一个播放实例与音频 context，防重音、防复音残留
 */
const destroyPlayer = () => {
  if (timeoutTimer) {
    clearTimeout(timeoutTimer);
    timeoutTimer = null;
  }

  // 1. 彻底停用并销毁 HLS 解码器与 TS 切片加载器
  if (hlsInstance) {
    try {
      hlsInstance.stopLoad();
      hlsInstance.detachMedia();
      hlsInstance.destroy();
    } catch (e) {
      console.warn('销毁 HLS 实例异常:', e);
    }
    hlsInstance = null;
  }

  // 2. 彻底暂停 HTML5 原生 <video> 标签，清空 src 并释放 Audio Context
  if (instance) {
    try {
      if (instance.video) {
        instance.video.pause();
        instance.video.removeAttribute('src');
        instance.video.load();
      }
      instance.destroy(true);
    } catch (e) {
      console.warn('销毁 Artplayer 实例异常:', e);
    }
    instance = null;
  }

  // 3. 强力清空 DOM 容器，确保没有隐藏的旧 <video> 元素播放声音
  if (artRef.value) {
    const oldVideos = artRef.value.querySelectorAll('video');
    oldVideos.forEach(v => {
      try {
        v.pause();
        v.removeAttribute('src');
        v.load();
        v.remove();
      } catch (e) {}
    });
    artRef.value.innerHTML = '';
  }
};

const initPlayer = (url: string) => {
  if (!artRef.value || !url) return;

  // 初始化前强力销毁旧实例，彻底解决声音重音问题
  destroyPlayer();
  errorMessage.value = '';

  const targetUrl = sanitizeUrl(url);

  timeoutTimer = setTimeout(() => {
    if (realHeight.value === 0 && !errorMessage.value) {
      errorMessage.value = '当前线路网络响应超时，正在为你无缝切至备用线路...';
      setTimeout(() => {
        emit('autoSwitchLine');
      }, 1200);
    }
  }, 10000);

  try {
    const savedVolume = parseFloat(localStorage.getItem('NEXUS_PLAYER_VOLUME') || '0.8');

    const option: any = {
      container: artRef.value,
      url: targetUrl,
      type: 'm3u8',
      title: `${props.title} ${props.epName || ''}`,
      autoplay: true,
      volume: savedVolume,
      fullscreen: true,
      fullscreenWeb: true,
      pip: true,
      setting: true,
      flip: true,
      playbackRate: true,
      aspectRatio: true,
      autoOrientation: true,
      theme: '#6366f1',
      customType: {
        m3u8: function (video: HTMLVideoElement, videoUrl: string) {
          // 开启 Pitch 原生防变声，锁死 1.0 音频输出保真
          video.preservesPitch = true;
          if ('webkitPreservesPitch' in video) {
            (video as any).webkitPreservesPitch = true;
          }
          if ('mozPreservesPitch' in video) {
            (video as any).mozPreservesPitch = true;
          }

          video.addEventListener('loadedmetadata', () => {
            if (timeoutTimer) clearTimeout(timeoutTimer);
            errorMessage.value = '';
            realHeight.value = video.videoHeight;
            currentQualityText.value = getHonestQualityLabel(video.videoHeight);
          });

          if (Hls.isSupported()) {
            if (hlsInstance) {
              try {
                hlsInstance.stopLoad();
                hlsInstance.detachMedia();
                hlsInstance.destroy();
              } catch (e) {}
              hlsInstance = null;
            }

            // 精细化调校 Hls.js 音质与 Audio Context 参数（解决沙哑、抖动、破音）
            hlsInstance = new Hls({
              enableWorker: false, // 禁用分层 Worker 防止 Chrome 音视频 PCM 重采样脱节
              lowLatencyMode: false,
              backBufferLength: 30,
              maxBufferHole: 0.1, // 极限填补 100ms 缓冲区空隙，彻底消除音质沙哑跳帧
              maxSeekHole: 0.2,
              highBufferWatchdogPeriod: 1,
              nudgeMaxRetry: 5,
              maxAudioFramesDrift: 1, // 控制音频帧漂移不超过 1 帧
              manifestLoadingTimeOut: 10000,
              fragLoadingTimeOut: 12000,
              xhrSetup: function (xhr: XMLHttpRequest, reqUrl: string) {
                if (reqUrl.startsWith('https://') && /:\d+/.test(reqUrl) && !reqUrl.includes(':443')) {
                  const fixedUrl = reqUrl.replace(/^https:/, 'http:');
                  xhr.open('GET', fixedUrl, true);
                }
              }
            });

            // 独占挂载 HLS 媒体流，绝不让 HTML5 Video 默认 src 双重加载
            hlsInstance.loadSource(videoUrl);
            hlsInstance.attachMedia(video);

            hlsInstance.on(Hls.Events.MANIFEST_PARSED, function (_, data) {
              if (timeoutTimer) clearTimeout(timeoutTimer);
              errorMessage.value = '';

              if (instance) {
                const lineItems = (props.lines || []).map((line, idx) => ({
                  html: `${line.sourceName}`,
                  lineIndex: idx,
                  default: idx === (props.currentLineIdx || 0),
                }));

                if (lineItems.length > 0) {
                  instance.setting.add({
                    html: '画质与线路自选',
                    name: 'line-select',
                    tooltip: currentQualityText.value,
                    selector: lineItems,
                    onSelect: function (item: any) {
                      emit('switchLine', item.lineIndex);
                      return item.html;
                    },
                  });
                }
              }

              if (!data.levels || data.levels.length === 0) return;
              hlsInstance!.currentLevel = data.levels.length - 1;
            });

            hlsInstance.on(Hls.Events.ERROR, function (_, data) {
              if (data.fatal) {
                if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                  console.warn('HLS 网络层异常，尝试重连恢复:', data.details);
                  hlsInstance?.startLoad();
                } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                  hlsInstance?.recoverMediaError();
                } else {
                  console.warn('HLS 无法恢复的严重异常:', data.details);
                  errorMessage.value = '线路连接超时或非加密端口连接失败，自动切至备用线路...';
                  if (timeoutTimer) clearTimeout(timeoutTimer);
                  setTimeout(() => {
                    emit('autoSwitchLine');
                  }, 1500);
                }
              }
            });
          } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = videoUrl;
          }
        },
      },
    };

    instance = new Artplayer(option);

    let hasSeekedInitial = false;
    instance.on('ready', () => {
      if (props.initialTime && props.initialTime > 5 && !hasSeekedInitial) {
        hasSeekedInitial = true;
        instance!.seek = props.initialTime;
        const m = Math.floor(props.initialTime / 60);
        const s = Math.floor(props.initialTime % 60);
        const timeStr = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        resumeTip.value = `已为您自动续播至 ${timeStr}`;
        setTimeout(() => {
          resumeTip.value = '';
        }, 4500);
      }
    });

    instance.on('video:timeupdate', () => {
      if (instance && instance.currentTime > 0) {
        emit('timeUpdate', {
          currentTime: instance.currentTime,
          duration: instance.duration || 0,
        });
      }
    });

    instance.on('video:volumechange', () => {
      if (instance) {
        localStorage.setItem('NEXUS_PLAYER_VOLUME', String(instance.volume));
      }
    });

    instance.on('video:ended', () => {
      emit('ended');
    });

    instance.on('error', () => {
      errorMessage.value = '资源加载失败，自动切换线路...';
      setTimeout(() => {
        emit('autoSwitchLine');
      }, 1200);
    });

  } catch (err) {
    console.error('初始化播放器异常:', err);
  }
};

// 键盘快捷键监听
const handleKeyDown = (e: KeyboardEvent) => {
  const target = e.target as HTMLElement;
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
    return;
  }

  if (!instance) return;

  switch (e.key) {
    case ' ':
      e.preventDefault();
      instance.toggle();
      break;
    case 'ArrowLeft':
      e.preventDefault();
      instance.seek = Math.max(0, instance.currentTime - 5);
      break;
    case 'ArrowRight':
      e.preventDefault();
      instance.seek = Math.min(instance.duration, instance.currentTime + 5);
      break;
    case 'ArrowUp':
      e.preventDefault();
      instance.volume = Math.min(1, instance.volume + 0.1);
      break;
    case 'ArrowDown':
      e.preventDefault();
      instance.volume = Math.max(0, instance.volume - 0.1);
      break;
    case 'f':
    case 'F':
      e.preventDefault();
      instance.fullscreen = !instance.fullscreen;
      break;
    case 'Escape':
      if (instance.fullscreen) {
        instance.fullscreen = false;
      } else {
        emit('close');
      }
      break;
  }
};

watch([() => props.videoUrl, () => props.currentLineIdx], ([newUrl]) => {
  if (newUrl) initPlayer(newUrl);
});

onMounted(() => {
  initPlayer(props.videoUrl);
  window.addEventListener('keydown', handleKeyDown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown);
  destroyPlayer();
});
</script>

<style scoped>
.player-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #000;
  border-radius: var(--radius-md);
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8);
  border: 1px solid var(--border-color);
  position: relative;
}

.player-header {
  height: 48px;
  background: rgba(15, 23, 42, 0.95);
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-color);
  z-index: 10;
}

.left-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.right-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.shortcut-tip {
  font-size: 11px;
  color: var(--text-muted);
  background: rgba(255, 255, 255, 0.05);
  padding: 3px 8px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  cursor: help;
}

.back-btn {
  background: rgba(99, 102, 241, 0.2);
  color: #a5b4fc;
  border: 1px solid rgba(99, 102, 241, 0.4);
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.back-btn:hover {
  background: var(--accent-primary);
  color: #fff;
}

.playing-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.playing-dot {
  width: 8px;
  height: 8px;
  background-color: #22c55e;
  border-radius: 50%;
  box-shadow: 0 0 10px #22c55e;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { transform: scale(0.95); opacity: 0.8; }
  50% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(0.95); opacity: 0.8; }
}

.playing-title {
  font-weight: 600;
  color: var(--text-main);
}

.playing-ep {
  color: var(--accent-primary);
  font-weight: 500;
}

.source-badge {
  font-size: 11px;
  background: rgba(99, 102, 241, 0.25);
  color: #c7d2fe;
  border: 1px solid rgba(99, 102, 241, 0.4);
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
}

.quality-badge {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
}

.badge-fhd {
  background: rgba(34, 197, 94, 0.2);
  color: #4ade80;
  border: 1px solid rgba(34, 197, 94, 0.4);
}

.badge-hd {
  background: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
  border: 1px solid rgba(59, 130, 246, 0.4);
}

.badge-sd {
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.4);
}

.badge-loading {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-muted);
  border: 1px solid var(--border-color);
}

.close-btn {
  background: transparent;
  color: var(--text-muted);
  font-size: 16px;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ef4444;
}

.player-body {
  flex: 1;
  width: 100%;
  height: calc(100% - 48px);
  position: relative;
}

.artplayer-app {
  width: 100%;
  height: 100%;
}

:deep(.art-controls) {
  padding: 0 12px !important;
}

:deep(.art-controls-right) {
  padding-right: 12px !important;
  gap: 6px !important;
}

:deep(.art-control-fullscreen) {
  margin-right: 8px !important;
}

@media (max-width: 900px) {
  .player-header {
    display: none !important;
  }

  :deep(.art-controls) {
    padding: 0 8px !important;
  }

  :deep(.art-controls-right) {
    padding-right: 12px !important;
    gap: 4px !important;
  }

  :deep(.art-control-fullscreen) {
    margin-right: 10px !important;
  }
}

.player-error-mask {
  position: absolute;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.error-box {
  padding: 24px 32px;
  border-radius: var(--radius-md);
  text-align: center;
  max-width: 400px;
}

.error-icon {
  font-size: 36px;
  margin-bottom: 12px;
}

.error-msg {
  font-size: 14px;
  color: #e2e8f0;
  margin-bottom: 16px;
  line-height: 1.5;
}

.retry-btn {
  background: var(--accent-gradient);
  color: #fff;
  padding: 8px 18px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.resume-tip-banner {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 60;
  background: rgba(99, 102, 241, 0.9);
  color: #fff;
  padding: 8px 20px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  box-shadow: 0 4px 20px rgba(99, 102, 241, 0.5);
  backdrop-filter: blur(8px);
  animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideDown {
  from { transform: translate(-50%, -20px); opacity: 0; }
  to { transform: translate(-50%, 0); opacity: 1; }
}
</style>
