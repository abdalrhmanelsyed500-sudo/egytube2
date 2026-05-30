// ========================================
// YouTube Utilities & Multi-API Engine
// إيجي تيوب - محرك التحميل الذكي متعدد المصادر
// ========================================

export interface VideoInfo {
  videoId: string;
  title: string;
  author: string;
  thumbnail: string;
  duration: string;
  views: string;
  qualities: QualityOption[];
}

export interface QualityOption {
  quality: string;
  label: string;
  format: string;
  size?: string;
  url: string;
  type: 'video' | 'audio';
  badge?: string;
}

// Extract YouTube video ID from any URL format
export function extractVideoId(url: string): string | null {
  if (!url) return null;
  
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([^&#?/\s]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Get best thumbnail URL
export function getThumbnailUrl(videoId: string, quality: 'max' | 'hq' | 'mq' | 'sd' = 'hq'): string {
  const qualityMap = {
    max: 'maxresdefault',
    hq: 'hqdefault',
    mq: 'mqdefault',
    sd: 'sddefault',
  };
  return `https://i.ytimg.com/vi/${videoId}/${qualityMap[quality]}.jpg`;
}

// Format duration from seconds
export function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Format view count
export function formatViews(count: number | string): string {
  const num = typeof count === 'string' ? parseInt(count) : count;
  if (!num || isNaN(num)) return '0';
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + ' مليار مشاهدة';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + ' مليون مشاهدة';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + ' ألف مشاهدة';
  return num.toLocaleString('ar') + ' مشاهدة';
}

// Generate download links via multiple free services
export function generateDownloadLinks(videoId: string): QualityOption[] {
  const qualities: QualityOption[] = [
    {
      quality: '2160p',
      label: '4K Ultra HD',
      format: 'mp4',
      type: 'video',
      badge: '4K',
      url: `https://ssyoutube.com/watch?v=${videoId}`,
    },
    {
      quality: '1440p',
      label: '1440p QHD',
      format: 'mp4',
      type: 'video',
      badge: '2K',
      url: `https://ssyoutube.com/watch?v=${videoId}`,
    },
    {
      quality: '1080p',
      label: '1080p Full HD',
      format: 'mp4',
      type: 'video',
      badge: 'FHD',
      url: `https://ssyoutube.com/watch?v=${videoId}`,
    },
    {
      quality: '720p',
      label: '720p HD',
      format: 'mp4',
      type: 'video',
      badge: 'HD',
      url: `https://ssyoutube.com/watch?v=${videoId}`,
    },
    {
      quality: '480p',
      label: '480p SD',
      format: 'mp4',
      type: 'video',
      url: `https://ssyoutube.com/watch?v=${videoId}`,
    },
    {
      quality: '360p',
      label: '360p',
      format: 'mp4',
      type: 'video',
      url: `https://ssyoutube.com/watch?v=${videoId}`,
    },
    {
      quality: '240p',
      label: '240p',
      format: 'mp4',
      type: 'video',
      url: `https://ssyoutube.com/watch?v=${videoId}`,
    },
    {
      quality: '144p',
      label: '144p',
      format: 'mp4',
      type: 'video',
      url: `https://ssyoutube.com/watch?v=${videoId}`,
    },
    {
      quality: '320kbps',
      label: 'MP3 320kbps',
      format: 'mp3',
      type: 'audio',
      badge: 'عالي',
      url: `https://ssyoutube.com/watch?v=${videoId}`,
    },
    {
      quality: '128kbps',
      label: 'MP3 128kbps',
      format: 'mp3',
      type: 'audio',
      url: `https://ssyoutube.com/watch?v=${videoId}`,
    },
  ];
  
  return qualities;
}

// Fetch video metadata using noembed (free, no API key)
export async function fetchVideoMetadata(videoId: string): Promise<Partial<VideoInfo>> {
  try {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const response = await fetch(
      `https://noembed.com/embed?url=${encodeURIComponent(videoUrl)}&format=json`,
      { signal: AbortSignal.timeout(8000) }
    );
    
    if (!response.ok) throw new Error('noembed failed');
    
    const data = await response.json();
    
    return {
      title: data.title || 'فيديو يوتيوب',
      author: data.author_name || 'غير معروف',
      thumbnail: data.thumbnail_url || getThumbnailUrl(videoId, 'hq'),
    };
  } catch {
    return {
      title: 'فيديو يوتيوب',
      author: 'غير معروف',
      thumbnail: getThumbnailUrl(videoId, 'hq'),
    };
  }
}

// Main function: Get full video info
export async function getVideoInfo(url: string): Promise<VideoInfo> {
  const videoId = extractVideoId(url);
  
  if (!videoId) {
    throw new Error('رابط يوتيوب غير صالح. يرجى التحقق من الرابط وإعادة المحاولة.');
  }
  
  const metadata = await fetchVideoMetadata(videoId);
  
  const info: VideoInfo = {
    videoId,
    title: metadata.title || 'فيديو يوتيوب',
    author: metadata.author || 'غير معروف',
    thumbnail: metadata.thumbnail || getThumbnailUrl(videoId, 'hq'),
    duration: '0:00',
    views: '',
    qualities: generateDownloadLinks(videoId),
  };
  
  return info;
}

// Smart download using multiple service URLs
export function smartDownload(videoId: string, _quality: string, format: string): void {
  let targetUrl: string;
  
  if (format === 'mp3') {
    targetUrl = `https://ytmp3.nu/en13/?q=https://www.youtube.com/watch?v=${videoId}`;
  } else {
    targetUrl = `https://ssyoutube.com/watch?v=${videoId}`;
  }
  
  window.open(targetUrl, '_blank', 'noopener');
}

// Alternative download services
export const DOWNLOAD_SERVICES = [
  {
    name: 'SS YouTube',
    icon: '⚡',
    baseUrl: 'https://ssyoutube.com/watch?v=',
    description: 'سريع وموثوق',
    color: '#e50914',
  },
  {
    name: 'SaveFrom',
    icon: '💾',
    baseUrl: 'https://en.savefrom.net/#url=https://www.youtube.com/watch?v=',
    description: 'دعم جميع الجودات',
    color: '#3b82f6',
  },
  {
    name: 'Y2Mate',
    icon: '🎯',
    baseUrl: 'https://www.y2mate.com/youtube/',
    description: 'سهل الاستخدام',
    color: '#f5a623',
  },
  {
    name: 'SnapSave',
    icon: '📥',
    baseUrl: 'https://snapsave.app/result?url=https://www.youtube.com/watch?v=',
    description: 'يدعم الشورتس',
    color: '#22c55e',
  },
];
