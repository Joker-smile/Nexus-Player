export interface VideoEpisode {
  name: string; // 集数名称，如 "第01集"
  url: string;  // 播放视频 URL (.m3u8 / .mp4)
}

export interface VideoSourceLine {
  sourceName: string; // 线路名称，如 "高清主源", "备用专线"
  episodes: VideoEpisode[];
}

export interface VideoDetail {
  id: string;
  title: string;
  cover: string;
  type: string;       // 电影 / 连续剧 / 动漫 / 综艺
  year?: string;
  area?: string;      // 地区
  actor?: string;     // 演员
  director?: string;  // 导演
  desc?: string;      // 简介
  remarks?: string;   // 最新更新集数/备注（如 "更新至第08集" / "HD中字"）
  updateTime?: string;// 最近更新时间（如 "10:30" / "2026-08-07"）
  lines: VideoSourceLine[]; // 多线路剧集列表
}

export interface SearchFilter {
  keyword: string;
  type?: string;
}
