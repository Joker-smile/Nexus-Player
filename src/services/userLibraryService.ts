import { VideoDetail } from '../types/video';

export interface WatchHistoryItem {
  videoId: string;
  videoTitle: string;
  cover: string;
  type: string;
  lineIdx: number;
  lineName: string;
  epName: string;
  epUrl: string;
  currentTime: number;
  duration: number;
  updatedAt: number; // timestamp
}

export interface FavoriteItem {
  video: VideoDetail;
  addedAt: number;
  lastWatchEpName?: string;
  lastWatchTime?: number;
}

const FAVORITES_KEY = 'NEXUS_FAVORITES_LIST';
const HISTORY_KEY = 'NEXUS_WATCH_HISTORY_LIST';

export class UserLibraryService {
  // --- 追番 (收藏) 管理 ---

  static getFavorites(): FavoriteItem[] {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn('获取追番列表失败:', e);
      return [];
    }
  }

  static isFavorite(videoId: string): boolean {
    const list = this.getFavorites();
    return list.some(item => item.video.id === videoId);
  }

  static toggleFavorite(video: VideoDetail): boolean {
    const list = this.getFavorites();
    const idx = list.findIndex(item => item.video.id === video.id);
    let isAdded = false;

    if (idx !== -1) {
      list.splice(idx, 1);
      isAdded = false;
    } else {
      list.unshift({
        video,
        addedAt: Date.now(),
      });
      isAdded = true;
    }

    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('保存追番状态失败:', e);
    }
    return isAdded;
  }

  static removeFavorite(videoId: string): void {
    const list = this.getFavorites().filter(item => item.video.id !== videoId);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(list));
  }

  // --- 观看记录 管理 ---

  static getHistory(): WatchHistoryItem[] {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn('获取历史记录失败:', e);
      return [];
    }
  }

  static saveWatchHistory(item: Omit<WatchHistoryItem, 'updatedAt'>): void {
    if (!item.videoId || !item.epUrl) return;
    const history = this.getHistory();
    
    // 寻找是否已有该视频的历史记录
    const existingIdx = history.findIndex(h => h.videoId === item.videoId);
    
    const record: WatchHistoryItem = {
      ...item,
      updatedAt: Date.now(),
    };

    if (existingIdx !== -1) {
      history.splice(existingIdx, 1);
    }

    // 插入最前面
    history.unshift(record);

    // 最多只保留 100 条记录
    if (history.length > 100) {
      history.pop();
    }

    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
      console.warn('保存观看历史失败:', e);
    }
  }

  static getProgress(videoId: string, epUrl?: string): WatchHistoryItem | null {
    const history = this.getHistory();
    if (epUrl) {
      return history.find(h => h.videoId === videoId && h.epUrl === epUrl) || null;
    }
    return history.find(h => h.videoId === videoId) || null;
  }

  static removeHistoryItem(videoId: string): void {
    const history = this.getHistory().filter(h => h.videoId !== videoId);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }

  static clearHistory(): void {
    localStorage.removeItem(HISTORY_KEY);
  }

  // 格式化秒数为 mm:ss 或 hh:mm:ss
  static formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds) || seconds <= 0) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  // 格式化时间戳为相对时间或年月日
  static formatDate(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    const date = new Date(timestamp);
    return `${date.getMonth() + 1}-${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }
}
