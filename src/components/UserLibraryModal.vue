<template>
  <div v-if="visible" class="modal-overlay" @click.self="close">
    <div class="modal-container glass-panel">
      <!-- 弹窗头部卡片 -->
      <div class="modal-header">
        <div class="tab-controls">
          <button 
            class="tab-btn" 
            :class="{ active: activeTab === 'favorites' }" 
            @click="activeTab = 'favorites'"
          >
            ❤️ 我的追番 <span class="badge">{{ favorites.length }}</span>
          </button>
          <button 
            class="tab-btn" 
            :class="{ active: activeTab === 'history' }" 
            @click="activeTab = 'history'"
          >
            🕒 观看记录 <span class="badge">{{ history.length }}</span>
          </button>
        </div>

        <div class="header-actions">
          <button 
            v-if="activeTab === 'history' && history.length > 0" 
            class="clear-btn" 
            @click="handleClearHistory"
            title="清空全部历史记录"
          >
            🗑️ 清空历史
          </button>
          <button class="close-modal-btn" @click="close" title="关闭 (Esc)">✕</button>
        </div>
      </div>

      <!-- 弹窗内容主体 -->
      <div class="modal-body">
        <!-- 1. 追番列表页 -->
        <div v-if="activeTab === 'favorites'">
          <div v-if="favorites.length === 0" class="empty-holder">
            <div class="empty-icon">💖</div>
            <h3>暂无追番影片</h3>
            <p>在影片详情页点击“追番”按钮，将精彩好剧收藏至此处！</p>
          </div>

          <div v-else class="library-grid">
            <div 
              v-for="item in favorites" 
              :key="item.video.id" 
              class="library-card glass-panel"
            >
              <div class="card-cover-box" @click="handleSelectVideo(item.video)">
                <img :src="item.video.cover" :alt="item.video.title" loading="lazy" />
                <div class="hover-play-icon">▶</div>
                <span class="ep-badge">{{ item.video.remarks || '已关注' }}</span>
              </div>
              <div class="card-detail">
                <h4 class="card-title" :title="item.video.title" @click="handleSelectVideo(item.video)">
                  {{ item.video.title }}
                </h4>
                <div class="card-sub-info">
                  <span>{{ item.video.type }}</span>
                  <span v-if="item.video.year">• {{ item.video.year }}</span>
                </div>
                <div class="card-actions-row">
                  <button class="continue-btn" @click="handleSelectVideo(item.video)">
                    ▶ 继续观看
                  </button>
                  <button class="unfav-btn" @click="handleRemoveFavorite(item.video.id)" title="取消追番">
                    💔 取消
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. 观看历史记录页 -->
        <div v-else-if="activeTab === 'history'">
          <div v-if="history.length === 0" class="empty-holder">
            <div class="empty-icon">📺</div>
            <h3>暂无观看记录</h3>
            <p>观看影片时将自动在此处为您保存集数与播放时间断点！</p>
          </div>

          <div v-else class="history-list">
            <div 
              v-for="item in history" 
              :key="item.videoId + item.epUrl" 
              class="history-item glass-panel"
            >
              <div class="history-cover" @click="handleContinueHistory(item)">
                <img :src="item.cover" :alt="item.videoTitle" loading="lazy" />
                <div class="hover-play-icon">▶</div>
              </div>

              <div class="history-content">
                <div class="history-title-row">
                  <h4 class="history-title" @click="handleContinueHistory(item)">
                    {{ item.videoTitle }}
                  </h4>
                  <span class="time-tag">🕒 {{ UserLibraryService.formatDate(item.updatedAt) }}</span>
                </div>

                <div class="history-ep-row">
                  <span class="ep-name-badge">▶ {{ item.epName }}</span>
                  <span class="source-tag" v-if="item.lineName">📡 {{ item.lineName }}</span>
                </div>

                <!-- 进度条 -->
                <div class="progress-bar-container">
                  <div class="progress-bar-fill" :style="{ width: getProgressPercent(item) + '%' }"></div>
                </div>

                <div class="history-footer">
                  <span class="progress-text">
                    已看至 {{ UserLibraryService.formatTime(item.currentTime) }}
                    <template v-if="item.duration > 0">
                      / {{ UserLibraryService.formatTime(item.duration) }} ({{ getProgressPercent(item) }}%)
                    </template>
                  </span>

                  <div class="history-actions">
                    <button class="resume-btn" @click="handleContinueHistory(item)">
                      ⏩ 续播本集
                    </button>
                    <button class="del-btn" @click="handleRemoveHistory(item.videoId)" title="删除本条记录">
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { UserLibraryService, FavoriteItem, WatchHistoryItem } from '../services/userLibraryService';
import { VideoDetail } from '../types/video';

const props = defineProps<{
  visible: boolean;
  initialTab?: 'favorites' | 'history';
}>();

const emit = defineEmits(['close', 'selectVideo', 'continueHistory', 'libraryChanged']);

const activeTab = ref<'favorites' | 'history'>('favorites');
const favorites = ref<FavoriteItem[]>([]);
const history = ref<WatchHistoryItem[]>([]);

const loadData = () => {
  favorites.value = UserLibraryService.getFavorites();
  history.value = UserLibraryService.getHistory();
};

watch(() => props.visible, (val) => {
  if (val) {
    if (props.initialTab) {
      activeTab.value = props.initialTab;
    }
    loadData();
  }
});

onMounted(() => {
  loadData();
  window.addEventListener('keydown', handleKeyDown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown);
});

const handleKeyDown = (e: KeyboardEvent) => {
  if (props.visible && e.key === 'Escape') {
    close();
  }
};

const close = () => {
  emit('close');
};

const handleRemoveFavorite = (videoId: string) => {
  UserLibraryService.removeFavorite(videoId);
  loadData();
  emit('libraryChanged');
};

const handleClearHistory = () => {
  UserLibraryService.clearHistory();
  loadData();
  emit('libraryChanged');
};

const handleRemoveHistory = (videoId: string) => {
  UserLibraryService.removeHistoryItem(videoId);
  loadData();
  emit('libraryChanged');
};

const handleSelectVideo = (video: VideoDetail) => {
  emit('selectVideo', video);
  close();
};

const handleContinueHistory = (item: WatchHistoryItem) => {
  emit('continueHistory', item);
  close();
};

const getProgressPercent = (item: WatchHistoryItem): number => {
  if (!item.duration || item.duration <= 0) return 0;
  const pct = Math.round((item.currentTime / item.duration) * 100);
  return Math.min(100, Math.max(0, pct));
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 9990;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-container {
  width: 100%;
  max-width: 880px;
  height: 620px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  background: rgba(19, 27, 46, 0.95);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8);
}

.modal-header {
  height: 58px;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-color);
  background: rgba(11, 15, 25, 0.6);
  flex-shrink: 0;
}

.tab-controls {
  display: flex;
  gap: 12px;
}

.tab-btn {
  background: transparent;
  color: var(--text-muted);
  font-size: 14px;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: var(--text-main);
  background: rgba(255, 255, 255, 0.05);
}

.tab-btn.active {
  background: var(--accent-gradient);
  color: #ffffff;
  border-color: transparent;
}

.badge {
  font-size: 11px;
  background: rgba(255, 255, 255, 0.2);
  padding: 1px 7px;
  border-radius: 10px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.clear-btn {
  background: rgba(239, 68, 68, 0.15);
  color: #fca5a5;
  border: 1px solid rgba(239, 68, 68, 0.3);
  font-size: 12px;
  padding: 5px 12px;
  border-radius: 14px;
  cursor: pointer;
}

.clear-btn:hover {
  background: #ef4444;
  color: #fff;
}

.close-modal-btn {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-muted);
  font-size: 16px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.close-modal-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.empty-holder {
  padding: 80px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 54px;
  margin-bottom: 12px;
}

.empty-holder h3 {
  font-size: 18px;
  margin-bottom: 8px;
}

.empty-holder p {
  color: var(--text-muted);
  font-size: 13px;
}

/* 追番网格 */
.library-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

.library-card {
  display: flex;
  gap: 12px;
  padding: 10px;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.03);
}

.card-cover-box {
  width: 80px;
  height: 110px;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  flex-shrink: 0;
  cursor: pointer;
}

.card-cover-box img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hover-play-icon {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: #fff;
  opacity: 0;
  transition: opacity 0.2s;
}

.card-cover-box:hover .hover-play-icon {
  opacity: 1;
}

.ep-badge {
  position: absolute;
  bottom: 4px;
  right: 4px;
  font-size: 9px;
  background: rgba(0, 0, 0, 0.8);
  color: #a5b4fc;
  padding: 1px 4px;
  border-radius: 3px;
}

.card-detail {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
}

.card-title:hover {
  color: var(--accent-primary);
}

.card-sub-info {
  font-size: 11px;
  color: var(--text-muted);
}

.card-actions-row {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}

.continue-btn {
  flex: 1;
  background: var(--accent-gradient);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  padding: 6px 8px;
  border-radius: 6px;
}

.unfav-btn {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-muted);
  font-size: 11px;
  padding: 6px 8px;
  border-radius: 6px;
}

.unfav-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

/* 历史记录列表 */
.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-item {
  display: flex;
  gap: 16px;
  padding: 12px;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.03);
}

.history-cover {
  width: 90px;
  height: 64px;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  flex-shrink: 0;
  cursor: pointer;
}

.history-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.history-cover:hover .hover-play-icon {
  opacity: 1;
}

.history-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
}

.history-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.history-title {
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.history-title:hover {
  color: var(--accent-primary);
}

.time-tag {
  font-size: 11px;
  color: var(--text-muted);
}

.history-ep-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 4px 0;
}

.ep-name-badge {
  font-size: 12px;
  color: #a5b4fc;
  font-weight: 600;
  background: rgba(99, 102, 241, 0.15);
  padding: 2px 8px;
  border-radius: 4px;
}

.source-tag {
  font-size: 11px;
  color: var(--text-muted);
}

.progress-bar-container {
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
  margin: 6px 0;
}

.progress-bar-fill {
  height: 100%;
  background: var(--accent-gradient);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.history-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.progress-text {
  font-size: 11px;
  color: var(--text-muted);
}

.history-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.resume-btn {
  background: var(--accent-gradient);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 12px;
}

.del-btn {
  background: transparent;
  color: var(--text-muted);
  font-size: 14px;
  padding: 2px 6px;
  border-radius: 4px;
}

.del-btn:hover {
  color: #ef4444;
}
</style>
