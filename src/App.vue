<template>
  <div class="app-window" :class="{ 'is-electron': isElectron }">
    <!-- 1. 原生桌面无边框标题栏与窗口控制条 (仅 PC 端显示) -->
    <TitleBar v-if="isElectron" />

    <!-- 2. 顶部导航与搜索栏 -->
    <header class="app-header glass-panel">
      <!-- 点击返回首页 -->
      <div class="brand cursor-pointer" @click="goHome" title="点击返回首页">
        <div class="logo-icon">🎬</div>
        <div class="logo-text">
          <h1>Nexus Player</h1>
        </div>
      </div>

      <!-- 搜索栏 -->
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input
          ref="searchInputRef"
          v-model="searchKeyword"
          @input="searchKeyword = ($event.target as HTMLInputElement).value"
          @keydown.enter.prevent="handleEnterSearch"
          type="text"
          placeholder="搜索全网影视、动漫、纪录片..."
        />
        <button v-if="searchKeyword" class="clear-btn" @click="clearSearch">✕</button>
        <button class="search-btn" @click="doSearch(1)" :disabled="searching">
          {{ searching ? '搜索中...' : '搜索' }}
        </button>
      </div>

      <div class="header-actions">
        <button class="icon-btn fav-btn" @click="openFavoritesModal" title="查看我的追番收藏">
          ❤️ 我的追番 <span class="nav-badge">{{ favoritesCount }}</span>
        </button>
        <button class="icon-btn history-btn" @click="openHistoryModal" title="查看观看历史记录">
          🕒 观看记录 <span class="nav-badge" v-if="historyCount > 0">{{ historyCount }}</span>
        </button>
        <button class="icon-btn" @click="goHome" title="刷新全网最新更新">✨ 最近更新</button>
      </div>
    </header>

    <!-- 3. 追番与历史记录抽屉弹窗 -->
    <UserLibraryModal
      :visible="showLibraryModal"
      :initialTab="libraryInitialTab"
      @close="showLibraryModal = false"
      @selectVideo="selectVideo"
      @continueHistory="continueFromHistory"
      @libraryChanged="favoritesVersion++; refreshLibraryCounts()"
    />

    <!-- 主体区域 -->
    <main class="app-body">
      <!-- 视频播放与选集区域 (激活播放时呈现) -->
      <transition name="slide">
        <section v-if="activeVideo" class="active-player-section glass-panel">
          <div class="player-left">
            <PlayerView
              :videoUrl="currentEpisodeUrl"
              :title="activeVideo.title"
              :epName="currentEpisodeName"
              :sourceName="currentLineName"
              :lines="activeVideo.lines"
              :currentLineIdx="currentLineIndex"
              :initialTime="currentInitialTime"
              @close="closePlayer"
              @ended="playNextEpisode"
              @autoSwitchLine="handleAutoSwitchLine"
              @switchLine="switchLine"
              @timeUpdate="handleTimeUpdate"
            />
          </div>

          <!-- 侧边栏：多线路与剧集选择 -->
          <div class="player-right-panel">
            <div class="video-meta">
              <div class="meta-header">
                <div class="meta-title-box">
                  <h2>{{ activeVideo.title }}</h2>
                  <span class="playing-ep-badge" v-if="currentEpisodeName">▶ 正在播放：{{ currentEpisodeName }}</span>
                </div>
                <button 
                  class="fav-toggle-btn" 
                  :class="{ active: isCurrentFavorite }" 
                  @click="toggleFavorite"
                  :title="isCurrentFavorite ? '已追番 (点击取消)' : '点击追番'"
                >
                  {{ isCurrentFavorite ? '💖 已追番' : '❤️ 追番' }}
                </button>
              </div>
              <div class="tags">
                <span class="tag">{{ activeVideo.type }}</span>
                <span class="tag" v-if="activeVideo.year">{{ activeVideo.year }}</span>
                <span class="tag" v-if="activeVideo.area">{{ activeVideo.area }}</span>
              </div>
              <p class="desc" :title="activeVideo.desc">{{ activeVideo.desc }}</p>
            </div>

            <!-- 线路选择 -->
            <div class="line-selector" v-if="activeVideo.lines.length > 1">
              <label>选择播放线路：</label>
              <div class="line-tabs">
                <button
                  v-for="(line, idx) in activeVideo.lines"
                  :key="idx"
                  :class="{ active: currentLineIndex === idx }"
                  @click="switchLine(idx)"
                >
                  {{ line.sourceName }}
                </button>
              </div>
            </div>

            <!-- 剧集选集面板 (带多分组 Tab) -->
            <div class="episodes-selector">
              <div class="ep-header">
                <h3>选集列表</h3>
                <span class="ep-count">共 {{ currentEpisodes.length }} 集</span>
              </div>

              <!-- 剧集较多时显示区间分段 (如 1-50, 51-100) -->
              <div class="ep-group-tabs" v-if="epGroups.length > 1">
                <button
                  v-for="(grp, gIdx) in epGroups"
                  :key="gIdx"
                  :class="{ active: activeGroupIndex === gIdx }"
                  @click="activeGroupIndex = gIdx"
                >
                  {{ grp.label }}
                </button>
              </div>

              <!-- 当前区间的剧集按钮网格 -->
              <div class="episodes-grid">
                <button
                  v-for="(ep, idx) in activeGroupEpisodes"
                  :key="idx"
                  :class="{ active: currentEpisodeUrl === ep.url }"
                  :title="ep.name"
                  @click="playEpisode(ep)"
                >
                  {{ ep.name }}
                </button>
              </div>
            </div>
          </div>
        </section>
      </transition>

      <!-- 搜索结果与推荐网格 -->
      <section class="video-catalog-section">
        <div class="section-title-bar">
          <h2>{{ currentSectionTitle }}</h2>
          <span class="result-count" v-if="videoList.length > 0">
            {{ !searchKeyword.trim() ? '瀑布流已预加载 3 页 (共 ' + videoList.length + ' 部影片)' : '共找到 ' + videoList.length + ' 部影片' }}
          </span>
        </div>

        <!-- Loading 动态加载全效动画区 -->
        <div v-if="loading" class="loading-full-wrapper">
          <div class="loading-modal-card glass-panel">
            <div class="cyber-spinner">
              <div class="ring ring-outer"></div>
              <div class="ring ring-inner"></div>
              <div class="center-icon">🎬</div>
            </div>
            <div class="loading-text">
              <h3>全网影视资源加载中...</h3>
              <p>正在连接 1080P 蓝光原画 CDN 节点拉取数据</p>
            </div>
          </div>

          <!-- 扫光骨架图网格 -->
          <div class="skeleton-grid">
            <div v-for="i in 10" :key="i" class="skeleton-card glass-panel">
              <div class="skeleton-cover shimmer"></div>
              <div class="skeleton-info">
                <div class="skeleton-line skeleton-title shimmer"></div>
                <div class="skeleton-line skeleton-sub shimmer"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- 影片卡片网格 (最近更新模式启用瀑布流样式) -->
        <div
          v-else-if="videoList.length > 0"
          :class="['video-grid', { 'waterfall-mode': !searchKeyword.trim() }]"
        >
          <div
            v-for="item in videoList"
            :key="item.id"
            class="video-card glass-panel"
            @click="selectVideo(item)"
          >
            <div class="cover-wrapper">
              <img :src="item.cover" :alt="item.title" loading="lazy" />
              <div class="cover-overlay">
                <span class="play-icon">▶</span>
              </div>
              <!-- 最新第几集 / 状态 Badge -->
              <span class="ep-badge" v-if="item.remarks">{{ item.remarks }}</span>
              <span class="type-badge" v-else>{{ item.type }}</span>
            </div>
            <div class="card-info">
              <h3 class="title" :title="item.title">{{ item.title }}</h3>
              <!-- 增加更新时间显示 -->
              <div class="card-meta">
                <span class="meta-time" v-if="item.updateTime">🕒 {{ item.updateTime }}</span>
                <span class="meta-type">{{ item.type }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 无数据空状态 -->
        <div v-else class="empty-state glass-panel">
          <div class="empty-icon">📺</div>
          <h3>未找到相关影视资源</h3>
          <p>尝试搜索其他关键词，或点击顶部品牌 Logo 返回首页。</p>
        </div>

        <!-- 滚动触底自动瀑布流加载指示栏 -->
        <div v-if="videoList.length > 0 && !searchKeyword.trim()" class="auto-load-bar">
          <div v-if="loadingMore" class="auto-load-spinner">
            <div class="audio-wave">
              <span></span>
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span>正在自动加载下一页精彩影片 (当前已加载至第 {{ currentPage }} 页)...</span>
          </div>
          <div v-else class="auto-load-tip">
            ⬇ 往下滚动自动瀑布流加载更多最新更新影片
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { VideoDetail, VideoEpisode } from './types/video';
import { VideoService } from './services/videoService';
import { UserLibraryService, WatchHistoryItem } from './services/userLibraryService';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import PlayerView from './components/PlayerView.vue';
import TitleBar from './components/TitleBar.vue';
import UserLibraryModal from './components/UserLibraryModal.vue';

// 响应式状态
const isElectron = ref(typeof window !== 'undefined' && Boolean((window as any).electronAPI));
const searchKeyword = ref('');
const videoList = ref<VideoDetail[]>([]);
const loading = ref(false);
const loadingMore = ref(false);
const currentPage = ref(1);
const currentSectionTitle = ref('全网最近更新 (瀑布流预加载)');

// 当前正在播放的影片与线路集数状态
const activeVideo = ref<VideoDetail | null>(null);
const currentLineIndex = ref(0);
const currentEpisodeName = ref('');
const currentEpisodeUrl = ref('');
const currentInitialTime = ref(0);

// 追番与历史记录弹窗
const showLibraryModal = ref(false);
const libraryInitialTab = ref<'favorites' | 'history'>('favorites');

const favoritesCount = ref(0);
const historyCount = ref(0);
const favoritesVersion = ref(0);

const refreshLibraryCounts = () => {
  favoritesCount.value = UserLibraryService.getFavorites().length;
  historyCount.value = UserLibraryService.getHistory().length;
};

const isCurrentFavorite = computed(() => {
  // 依赖 favoritesVersion 激活 Vue 响应式依赖追踪
  favoritesVersion.value;
  if (!activeVideo.value) return false;
  return UserLibraryService.isFavorite(activeVideo.value.id);
});

const toggleFavorite = () => {
  if (!activeVideo.value) return;
  UserLibraryService.toggleFavorite(activeVideo.value);
  favoritesVersion.value++;
  refreshLibraryCounts();
};

const openFavoritesModal = () => {
  libraryInitialTab.value = 'favorites';
  showLibraryModal.value = true;
};

const openHistoryModal = () => {
  libraryInitialTab.value = 'history';
  showLibraryModal.value = true;
};

const handleTimeUpdate = (data: { currentTime: number; duration: number }) => {
  if (!activeVideo.value || !currentEpisodeUrl.value) return;
  UserLibraryService.saveWatchHistory({
    videoId: activeVideo.value.id,
    videoTitle: activeVideo.value.title,
    cover: activeVideo.value.cover,
    type: activeVideo.value.type,
    lineIdx: currentLineIndex.value,
    lineName: currentLineName.value,
    epName: currentEpisodeName.value,
    epUrl: currentEpisodeUrl.value,
    currentTime: data.currentTime,
    duration: data.duration,
  });
  refreshLibraryCounts();
};

const continueFromHistory = (historyItem: WatchHistoryItem) => {
  // 查找影片对象
  const targetVideo = videoList.value.find(v => v.id === historyItem.videoId) || {
    id: historyItem.videoId,
    title: historyItem.videoTitle,
    cover: historyItem.cover,
    type: historyItem.type,
    year: '',
    area: '',
    actor: '',
    director: '',
    desc: '从观看历史中恢复播放',
    remarks: '',
    updateTime: '',
    lines: [
      {
        sourceName: historyItem.lineName || '默认线路',
        episodes: [{ name: historyItem.epName, url: historyItem.epUrl }]
      }
    ]
  };

  // 走完整的全网多线路节点补全逻辑，而非强塞假对象
  selectVideo(targetVideo as VideoDetail);
};

// 剧集分组
const activeGroupIndex = ref(0);
const GROUP_SIZE = 50;

// 追踪已尝试的线路索引，防止死循环无限切换
const triedLineIndices = ref<Set<number>>(new Set());

// 点击 Logo 一键返回首页
const goHome = () => {
  closePlayer();
  searchKeyword.value = '';
  loadLatestUpdates(1);
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// 自动线路故障转移（当某条线路超时时自动切到下一线路）
const handleAutoSwitchLine = () => {
  if (!activeVideo.value || activeVideo.value.lines.length === 0) return;
  triedLineIndices.value.add(currentLineIndex.value);

  let nextLineIndex = -1;
  for (let i = 0; i < activeVideo.value.lines.length; i++) {
    const candidate = (currentLineIndex.value + 1 + i) % activeVideo.value.lines.length;
    if (!triedLineIndices.value.has(candidate)) {
      nextLineIndex = candidate;
      break;
    }
  }

  if (nextLineIndex !== -1) {
    console.log(`[Auto Failover]: 线路 ${currentLineIndex.value + 1} 响应超时，自动切至线路 ${nextLineIndex + 1}`);
    switchLine(nextLineIndex);
  } else {
    console.warn(`[Auto Failover]: 备用线路已遍历，重新轮询第 1 条线路...`);
    triedLineIndices.value.clear();
    switchLine(0);
  }
};

// 播放状态持久化存储 (防止刷新 F5 重置回首页)
const savePlayingState = () => {
  if (activeVideo.value) {
    const state = {
      video: activeVideo.value,
      lineIdx: currentLineIndex.value,
      epName: currentEpisodeName.value,
      epUrl: currentEpisodeUrl.value,
      initialTime: currentInitialTime.value,
    };
    sessionStorage.setItem('NEXUS_PLAYING_STATE', JSON.stringify(state));
    location.hash = `play=${activeVideo.value.id}&ep=${encodeURIComponent(currentEpisodeName.value)}`;
  } else {
    sessionStorage.removeItem('NEXUS_PLAYING_STATE');
    if (location.hash.startsWith('#play=')) {
      history.pushState('', document.title, window.location.pathname + window.location.search);
    }
  }
};

// 恢复上次播放状态
const restorePlayingState = (): boolean => {
  const raw = sessionStorage.getItem('NEXUS_PLAYING_STATE');
  if (raw) {
    try {
      const state = JSON.parse(raw);
      if (state && state.video) {
        activeVideo.value = state.video;
        currentLineIndex.value = state.lineIdx || 0;
        currentEpisodeName.value = state.epName || '';
        currentEpisodeUrl.value = state.epUrl || '';
        currentInitialTime.value = state.initialTime || 0;
        return true;
      }
    } catch (e) {
      console.warn('恢复播放状态异常:', e);
    }
  }
  return false;
};

// 关闭播放器
const closePlayer = () => {
  activeVideo.value = null;
  currentInitialTime.value = 0;
  savePlayingState();
};

// 计算属性：当前选中的线路名称
const currentLineName = computed(() => {
  if (!activeVideo.value || activeVideo.value.lines.length === 0) return '';
  const line = activeVideo.value.lines[currentLineIndex.value] || activeVideo.value.lines[0];
  return line ? line.sourceName : '';
});

// 计算属性：当前线路下的剧集
const currentEpisodes = computed(() => {
  if (!activeVideo.value || activeVideo.value.lines.length === 0) return [];
  const line = activeVideo.value.lines[currentLineIndex.value] || activeVideo.value.lines[0];
  return line.episodes || [];
});

// 计算属性：剧集分组
const epGroups = computed(() => {
  const eps = currentEpisodes.value;
  if (eps.length === 0) return [];

  const groups: { label: string; episodes: VideoEpisode[] }[] = [];
  for (let i = 0; i < eps.length; i += GROUP_SIZE) {
    const end = Math.min(i + GROUP_SIZE, eps.length);
    groups.push({
      label: `${i + 1}-${end}`,
      episodes: eps.slice(i, end),
    });
  }
  return groups;
});

// 当前选中分组下的剧集按钮列表
const activeGroupEpisodes = computed(() => {
  if (epGroups.value.length === 0) return [];
  const grp = epGroups.value[activeGroupIndex.value] || epGroups.value[0];
  return grp ? grp.episodes : [];
});

// 监听剧集切换，自动调整选中的分组
watch(currentEpisodeUrl, (newUrl) => {
  if (!newUrl) return;
  const eps = currentEpisodes.value;
  const targetIdx = eps.findIndex(e => e.url === newUrl);
  if (targetIdx !== -1) {
    const targetGroup = Math.floor(targetIdx / GROUP_SIZE);
    activeGroupIndex.value = targetGroup;
  }
});

// 加载全网最近实时更新 (预加载前 3 页)
const loadLatestUpdates = async (page: number = 1) => {
  if (page === 1) {
    loading.value = true;
    currentPage.value = 1;
    videoList.value = [];
    currentSectionTitle.value = '全网最近更新';
    searchKeyword.value = '';

    try {
      const items = await VideoService.getPreloadedUpdates();
      videoList.value = items;
      currentPage.value = 3;
    } catch (err) {
      console.error('获取最新更新失败:', err);
    } finally {
      loading.value = false;
    }
  } else {
    loadingMore.value = true;
    try {
      const items = await VideoService.getLatestUpdates(page);
      videoList.value.push(...items);
    } catch (err) {
      console.error('加载下一页更新失败:', err);
    } finally {
      loadingMore.value = false;
    }
  }
};

// 瀑布流触底自动加载下一页
const loadNextPage = () => {
  if (loading.value || loadingMore.value) return;
  if (!searchKeyword.value.trim()) {
    currentPage.value += 1;
    loadLatestUpdates(currentPage.value);
  }
};

// 监听页面触底滚动
const handleScroll = () => {
  if (loading.value || loadingMore.value) return;
  if (searchKeyword.value.trim()) return;

  const scrollHeight = document.documentElement.scrollHeight;
  const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
  const clientHeight = document.documentElement.clientHeight;

  if (scrollTop + clientHeight >= scrollHeight - 350) {
    loadNextPage();
  }
};

const searchInputRef = ref<HTMLInputElement | null>(null);
const searching = ref(false);

const getQueryText = (): string => {
  const domVal = searchInputRef.value ? searchInputRef.value.value : '';
  const val = domVal || searchKeyword.value || '';
  const trimmed = val.trim();
  if (trimmed) {
    searchKeyword.value = trimmed;
  }
  return trimmed;
};

// 软键盘/键盘回车搜索
const handleEnterSearch = (e: Event) => {
  const target = e.target as HTMLElement;
  if (target) target.blur(); // 软键盘收起
  doSearch(1);
};

// 显式清空搜索
const clearSearch = () => {
  searchKeyword.value = '';
  if (searchInputRef.value) searchInputRef.value.value = '';
  loadLatestUpdates(1);
};

// 搜索视频
const doSearch = async (page: number = 1) => {
  const query = getQueryText();
  if (!query) return; // 避免软键盘 IME 输入法确认 Enter 导致的空关键词回跳首页

  // 如果在播放页搜索，自动关闭播放器以展示搜索结果
  if (activeVideo.value) {
    closePlayer();
  }

  if (page === 1) {
    searching.value = true;
    loading.value = true;
    currentPage.value = 1;
    videoList.value = [];
  } else {
    loadingMore.value = true;
  }
  currentSectionTitle.value = `"${query}" 的搜索结果`;

  try {
    const items = await VideoService.searchVideos(query, page);
    if (page === 1) {
      videoList.value = items;
    } else {
      videoList.value.push(...items);
    }
  } catch (err) {
    console.error('搜索异常:', err);
  } finally {
    searching.value = false;
    loading.value = false;
    loadingMore.value = false;
  }
};

// 选中影片播放
const selectVideo = async (video: VideoDetail) => {
  // 1. 立即弹出面板并用现有的基础信息占位，实现零延迟响应交互
  activeVideo.value = video;
  
  // 初始化默认线路 index (通常外部只带有默认线路)
  let defaultIdx = 0;
  if (video.lines && video.lines.length > 1) {
    defaultIdx = 1;
  }
  currentLineIndex.value = defaultIdx;
  activeGroupIndex.value = 0;
  triedLineIndices.value.clear();

  // 检查是否有历史播放记录，优先续播上一次看过的集数与秒数
  const lastProgress = UserLibraryService.getProgress(video.id);

  if (lastProgress && video.lines && video.lines.length > 0) {
    currentLineIndex.value = lastProgress.lineIdx || 0;
    currentEpisodeName.value = lastProgress.epName;
    currentEpisodeUrl.value = lastProgress.epUrl;
    currentInitialTime.value = lastProgress.currentTime;
  } else if (video.lines && video.lines.length > 0 && video.lines[defaultIdx].episodes.length > 0) {
    const firstEp = video.lines[defaultIdx].episodes[0];
    currentEpisodeName.value = firstEp.name;
    currentEpisodeUrl.value = firstEp.url;
    currentInitialTime.value = 0;
  } else {
    currentEpisodeName.value = '';
    currentEpisodeUrl.value = '';
    currentInitialTime.value = 0;
  }

  savePlayingState();
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // 2. 后台异步静默拉取并补全全网备用专线 (量子 + 光速 + 非凡多源保障)
  try {
    const fullVideo = await VideoService.ensureMultiLineVideo(video);
    
    // 只有当用户没有切出当前视频时才进行无缝替换
    if (activeVideo.value && activeVideo.value.id === video.id) {
      activeVideo.value = fullVideo;
      
      // 如果这不是从历史记录进来的，并且刚刚只显示了 1 条默认线路，现在拿到了多条高质量专线，自动无缝切到专线 (如 index 1)
      if (!lastProgress && fullVideo.lines.length > 1 && currentLineIndex.value === 0) {
        currentLineIndex.value = 1;
        if (fullVideo.lines[1].episodes.length > 0) {
          currentEpisodeName.value = fullVideo.lines[1].episodes[0].name;
          currentEpisodeUrl.value = fullVideo.lines[1].episodes[0].url;
        }
      } else if (lastProgress) {
        // 如果是从历史记录进来的，防止原先的线路超界
        if (currentLineIndex.value >= fullVideo.lines.length) {
          currentLineIndex.value = 0;
        }
      }
    }
  } catch (err) {
    console.error('后台加载多线路失败：', err);
  }
};

// 切换线路
const switchLine = (lineIdx: number) => {
  currentLineIndex.value = lineIdx;
  activeGroupIndex.value = 0;
  const eps = currentEpisodes.value;
  if (eps.length > 0) {
    playEpisode(eps[0]);
  }
};

// 播放具体某集
const playEpisode = (ep: VideoEpisode) => {
  currentEpisodeName.value = ep.name;
  currentEpisodeUrl.value = ep.url;
  
  // 检查具体此集是否有播放历史
  const progress = UserLibraryService.getProgress(activeVideo.value?.id || '', ep.url);
  if (progress) {
    currentInitialTime.value = progress.currentTime;
  } else {
    currentInitialTime.value = 0;
  }

  savePlayingState();
};

// 自动连播下一集
const playNextEpisode = () => {
  const eps = currentEpisodes.value;
  const currentIdx = eps.findIndex(e => e.url === currentEpisodeUrl.value);
  if (currentIdx !== -1 && currentIdx < eps.length - 1) {
    const nextEp = eps[currentIdx + 1];
    console.log('自动播放下一集:', nextEp.name);
    playEpisode(nextEp);
  }
};

onMounted(() => {
  const restored = restorePlayingState();
  loadLatestUpdates(1);
  refreshLibraryCounts();
  if (restored) {
    console.log('成功从本地恢复上次刷新前的播放界面！');
  }
  window.addEventListener('scroll', handleScroll);

  if (Capacitor.isNativePlatform()) {
    CapacitorApp.addListener('backButton', () => {
      if (activeVideo.value) {
        closePlayer();
      } else if (showLibraryModal.value) {
        showLibraryModal.value = false;
      } else {
        CapacitorApp.minimizeApp();
      }
    });
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleScroll);
});
</script>

<style scoped>
.app-window {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: radial-gradient(circle at 50% 0%, #1e1b4b 0%, #0b0f19 70%);
}

.app-header {
  height: 60px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 100;
  border-radius: 0 0 var(--radius-md) var(--radius-md);
  margin-bottom: 20px;
}

.is-electron .app-header {
  top: 38px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand.cursor-pointer {
  cursor: pointer;
  transition: transform 0.25s ease, opacity 0.25s ease;
}

.brand.cursor-pointer:hover {
  transform: scale(1.04);
  opacity: 0.9;
}

.logo-icon {
  font-size: 26px;
  background: var(--accent-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.logo-text h1 {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.version-tag {
  font-size: 10px;
  color: var(--accent-primary);
  background: rgba(99, 102, 241, 0.15);
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
}

.search-box {
  width: 420px;
  height: 38px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  display: flex;
  align-items: center;
  padding: 0 6px 0 14px;
  transition: all 0.3s;
}

.search-box:focus-within {
  background: rgba(255, 255, 255, 0.09);
  border-color: var(--accent-primary);
  box-shadow: 0 0 20px rgba(99, 102, 241, 0.3);
}

.search-icon {
  font-size: 14px;
  margin-right: 8px;
  opacity: 0.6;
}

.search-box input {
  flex: 1;
  background: transparent;
  color: var(--text-main);
  font-size: 13px;
  border: none;
  outline: none;
}

.clear-btn {
  background: transparent;
  color: var(--text-muted);
  font-size: 14px;
  padding: 0 6px;
  cursor: pointer;
}

.search-btn {
  height: 28px;
  padding: 0 14px;
  background: var(--accent-gradient);
  color: #fff;
  font-weight: 600;
  font-size: 12px;
  border-radius: 14px;
  cursor: pointer;
  white-space: nowrap;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  min-width: 68px;
}

.search-btn:hover {
  opacity: 0.9;
  transform: scale(1.02);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-actions .icon-btn {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-main);
  padding: 6px 14px;
  border-radius: 18px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid var(--border-color);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
}

.header-actions .icon-btn:hover {
  background: rgba(255, 255, 255, 0.14);
}

.nav-badge {
  font-size: 10px;
  background: var(--accent-primary);
  color: #fff;
  padding: 1px 6px;
  border-radius: 10px;
  font-weight: 700;
}

.meta-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.meta-header h2 {
  font-size: 16px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.fav-toggle-btn {
  background: rgba(255, 255, 255, 0.08);
  color: #f1f5f9;
  font-size: 13px;
  font-weight: 600;
  padding: 6px 16px;
  height: 32px;
  border-radius: 16px;
  border: 1px solid var(--border-color);
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: all 0.25s ease;
}

.fav-toggle-btn:hover {
  background: rgba(236, 72, 153, 0.25);
  color: #ec4899;
  border-color: rgba(236, 72, 153, 0.5);
}

.fav-toggle-btn.active {
  background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 4px 15px rgba(236, 72, 153, 0.4);
}

.app-body {
  flex: 1;
  max-width: 1440px;
  width: 100%;
  margin: 0 auto;
  padding: 0 24px 40px;
}

/* 嵌入式播放器界面 */
.active-player-section {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 20px;
  height: 580px;
  max-height: 620px;
  padding: 16px;
  margin-bottom: 30px;
  overflow: hidden;
  position: relative;
  z-index: 10;
}

.player-left {
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.player-right-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.video-meta {
  background: rgba(255, 255, 255, 0.03);
  padding: 12px 16px;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}

.meta-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.meta-title-box {
  display: flex;
  flex-direction: column;
  gap: 3px;
  max-width: 220px;
}

.meta-title-box h2 {
  font-size: 16px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.playing-ep-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  color: #c084fc;
  background: rgba(192, 132, 252, 0.15);
  padding: 2px 8px;
  border-radius: 10px;
  border: 1px solid rgba(192, 132, 252, 0.3);
  width: fit-content;
}

.back-link-btn {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-muted);
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 12px;
  cursor: pointer;
}

.back-link-btn:hover {
  background: rgba(255, 255, 255, 0.16);
  color: var(--text-main);
}

.tags {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}

.tag {
  font-size: 11px;
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-muted);
  padding: 2px 8px;
  border-radius: 4px;
}

.desc {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-selector {
  flex-shrink: 0;
}

.line-selector label {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 6px;
  display: block;
}

.line-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.line-tabs button {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-muted);
  font-size: 12px;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  cursor: pointer;
}

.line-tabs button.active {
  background: var(--accent-primary);
  color: #fff;
  border-color: var(--accent-primary);
  font-weight: 600;
}

.episodes-selector {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.02);
  padding: 12px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  min-height: 0;
}

.ep-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  flex-shrink: 0;
}

.ep-header h3 {
  font-size: 14px;
}

.ep-count {
  font-size: 11px;
  color: var(--text-muted);
}

.ep-group-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
  overflow-x: auto;
  padding-bottom: 4px;
  flex-shrink: 0;
}

.ep-group-tabs button {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-muted);
  font-size: 11px;
  height: 28px;
  padding: 0 10px;
  border-radius: 6px;
  white-space: nowrap;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-color);
}

.ep-group-tabs button.active {
  background: rgba(99, 102, 241, 0.3);
  color: #a5b4fc;
  border: 1px solid rgba(99, 102, 241, 0.5);
}

.episodes-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
  grid-auto-rows: 34px;
  gap: 8px;
  overflow-y: auto;
  padding-right: 6px;
  align-content: start;
}

.episodes-grid button {
  height: 34px;
  min-height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1;
  padding: 0 4px;
  border-radius: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border: 1px solid var(--border-color);
  cursor: pointer;
  box-sizing: border-box;
}

.episodes-grid button:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-main);
}

.episodes-grid button.active {
  background: var(--accent-gradient);
  color: #fff;
  font-weight: 600;
  border-color: transparent;
}

/* 视频列表与搜索 */
.section-title-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.section-title-bar h2 {
  font-size: 20px;
  font-weight: 700;
}

.result-count {
  font-size: 13px;
  color: var(--text-muted);
}

.video-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
}

.video-card {
  border-radius: var(--radius-md);
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
}

.video-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 12px 30px rgba(99, 102, 241, 0.25);
  border-color: rgba(99, 102, 241, 0.4);
}

.cover-wrapper {
  position: relative;
  aspect-ratio: 3 / 4;
  overflow: hidden;
  background: #1e293b;
}

.cover-wrapper img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.video-card:hover .cover-wrapper img {
  transform: scale(1.08);
}

.cover-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s;
}

.video-card:hover .cover-overlay {
  opacity: 1;
}

.play-icon {
  font-size: 36px;
  color: #fff;
  filter: drop-shadow(0 4px 10px rgba(0,0,0,0.5));
}

.ep-badge, .type-badge {
  position: absolute;
  bottom: 8px;
  right: 8px;
  font-size: 11px;
  background: rgba(15, 23, 42, 0.85);
  color: #a5b4fc;
  padding: 2px 8px;
  border-radius: 4px;
  backdrop-filter: blur(4px);
}

.card-info {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.card-info .title {
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-muted);
}

/* 骨架屏 & 加载动画 */
.loading-full-wrapper {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.loading-modal-card {
  padding: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  text-align: center;
}

.cyber-spinner {
  position: relative;
  width: 70px;
  height: 70px;
}

.ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 3px solid transparent;
}

.ring-outer {
  border-top-color: var(--accent-primary);
  border-right-color: var(--accent-primary);
  animation: spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
}

.ring-inner {
  inset: 10px;
  border-bottom-color: #ec4899;
  border-left-color: #ec4899;
  animation: spin-reverse 0.9s cubic-bezier(0.5, 0, 0.5, 1) infinite;
}

.center-icon {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes spin-reverse {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(-360deg); }
}

.loading-text h3 {
  font-size: 16px;
  margin-bottom: 6px;
}

.loading-text p {
  font-size: 13px;
  color: var(--text-muted);
}

.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
}

.skeleton-card {
  border-radius: var(--radius-md);
  overflow: hidden;
  height: 320px;
  display: flex;
  flex-direction: column;
}

.skeleton-cover {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
}

.skeleton-info {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton-line {
  height: 14px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}

.skeleton-title {
  width: 70%;
}

.skeleton-sub {
  width: 40%;
}

.shimmer {
  position: relative;
  overflow: hidden;
}

.shimmer::after {
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0,
    rgba(255, 255, 255, 0.06) 50%,
    rgba(255, 255, 255, 0) 100%
  );
  animation: shimmer 1.8s infinite;
  content: '';
}

@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}

.empty-state {
  padding: 60px;
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-state h3 {
  font-size: 18px;
  margin-bottom: 8px;
}

.empty-state p {
  color: var(--text-muted);
  font-size: 14px;
}

.auto-load-bar {
  margin-top: 30px;
  padding: 20px;
  text-align: center;
}

.auto-load-spinner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: 13px;
  color: var(--text-muted);
}

.audio-wave {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 16px;
}

.audio-wave span {
  width: 3px;
  background: var(--accent-primary);
  animation: wave 1s ease-in-out infinite;
}

.audio-wave span:nth-child(1) { height: 40%; animation-delay: 0.1s; }
.audio-wave span:nth-child(2) { height: 80%; animation-delay: 0.2s; }
.audio-wave span:nth-child(3) { height: 100%; animation-delay: 0.3s; }
.audio-wave span:nth-child(4) { height: 60%; animation-delay: 0.4s; }
.audio-wave span:nth-child(5) { height: 30%; animation-delay: 0.5s; }

@keyframes wave {
  0%, 100% { transform: scaleY(0.4); }
  50% { transform: scaleY(1); }
}

.auto-load-tip {
  font-size: 13px;
  color: var(--text-muted);
  opacity: 0.6;
}

/* 📱 移动端 / 手机端 全屏响应式兼容量身适配 (格局清晰分明，绝不折叠重叠) */
@media (max-width: 900px) {
  .app-header {
    height: auto;
    padding: 10px 14px;
    flex-direction: column;
    gap: 10px;
    position: relative;
    top: 0;
  }

  .brand {
    width: 100%;
    justify-content: space-between;
  }

  .search-box {
    width: 100%;
    height: 38px;
  }

  .header-actions {
    width: 100%;
    justify-content: space-between;
    overflow-x: auto;
    padding-bottom: 2px;
  }

  .header-actions .icon-btn {
    flex: 1;
    justify-content: center;
    white-space: nowrap;
    padding: 6px 10px;
    font-size: 11px;
  }

  .app-body {
    padding: 0 12px 30px;
  }

  /* 移动端播放区域：由 2 列横排切为上下单列布局，格局清晰分明 */
  .active-player-section {
    grid-template-columns: 1fr;
    height: auto;
    max-height: none;
    padding: 10px;
    gap: 14px;
  }

  .player-left {
    height: 56.25vw;
    max-height: 280px;
    min-height: 200px;
    width: 100%;
    position: relative;
    overflow: hidden;
    border-radius: 12px;
  }

  .player-right-panel {
    height: auto;
    width: 100%;
  }

  .video-meta h2 {
    font-size: 15px;
  }

  .fav-toggle-btn {
    padding: 4px 12px;
    height: 28px;
    font-size: 11px;
  }

  .episodes-selector {
    height: 260px;
  }

  .episodes-grid {
    grid-template-columns: repeat(auto-fill, minmax(68px, 1fr));
    grid-auto-rows: 32px;
    gap: 6px;
  }

  .episodes-grid button {
    height: 32px;
    min-height: 32px;
    font-size: 11px;
  }

  .video-grid {
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: 12px;
  }

  .card-info {
    padding: 8px;
  }

  .card-info .title {
    font-size: 13px;
  }

  .section-title-bar h2 {
    font-size: 16px;
  }
}
</style>
