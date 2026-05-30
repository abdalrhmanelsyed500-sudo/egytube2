import { useState } from 'react';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { label: 'الرئيسية', href: '#home' },
    { label: 'كيف تعمل', href: '#how-it-works' },
    { label: 'المميزات', href: '#features' },
    { label: 'تواصل معنا', href: '#contact' },
  ];

  return (
    <header
      style={{
        background: 'rgba(10,10,15,0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Top ad bar */}
      <div
        style={{
          background: 'linear-gradient(90deg, #e50914, #b00710)',
          padding: '6px 0',
          textAlign: 'center',
          fontSize: '13px',
          fontWeight: 600,
          color: 'white',
        }}
      >
        <span>🎉 مجاناً 100% - تحميل فيديوهات يوتيوب بجميع الجودات بدون حدود!</span>
      </div>

      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
          
          {/* Logo */}
          <a href="#home" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                background: 'linear-gradient(135deg, #e50914, #b00710)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 15px rgba(229,9,20,0.4)',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V9.01a8.26 8.26 0 0 0 4.84 1.56V7.13a4.85 4.85 0 0 1-1.07-.44z"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: 'white', lineHeight: 1.1 }}>
                <span style={{ color: '#e50914' }}>إيجي</span>
                <span style={{ color: 'white' }}> تيوب</span>
              </div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 500, letterSpacing: '1px' }}>
                EGY TUBE
              </div>
            </div>
          </a>

          {/* Desktop Nav */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '8px' }} className="hidden-mobile">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                style={{
                  color: 'rgba(255,255,255,0.75)',
                  textDecoration: 'none',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLAnchorElement).style.color = 'white';
                  (e.target as HTMLAnchorElement).style.background = 'rgba(229,9,20,0.12)';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.75)';
                  (e.target as HTMLAnchorElement).style.background = 'transparent';
                }}
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* CTA Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <a
              href="#downloader"
              className="btn-primary"
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: 700,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #e50914, #b00710)',
                color: 'white',
                transition: 'all 0.3s ease',
              }}
            >
              <span>⬇️</span>
              <span>ابدأ التحميل</span>
            </a>

            {/* Mobile menu button */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: 'none',
                borderRadius: '8px',
                padding: '8px',
                cursor: 'pointer',
                color: 'white',
                display: 'none',
              }}
              className="mobile-menu-btn"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {menuOpen ? (
                  <path d="M18 6L6 18M6 6l12 12" />
                ) : (
                  <>
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div
            style={{
              padding: '12px 0 16px',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                style={{
                  color: 'rgba(255,255,255,0.75)',
                  textDecoration: 'none',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: 600,
                  display: 'block',
                }}
              >
                {item.label}
              </a>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .hidden-mobile { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </header>
  );
}
