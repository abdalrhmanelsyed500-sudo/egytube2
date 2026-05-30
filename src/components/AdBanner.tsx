interface AdBannerProps {
  size?: 'leaderboard' | 'rectangle' | 'skyscraper' | 'square' | 'banner' | 'mobile';
  label?: string;
}

const adSizes: Record<string, { width: string; height: string; label: string }> = {
  leaderboard: { width: '728px', height: '90px', label: 'إعلان - 728×90' },
  rectangle: { width: '336px', height: '280px', label: 'إعلان - 336×280' },
  skyscraper: { width: '160px', height: '600px', label: 'إعلان - 160×600' },
  square: { width: '250px', height: '250px', label: 'إعلان - 250×250' },
  banner: { width: '468px', height: '60px', label: 'إعلان - 468×60' },
  mobile: { width: '320px', height: '100px', label: 'إعلان - 320×100' },
};

export default function AdBanner({ size = 'leaderboard', label }: AdBannerProps) {
  const adConfig = adSizes[size];
  const displayLabel = label || adConfig.label;

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        margin: '0 auto',
        padding: '8px',
      }}
    >
      <div
        className="ad-placeholder"
        style={{
          width: adConfig.width,
          maxWidth: '100%',
          height: adConfig.height,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Ad icon */}
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.15)' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" style={{ margin: '0 auto 6px' }}>
            <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-9 13H7v-2h4v2zm6 0h-4v-2h4v2zm0-4H7V7h10v6z"/>
          </svg>
          <div style={{ fontSize: '12px', fontWeight: 600, fontFamily: 'Cairo, sans-serif' }}>
            {displayLabel}
          </div>
          <div style={{ fontSize: '10px', marginTop: '4px', color: 'rgba(255,255,255,0.1)' }}>
            مساحة إعلانية
          </div>
        </div>

        {/* Decorative corners */}
        <div style={{
          position: 'absolute', top: '4px', right: '4px',
          width: '8px', height: '8px',
          borderTop: '2px solid rgba(255,255,255,0.1)',
          borderRight: '2px solid rgba(255,255,255,0.1)',
        }} />
        <div style={{
          position: 'absolute', top: '4px', left: '4px',
          width: '8px', height: '8px',
          borderTop: '2px solid rgba(255,255,255,0.1)',
          borderLeft: '2px solid rgba(255,255,255,0.1)',
        }} />
        <div style={{
          position: 'absolute', bottom: '4px', right: '4px',
          width: '8px', height: '8px',
          borderBottom: '2px solid rgba(255,255,255,0.1)',
          borderRight: '2px solid rgba(255,255,255,0.1)',
        }} />
        <div style={{
          position: 'absolute', bottom: '4px', left: '4px',
          width: '8px', height: '8px',
          borderBottom: '2px solid rgba(255,255,255,0.1)',
          borderLeft: '2px solid rgba(255,255,255,0.1)',
        }} />
      </div>
    </div>
  );
}
