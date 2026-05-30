import AdBanner from './AdBanner';

const stats = [
  { value: '+5M', label: 'تحميل ناجح' },
  { value: '10', label: 'جودات متاحة' },
  { value: '100%', label: 'مجاني' },
  { value: '⚡', label: 'سريع جداً' },
];

const features = [
  { icon: '🎯', text: 'بدون تسجيل' },
  { icon: '🔒', text: 'آمن وخاص' },
  { icon: '📱', text: 'يعمل على الموبايل' },
  { icon: '♾️', text: 'بلا حدود' },
];

export default function Hero() {
  return (
    <section
      id="home"
      style={{
        padding: '80px 20px 40px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        backgroundImage: 'url(/hero-bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Dark overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to bottom, rgba(10,10,15,0.85) 0%, rgba(10,10,15,0.7) 50%, rgba(10,10,15,0.95) 100%)',
        pointerEvents: 'none',
      }} />
      {/* Animated background circles */}
      <div style={{
        position: 'absolute', top: '10%', right: '5%',
        width: '300px', height: '300px',
        background: 'radial-gradient(circle, rgba(229,9,20,0.06) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none',
        animation: 'float 6s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', bottom: '10%', left: '5%',
        width: '250px', height: '250px',
        background: 'radial-gradient(circle, rgba(102,126,234,0.06) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none',
        animation: 'float 8s ease-in-out infinite reverse',
      }} />

      <div style={{ maxWidth: '900px', margin: '0 auto', position: 'relative', zIndex: 2 }}>
        
        {/* Badge */}
        <div className="animate-fadeInUp" style={{ marginBottom: '24px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(229,9,20,0.1)',
            border: '1px solid rgba(229,9,20,0.25)',
            borderRadius: '50px',
            padding: '8px 20px',
          }}>
            <span style={{ fontSize: '16px' }}>🇪🇬</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.8)', letterSpacing: '1px' }}>
              أقوى موقع تحميل عربي
            </span>
            <div style={{
              width: '6px', height: '6px',
              borderRadius: '50%',
              background: '#22c55e',
              boxShadow: '0 0 8px #22c55e',
            }} />
          </div>
        </div>

        {/* Main Title */}
        <h1
          className="animate-fadeInUp hero-title"
          style={{
            fontSize: '4rem',
            fontWeight: 900,
            lineHeight: 1.2,
            margin: '0 0 24px',
            animationDelay: '0.1s',
          }}
        >
          <span style={{ color: 'white' }}>تحميل فيديوهات </span>
          <span className="gradient-text">يوتيوب</span>
          <br />
          <span style={{ color: 'white' }}>بجميع الجودات </span>
          <span style={{ color: '#f5a623' }}>مجاناً 🚀</span>
        </h1>

        {/* Subtitle */}
        <p
          className="animate-fadeInUp"
          style={{
            fontSize: '18px',
            color: 'rgba(255,255,255,0.55)',
            maxWidth: '600px',
            margin: '0 auto 32px',
            lineHeight: 1.7,
            animationDelay: '0.2s',
          }}
        >
          أسرع وأسهل طريقة لتحميل فيديوهات يوتيوب بجودة تصل إلى
          <strong style={{ color: 'rgba(255,255,255,0.8)' }}> 4K Ultra HD </strong>
          — بدون تسجيل، بدون مشكلات!
        </p>

        {/* Feature pills */}
        <div
          className="animate-fadeInUp"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px',
            justifyContent: 'center',
            marginBottom: '40px',
            animationDelay: '0.3s',
          }}
        >
          {features.map((f) => (
            <div
              key={f.text}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '50px',
                padding: '8px 16px',
                color: 'rgba(255,255,255,0.75)',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              <span>{f.icon}</span>
              <span>{f.text}</span>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div
          className="animate-fadeInUp"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
            maxWidth: '700px',
            margin: '0 auto 40px',
            animationDelay: '0.4s',
          }}
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="glass card-hover"
              style={{
                borderRadius: '14px',
                padding: '16px 12px',
                textAlign: 'center',
              }}
            >
              <div className="stat-number" style={{ fontSize: '28px', fontWeight: 900 }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '4px', fontWeight: 600 }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* CTA Arrow */}
        <div style={{ color: 'rgba(255,255,255,0.3)', animation: 'float 2s ease-in-out infinite' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {/* Ticker */}
      <div style={{
        marginTop: '40px',
        overflow: 'hidden',
        padding: '12px 0',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(0,0,0,0.2)',
        position: 'relative',
        zIndex: 2,
      }}>
        <div className="ticker-inner">
          {[...Array(2)].map((_, i) => (
            <div key={i} style={{ display: 'flex', gap: '40px', paddingLeft: '40px' }}>
              {['🎬 تحميل 4K', '🎵 MP3 عالي الجودة', '📱 يدعم الشورتس', '⚡ تحميل فوري', '🔒 آمن ومجاني', '🌍 بدون قيود', '💎 1080p HD', '🎯 بدون إعلانات مزعجة'].map((item, j) => (
                <span
                  key={j}
                  style={{
                    color: 'rgba(255,255,255,0.35)',
                    fontSize: '13px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  {item}
                  <span style={{ color: 'rgba(229,9,20,0.4)' }}>•</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Ad in hero area */}
      <div style={{ maxWidth: '800px', margin: '20px auto 0', position: 'relative', zIndex: 2 }}>
        <AdBanner size="banner" label="إعلان ممول - مساحة 728×90" />
      </div>
    </section>
  );
}
