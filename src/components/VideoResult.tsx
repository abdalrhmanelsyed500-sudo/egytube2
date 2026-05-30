import { useState } from 'react';
import { VideoInfo, DOWNLOAD_SERVICES, smartDownload } from '../utils/youtube';
import AdBanner from './AdBanner';

interface VideoResultProps {
  videoInfo: VideoInfo;
  onReset: () => void;
}

type ActiveTab = 'video' | 'audio';

export default function VideoResult({ videoInfo, onReset }: VideoResultProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('video');
  const [selectedQuality, setSelectedQuality] = useState<string>('1080p');
  const [downloading, setDownloading] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  const videoQualities = videoInfo.qualities.filter(q => q.type === 'video');
  const audioQualities = videoInfo.qualities.filter(q => q.type === 'audio');

  const handleDownload = (quality: string, format: string) => {
    setDownloading(quality);
    setTimeout(() => setDownloading(null), 3000);
    smartDownload(videoInfo.videoId, quality, format);
  };

  const getQualityColor = (quality: string): string => {
    if (quality.includes('2160') || quality.includes('4K')) return '#f59e0b';
    if (quality.includes('1440') || quality.includes('2K')) return '#8b5cf6';
    if (quality.includes('1080')) return '#3b82f6';
    if (quality.includes('720')) return '#22c55e';
    if (quality.includes('320')) return '#ec4899';
    return '#6b7280';
  };

  const thumbnailSrc = imgError
    ? `https://i.ytimg.com/vi/${videoInfo.videoId}/hqdefault.jpg`
    : videoInfo.thumbnail;

  return (
    <div style={{ marginTop: '32px', animation: 'fadeInUp 0.5s ease' }}>
      {/* Ad before result */}
      <AdBanner size="banner" />
      
      <div
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px',
          overflow: 'hidden',
          marginTop: '20px',
        }}
      >
        {/* Video Info Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(229,9,20,0.1), rgba(26,26,46,0.5))',
            padding: '24px',
            display: 'flex',
            gap: '20px',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
          }}
        >
          {/* Thumbnail */}
          <div
            style={{
              position: 'relative',
              borderRadius: '12px',
              overflow: 'hidden',
              flexShrink: 0,
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
          >
            <img
              src={thumbnailSrc}
              alt={videoInfo.title}
              onError={() => setImgError(true)}
              style={{
                width: '200px',
                height: '112px',
                objectFit: 'cover',
                display: 'block',
              }}
            />
            {/* Play overlay */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: 'rgba(229,9,20,0.9)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                  <polygon points="5,3 19,12 5,21" />
                </svg>
              </div>
            </div>
          </div>

          {/* Video Details */}
          <div style={{ flex: 1, minWidth: '200px' }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: 700,
              color: 'white',
              margin: '0 0 8px',
              lineHeight: 1.4,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {videoInfo.title}
            </h3>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span>{videoInfo.author}</span>
              </div>

              {videoInfo.duration && videoInfo.duration !== '0:00' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span>{videoInfo.duration}</span>
                </div>
              )}
            </div>

            {/* Watch on YouTube */}
            <a
              href={`https://www.youtube.com/watch?v=${videoInfo.videoId}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(229,9,20,0.15)',
                border: '1px solid rgba(229,9,20,0.3)',
                borderRadius: '8px',
                padding: '6px 14px',
                color: '#ff4444',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: 600,
                transition: 'all 0.2s ease',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V9.01a8.26 8.26 0 0 0 4.84 1.56V7.13a4.85 4.85 0 0 1-1.07-.44z"/>
              </svg>
              مشاهدة على يوتيوب
            </a>
          </div>

          {/* Reset button */}
          <button
            onClick={onReset}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              color: 'rgba(255,255,255,0.6)',
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              flexShrink: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            بحث جديد
          </button>
        </div>

        {/* Tabs */}
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 24px' }}>
          <div style={{ display: 'flex', gap: '0' }}>
            {(['video', 'audio'] as ActiveTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: `3px solid ${activeTab === tab ? '#e50914' : 'transparent'}`,
                  color: activeTab === tab ? '#e50914' : 'rgba(255,255,255,0.5)',
                  padding: '14px 20px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 700,
                  fontFamily: 'Cairo, sans-serif',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                }}
              >
                {tab === 'video' ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="2" width="20" height="20" rx="2" />
                      <polygon points="10,8 16,12 10,16" fill="currentColor" stroke="none" />
                    </svg>
                    فيديو ({videoQualities.length})
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18V5l12-2v13" />
                      <circle cx="6" cy="18" r="3" />
                      <circle cx="18" cy="16" r="3" />
                    </svg>
                    صوت MP3 ({audioQualities.length})
                  </>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Qualities Grid */}
        <div style={{ padding: '24px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '12px',
            }}
          >
            {(activeTab === 'video' ? videoQualities : audioQualities).map((q) => {
              const isDownloading = downloading === q.quality;
              const color = getQualityColor(q.quality);
              
              return (
                <div
                  key={q.quality}
                  className="card-hover"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: `1px solid ${selectedQuality === q.quality ? color + '50' : 'rgba(255,255,255,0.06)'}`,
                    borderRadius: '14px',
                    padding: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  onClick={() => setSelectedQuality(q.quality)}
                >
                  {/* Quality badge */}
                  {q.badge && (
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      background: color,
                      color: 'white',
                      fontSize: '10px',
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      letterSpacing: '0.5px',
                    }}>
                      {q.badge}
                    </div>
                  )}

                  <div style={{ marginBottom: '12px', paddingTop: q.badge ? '16px' : '0' }}>
                    <div style={{
                      fontSize: '18px',
                      fontWeight: 800,
                      color: color,
                      marginBottom: '4px',
                    }}>
                      {q.quality}
                    </div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>
                      {q.label}
                    </div>
                    {q.size && (
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>
                        {q.size}
                      </div>
                    )}
                  </div>

                  {/* Download button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(q.quality, q.format);
                    }}
                    className="btn-download"
                    style={{
                      width: '100%',
                      padding: '10px',
                      fontSize: '13px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {isDownloading ? (
                      <>
                        <div style={{
                          width: '14px', height: '14px',
                          border: '2px solid rgba(255,255,255,0.3)',
                          borderTop: '2px solid white',
                          borderRadius: '50%',
                          animation: 'spin 0.7s linear infinite',
                        }} />
                        <span>جاري...</span>
                      </>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        <span>تحميل {q.format.toUpperCase()}</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Ad between qualities */}
          <div style={{ marginTop: '24px' }}>
            <AdBanner size="rectangle" />
          </div>

          {/* Alternative Services */}
          <div style={{ marginTop: '24px' }}>
            <h4 style={{
              fontSize: '15px',
              fontWeight: 700,
              color: 'rgba(255,255,255,0.7)',
              margin: '0 0 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
              خدمات تحميل بديلة
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {DOWNLOAD_SERVICES.map((service) => {
                const serviceUrl = service.name === 'Y2Mate'
                  ? service.baseUrl + videoInfo.videoId
                  : service.baseUrl + videoInfo.videoId;
                  
                return (
                  <a
                    key={service.name}
                    href={serviceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'rgba(255,255,255,0.05)',
                      border: `1px solid ${service.color}30`,
                      borderRadius: '10px',
                      padding: '8px 14px',
                      color: 'rgba(255,255,255,0.7)',
                      textDecoration: 'none',
                      fontSize: '13px',
                      fontWeight: 600,
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLAnchorElement).style.background = service.color + '20';
                      (e.currentTarget as HTMLAnchorElement).style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.05)';
                      (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.7)';
                    }}
                  >
                    <span>{service.icon}</span>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700 }}>{service.name}</div>
                      <div style={{ fontSize: '10px', opacity: 0.6 }}>{service.description}</div>
                    </div>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 'auto' }}>
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
