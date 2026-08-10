import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { VideoDetail, VideoEpisode, VideoSourceLine } from '../types/video';

const isDev = Boolean((import.meta as any).env?.DEV);

/**
 * pc_player 核心服务类 (带明确清晰度标识的 Web 专用全量开放 HTTPS CDN 视频源服务)
 */
export class VideoService {
  // Web 专用开放视频源节点 (标准 HTTPS CDN 专线)
  private static primaryEndpoint = isDev ? '/api/lz/api.php/provide/vod/' : 'https://cj.lziapi.com/api.php/provide/vod/'; // 💎 1080P 蓝光原画 CDN
  private static guangsuEndpoint = isDev ? '/api/gs/api.php/provide/vod/' : 'https://api.guangsuapi.com/api.php/provide/vod/'; // ✨ 720P 高清专线
  private static feifanEndpoint = isDev ? '/api/ff/api.php/provide/vod/' : 'https://api.ffzyapi.com/api.php/provide/vod/'; // ⚡ 1080P 极速专线

  /**
   * 1. 最近更新视频列表接口 (Web 端全网最新实时更新)
   * @param page 页码 (每页获取最新 40 条数据)
   */
  static async getLatestUpdates(page: number = 1): Promise<VideoDetail[]> {
    const p1 = String(page);

    try {
      // 优先从全量 HTTPS 极速专线拉取最新更新列表
      const data1 = await this.fetchMacCmsApi(this.primaryEndpoint, { ac: 'detail', h: '24', pg: p1 });

      let results = [...data1];

      // 若节点无响应，自动无缝降级至光速专线节点
      if (results.length === 0) {
        const bk1 = await this.fetchMacCmsApi(this.guangsuEndpoint, { ac: 'detail', h: '24', pg: p1 });
        results = [...bk1];
      }

      // 若仍为空，尝试第三热备节点 (非凡极速专线)
      if (results.length === 0) {
        const ff1 = await this.fetchMacCmsApi(this.feifanEndpoint, { ac: 'detail', h: '24', pg: p1 });
        results = [...ff1];
      }

      return this.deduplicateVideos(results);
    } catch (err) {
      console.error('[Web视频源] 获取最近更新失败:', err);
      return [];
    }
  }

  /**
   * 2. 搜索视频功能接口 (Web 端全网并发搜索)
   * @param keyword 搜索关键词
   * @param page 页码
   */
  static async searchVideos(keyword: string, page: number = 1): Promise<VideoDetail[]> {
    const query = keyword.trim();
    if (!query) {
      return this.getLatestUpdates(page);
    }

    try {
      const params = { ac: 'detail', wd: query, pg: String(page) };
      
      // 全量并发搜索所有 CDN 专线节点
      const [lz, gs, ff] = await Promise.all([
        this.fetchMacCmsApi(this.primaryEndpoint, params),
        this.fetchMacCmsApi(this.guangsuEndpoint, params),
        this.fetchMacCmsApi(this.feifanEndpoint, params),
      ]);

      return this.mergeAndDeduplicateResults(lz, gs, ff);
    } catch (err) {
      console.error('[Web视频源] 搜索视频失败:', err);
      return [];
    }
  }

  /**
   * 确保选中的视频拥有多线路备份 (如果单线路，自动并发拉取备用节点补全)
   */
  static async ensureMultiLineVideo(video: VideoDetail): Promise<VideoDetail> {
    if (!video || (video.lines && video.lines.length >= 2)) {
      return video;
    }

    try {
      const params = { ac: 'detail', wd: video.title.trim() };
      const [lz, gs, ff] = await Promise.all([
        this.fetchMacCmsApi(this.primaryEndpoint, params),
        this.fetchMacCmsApi(this.guangsuEndpoint, params),
        this.fetchMacCmsApi(this.feifanEndpoint, params),
      ]);

      const merged = this.mergeAndDeduplicateResults([video], lz, gs, ff);
      return merged.length > 0 ? merged[0] : video;
    } catch (e) {
      return video;
    }
  }

  /**
   * 聚合多源路线去重
   */
  private static mergeAndDeduplicateResults(...lists: VideoDetail[][]): VideoDetail[] {
    const map = new Map<string, VideoDetail>();

    lists.flat().forEach(item => {
      if (!item || !item.title) return;
      const cleanTitle = item.title.trim();
      if (!map.has(cleanTitle)) {
        map.set(cleanTitle, { ...item, lines: [...item.lines] });
      } else {
        const existing = map.get(cleanTitle)!;
        item.lines.forEach(newLine => {
          if (!existing.lines.some(l => l.sourceName === newLine.sourceName)) {
            existing.lines.push(newLine);
          }
        });
      }
    });

    return Array.from(map.values());
  }

  /**
   * HTTP 请求解析 MacCMS 格式视频源
   */
  private static async fetchMacCmsApi(endpoint: string, queryParams: Record<string, string>): Promise<VideoDetail[]> {
    const queryString = new URLSearchParams(queryParams).toString();
    const fullUrl = `${endpoint}?${queryString}`;

    try {
      let data: any = null;

      if (Capacitor.isNativePlatform()) {
        try {
          // 使用原生 HTTP 绕过 CORS 限制
          const response = await CapacitorHttp.get({
            url: fullUrl,
            headers: { 'Accept': 'application/json' }
          });
          
          if (typeof response.data === 'string') {
            const text = response.data;
            if (text && text.includes('{')) {
              const cleanJsonStr = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
              data = JSON.parse(cleanJsonStr);
            }
          } else if (typeof response.data === 'object' && response.data !== null) {
            // 如果已经被底层的 Capacitor 自动解析为对象，直接使用！
            // 坚决不能再使用 JSON.stringify 转回字符串，这是导致手机卡顿的元凶！
            data = response.data;
          }
        } catch (e) {
          console.warn('[CapacitorHttp] 原生 GET 异常:', e);
        }
      }

      // 如果原生未响应或处于 Web / Electron 环境，使用标准 fetch 降级
      if (!data) {
        const res = await fetch(fullUrl, {
          method: 'GET',
          headers: { 
            'Accept': 'application/json'
          },
        });
        if (res.ok) {
          const text = await res.text();
          if (text && text.includes('{')) {
            const cleanJsonStr = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
            data = JSON.parse(cleanJsonStr);
          }
        }
      }

      if (data && data.list && Array.isArray(data.list)) {
        return data.list.map((item: any) => this.formatNativeAppItem(item));
      }
      return [];
    } catch (err) {
      console.warn(`[Web视频源] 请求异常 (${fullUrl}):`, err);
      return [];
    }
  }

  /**
   * 预加载前 3 页最近更新 (并发拉取前 3 页数据)
   */
  static async getPreloadedUpdates(): Promise<VideoDetail[]> {
    try {
      // 改为仅请求当前页，大大降低接口并发压力
      const p1 = await this.getLatestUpdates(1);
      return this.deduplicateVideos(p1);
    } catch (err) {
      console.error('[Web视频源] 预加载失败:', err);
      return [];
    }
  }

  /**
   * 格式化视频数据模型 (包含更新时间与最新剧集集数)
   */
  private static formatNativeAppItem(item: any): VideoDetail {
    const rawPlayUrl = item.vod_play_url || '';
    const rawFromStr = item.vod_play_from || '极速专线';
    const lines = this.parseAppPlayLines(rawPlayUrl, rawFromStr);

    let timeStr = item.vod_time || '';
    if (timeStr && timeStr.length >= 16) {
      timeStr = timeStr.substring(0, 16);
    }

    let remarksStr = (item.vod_remarks || '').trim();
    if (!remarksStr && lines.length > 0 && lines[0].episodes.length > 0) {
      const eps = lines[0].episodes;
      remarksStr = `更新至 ${eps[eps.length - 1].name}`;
    }
    if (!remarksStr) remarksStr = '已完结';

    return {
      id: String(item.vod_id || Math.random()),
      title: item.vod_name || '未命名影视',
      cover: item.vod_pic || '',
      type: item.type_name || '影视',
      year: item.vod_year || '2024',
      area: item.vod_area || '全网',
      actor: item.vod_actor || '',
      director: item.vod_director || '',
      desc: item.vod_content ? item.vod_content.replace(/<[^>]+>/g, '').trim() : '暂无详细简介',
      remarks: remarksStr,
      updateTime: timeStr,
      lines: lines,
    };
  }

  /**
   * 解析 Web 专用多线路与剧集 m3u8 链接 (动态格式化专线名称与编号)
   */
  private static parseAppPlayLines(rawStr: string, fromStr: string): VideoSourceLine[] {
    if (!rawStr) return [];

    const lineSources = fromStr.split('$$$');
    const lineUrls = rawStr.split('$$$');
    const result: VideoSourceLine[] = [];

    const sourceNameMap: Record<string, string> = {
      'lzm3u8': '量子专线',
      'liangzi': '量子专线',
      'gsm3u8': '光速专线',
      'gsyun': '光速专线',
      'ffm3u8': '非凡专线',
      'feifan': '非凡专线',
      'bfm3u8': '暴风专线',
      'hnm3u8': '红牛专线',
      'kuaikua': '快快专线',
      'wjm3u8': '无尽专线',
      'snm3u8': '索尼专线',
      'zuidam3u8': '最大专线',
    };

    const countMap: Record<string, number> = {};

    lineUrls.forEach((urlGroup, idx) => {
      const rawName = (lineSources[idx] || `线路${idx + 1}`).trim().toLowerCase();
      
      let baseName = '';
      for (const [key, label] of Object.entries(sourceNameMap)) {
        if (rawName.includes(key)) {
          baseName = label;
          break;
        }
      }

      if (!baseName) {
        if (rawName) {
          baseName = rawName.toUpperCase().replace(/M3U8/g, '').trim() + '专线';
        } else {
          baseName = `极速专线`;
        }
      }

      countMap[baseName] = (countMap[baseName] || 0) + 1;
      const count = countMap[baseName];

      let icon = '💎';
      if (baseName.includes('光速')) icon = '✨';
      if (baseName.includes('非凡')) icon = '⚡';
      if (baseName.includes('暴风')) icon = '🌀';
      if (baseName.includes('红牛')) icon = '🐂';

      const finalName = `${icon} ${baseName} ${String(count).padStart(2, '0')}`;

      const epList: VideoEpisode[] = [];
      const rawEps = urlGroup.split('#');
      rawEps.forEach(epRaw => {
        const parts = epRaw.split('$');
        if (parts.length >= 2) {
          const epName = parts[0].trim();
          const epUrl = parts[1].trim();
          if (epUrl.startsWith('http')) {
            epList.push({ name: epName, url: epUrl });
          }
        }
      });

      if (epList.length > 0) {
        result.push({ sourceName: finalName, episodes: epList });
      }
    });

    return result;
  }

  /**
   * 去重辅助函数
   */
  private static deduplicateVideos(list: VideoDetail[]): VideoDetail[] {
    const map = new Map<string, VideoDetail>();
    list.forEach(item => {
      if (item.title && !map.has(item.title)) {
        map.set(item.title, item);
      }
    });
    return Array.from(map.values());
  }
}
