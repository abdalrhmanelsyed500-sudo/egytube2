import { useState, useEffect } from 'react';

export default function FloatingAds() {
  const [visible, setVisible] = useState(false);
  const [sideAdsVisible, setSideAdsVisible] = useState(false);

  useEffect(() => {
    // Show after scroll
    const handleScroll = () => {
      setVisible(window.scrollY > 400);
      setSideAdsVisible(window.scrollY > 600);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* Sticky bottom ad bar */}
      {visible && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          background: 'rgba(10,10,15,0.97)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          animation: 'fadeInUp 0.4s ease',
        }}>
          {/* Close button */}
          <button
            onClick={() => setVisible(false)}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'rgba(255,255,255,0.08)',
              border: 'none',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
            }}
          >
            ×
          </button>

          {/* Ad label */}
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', fontWeight: 600, letterSpacing: '1px' }}>
            إعلان
          </span>

          {/* Ad content area */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px dashed rgba(255,255,255,0.08)',
            borderRadius: '8px',
            padding: '8px 20px',
            color: 'rgba(255,255,255,0.15)',
            fontSize: '12px',
            fontFamily: 'Cairo, sans-serif',
            minWidth: '320px',
            justifyContent: 'center',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
              <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-9 13H7v-2h4v2zm6 0h-4v-2h4v2zm0-4H7V7h10v6z"/>
            </svg>
            <span>مساحة إعلانية ثابتة - 320×50</span>
          </div>
        </div>
      )}

      {/* Left sidebar ad (desktop only) */}
      {sideAdsVisible && (
        <div
          style={{
            position: 'fixed',
            left: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 40,
            display: 'none', // Will show via CSS on large screens
          }}
          className="sidebar-ad-left"
        >
          <div style={{
            background: 'rgba(10,10,15,0.9)',
            border: '1px dashed rgba(255,255,255,0.08)',
            borderRadius: '10px',
            width: '120px',
            height: '500px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(255,255,255,0.12)',
            fontSize: '11px',
            gap: '8px',
            fontFamily: 'Cairo, sans-serif',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z"/>
            </svg>
            <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
              مساحة إعلانية 120×500
            </span>
          </div>
        </div>
      )}

      {/* Right sidebar ad (desktop only) */}
      {sideAdsVisible && (
        <div
          style={{
            position: 'fixed',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 40,
            display: 'none',
          }}
          className="sidebar-ad-right"
        >
          <div style={{
            background: 'rgba(10,10,15,0.9)',
            border: '1px dashed rgba(255,255,255,0.08)',
            borderRadius: '10px',
            width: '120px',
            height: '500px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(255,255,255,0.12)',
            fontSize: '11px',
            gap: '8px',
            fontFamily: 'Cairo, sans-serif',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z"/>
            </svg>
            <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
              مساحة إعلانية 120×500
            </span>
          </div>
        </div>
      )}

      {/* Scroll to top button */}
      {visible && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          style={{
            position: 'fixed',
            bottom: visible ? '70px' : '20px',
            left: '20px',
            zIndex: 60,
            width: '44px',
            height: '44px',
            background: 'linear-gradient(135deg, #e50914, #b00710)',
            border: 'none',
            borderRadius: '50%',
            cursor: 'pointer',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(229,9,20,0.4)',
            animation: 'fadeInUp 0.4s ease',
            transition: 'all 0.3s ease',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
      )}

      <style>{`
        @media (min-width: 1400px) {
          .sidebar-ad-left, .sidebar-ad-right { display: block !important; }
        }
      `}</style>
    </>
  );
}
