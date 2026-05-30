import { useState, useCallback } from 'react';
import { getVideoInfo, VideoInfo, extractVideoId } from '../utils/youtube';
import VideoResult from './VideoResult';
import AdBanner from './AdBanner';

export default function Downloader() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);

  const handleSubmit = useCallback(async (inputUrl?: string) => {
    const targetUrl = inputUrl || url;
    if (!targetUrl.trim()) {
      setError('يرجى إدخال رابط يوتيوب');
      return;
    }

    setError('');
    setVideoInfo(null);
    setLoading(true);
    setProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 85) { clearInterval(progressInterval); return 85; }
        return prev + Math.random() * 15;
      });
    }, 200);

    try {
      const info = await getVideoInfo(targetUrl);
      clearInterval(progressInterval);
      setProgress(100);
      setTimeout(() => {
        setVideoInfo(info);
        setProgress(0);
        setLoading(false);
      }, 400);
    } catch (err) {
      clearInterval(progressInterval);
      setProgress(0);
      setLoading(false);
      setError(err instanceof Error ? err.message : 'حدث خطأ. يرجى المحاولة مجدداً.');
    }
  }, [url]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && extractVideoId(text)) {
        setUrl(text);
        setTimeout(() => handleSubmit(text), 100);
      } else if (text) {
        setUrl(text);
      }
    } catch {
      setError('تعذر الوصول للحافظة. يرجى لصق الرابط يدوياً.');
    }
  };

  const handleReset = () => {
    setVideoInfo(null);
    setUrl('');
    setError('');
  };

  const exampleUrls = [
    { label: 'مقطع قصير', url: 'https://www.youtube.com/shorts/9bZkp7q19f0' },
    { label: 'فيديو عادي', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    { label: 'رابط مختصر', url: 'https://youtu.be/dQw4w9WgXcQ' },
  ];

  return (
    <section id="downloader" style={{ padding: '60px 20px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        {/* Ad above downloader */}
        <AdBanner size="leaderboard" />

        {/* Main downloader card */}
        <div
          className="glass-strong"
          style={{
            borderRadius: '24px',
            padding: '40px',
            marginTop: '24px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Background decoration */}
          <div style={{
            position: 'absolute',
            top: '-60px',
            right: '-60px',
            width: '200px',
            height: '200px',
            background: 'radial-gradient(circle, rgba(229,9,20,0.1) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute',
            bottom: '-60px',
            left: '-60px',
            width: '200px',
            height: '200px',
            background: 'radial-gradient(circle, rgba(102,126,234,0.08) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Title */}
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(229,9,20,0.1)',
                border: '1px solid rgba(229,9,20,0.2)',
                borderRadius: '20px',
                padding: '6px 16px',
                marginBottom: '16px',
              }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', animation: 'pulse-glow 2s infinite' }} />
                <span style={{ fontSize: '13px', color: '#22c55e', fontWeight: 600 }}>خدمة مجانية نشطة</span>
              </div>
              <h2 style={{
                fontSize: '28px',
                fontWeight: 900,
                color: 'white',
                margin: '0 0 8px',
              }}>
                🎬 أدخل رابط الفيديو
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', margin: 0 }}>
                الصق رابط يوتيوب واختر جودة التحميل المناسبة
              </p>
            </div>

            {/* URL Input */}
            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <input
                type="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="https://www.youtube.com/watch?v=..."
                className="input-custom"
                style={{
                  width: '100%',
                  padding: '16px 20px',
                  paddingLeft: '140px',
                  fontSize: '15px',
                  boxSizing: 'border-box',
                }}
                disabled={loading}
              />
              
              {/* Paste button inside input */}
              <button
                onClick={handlePaste}
                style={{
                  position: 'absolute',
                  left: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: 'rgba(255,255,255,0.6)',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                  fontFamily: 'Cairo, sans-serif',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                </svg>
                لصق
              </button>

              {/* Clear button */}
              {url && !loading && (
                <button
                  onClick={() => { setUrl(''); setError(''); setVideoInfo(null); }}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.3)',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: 'rgba(229,9,20,0.1)',
                border: '1px solid rgba(229,9,20,0.3)',
                borderRadius: '10px',
                padding: '12px 16px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#ff6b6b',
                fontSize: '14px',
                fontWeight: 600,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            {/* Progress bar */}
            {loading && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '6px',
                  fontSize: '12px',
                  color: 'rgba(255,255,255,0.5)',
                }}>
                  <span>جاري التحليل...</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div style={{
                  height: '4px',
                  background: 'rgba(255,255,255,0.08)',
                  borderRadius: '2px',
                  overflow: 'hidden',
                }}>
                  <div
                    className="progress-bar"
                    style={{
                      height: '100%',
                      width: `${progress}%`,
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>
            )}

            {/* Submit button */}
            <button
              onClick={() => handleSubmit()}
              disabled={loading || !url.trim()}
              className="btn-primary"
              style={{
                width: '100%',
                padding: '16px',
                fontSize: '17px',
                fontWeight: 800,
                letterSpacing: '0.5px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                opacity: (loading || !url.trim()) ? 0.7 : 1,
                cursor: (loading || !url.trim()) ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: '20px', height: '20px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite',
                  }} />
                  <span>جاري تحليل الرابط...</span>
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>تحليل وتحميل الفيديو</span>
                </>
              )}
            </button>

            {/* Example URLs */}
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginBottom: '10px' }}>
                جرب مثالاً:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                {exampleUrls.map((ex) => (
                  <button
                    key={ex.label}
                    onClick={() => {
                      setUrl(ex.url);
                      setTimeout(() => handleSubmit(ex.url), 50);
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '8px',
                      color: 'rgba(255,255,255,0.5)',
                      padding: '5px 12px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontFamily: 'Cairo, sans-serif',
                      fontWeight: 600,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {ex.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Video Result */}
        {videoInfo && (
          <VideoResult videoInfo={videoInfo} onReset={handleReset} />
        )}

        {/* Supported formats info */}
        {!videoInfo && !loading && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            marginTop: '24px',
          }}>
            {['MP4', 'MP3', '4K', '1080p', '720p', '360p', 'Shorts'].map(fmt => (
              <div key={fmt} style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '8px',
                padding: '4px 12px',
                color: 'rgba(255,255,255,0.4)',
                fontSize: '12px',
                fontWeight: 700,
              }}>
                {fmt}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
