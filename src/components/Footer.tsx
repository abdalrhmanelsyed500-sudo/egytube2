import AdBanner from './AdBanner';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer style={{
      background: 'rgba(0,0,0,0.5)',
      borderTop: '1px solid rgba(255,255,255,0.06)',
    }}>
      {/* Ad above footer */}
      <div style={{ padding: '30px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <AdBanner size="leaderboard" label="إعلان فوتر - 728×90" />
      </div>

      {/* Footer main */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 20px 24px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '32px',
          marginBottom: '40px',
        }}>
          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{
                width: '40px', height: '40px',
                background: 'linear-gradient(135deg, #e50914, #b00710)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 15px rgba(229,9,20,0.3)',
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V9.01a8.26 8.26 0 0 0 4.84 1.56V7.13a4.85 4.85 0 0 1-1.07-.44z"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: 'white' }}>
                  <span style={{ color: '#e50914' }}>إيجي</span> تيوب
                </div>
              </div>
            </div>
            <p style={{
              color: 'rgba(255,255,255,0.35)',
              fontSize: '13px',
              lineHeight: 1.7,
              margin: '0 0 16px',
            }}>
              أفضل موقع عربي لتحميل فيديوهات يوتيوب مجاناً بجميع الجودات. سريع، آمن، وبدون حدود.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              {/* Social icons placeholder */}
              {['twitter', 'telegram', 'whatsapp'].map((social) => (
                <div
                  key={social}
                  style={{
                    width: '36px', height: '36px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '16px',
                  }}
                >
                  {social === 'twitter' && '🐦'}
                  {social === 'telegram' && '✈️'}
                  {social === 'whatsapp' && '📱'}
                </div>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 style={{ color: 'white', fontWeight: 800, fontSize: '15px', margin: '0 0 16px' }}>
              روابط سريعة
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: 'الرئيسية', href: '#home' },
                { label: 'تحميل الفيديو', href: '#downloader' },
                { label: 'كيف يعمل', href: '#how-it-works' },
                { label: 'المميزات', href: '#features' },
                { label: 'الأسئلة الشائعة', href: '#faq' },
              ].map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  style={{
                    color: 'rgba(255,255,255,0.4)',
                    textDecoration: 'none',
                    fontSize: '13px',
                    fontWeight: 600,
                    transition: 'color 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  onMouseEnter={(e) => (e.target as HTMLAnchorElement).style.color = '#e50914'}
                  onMouseLeave={(e) => (e.target as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.4)'}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          {/* Formats */}
          <div>
            <h4 style={{ color: 'white', fontWeight: 800, fontSize: '15px', margin: '0 0 16px' }}>
              الصيغ المدعومة
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {['4K', '2K', '1080p', '720p', '480p', '360p', '240p', '144p', 'MP3', 'M4A'].map((fmt) => (
                <span
                  key={fmt}
                  style={{
                    background: 'rgba(229,9,20,0.08)',
                    border: '1px solid rgba(229,9,20,0.15)',
                    borderRadius: '6px',
                    padding: '3px 10px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.5)',
                  }}
                >
                  {fmt}
                </span>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div id="contact">
            <h4 style={{ color: 'white', fontWeight: 800, fontSize: '15px', margin: '0 0 16px' }}>
              تواصل معنا
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
                <span>📧</span>
                <span>support@egytube.com</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
                <span>💬</span>
                <span>تلغرام: @EgyTubeSupport</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
                <span>⏰</span>
                <span>متاح 24/7</span>
              </div>
            </div>

            {/* Newsletter placeholder */}
            <div style={{
              marginTop: '16px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '10px',
              padding: '14px',
            }}>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', fontWeight: 600 }}>
                📬 اشترك لتصلك التحديثات
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="email"
                  placeholder="بريدك الإلكتروني"
                  style={{
                    flex: 1,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    color: 'white',
                    fontSize: '12px',
                    fontFamily: 'Cairo, sans-serif',
                    direction: 'rtl',
                  }}
                />
                <button style={{
                  background: 'linear-gradient(135deg, #e50914, #b00710)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontFamily: 'Cairo, sans-serif',
                  fontWeight: 700,
                }}>
                  اشترك
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.05)',
          paddingTop: '24px',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
        }}>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>
            © {currentYear} إيجي تيوب — جميع الحقوق محفوظة
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            {['سياسة الخصوصية', 'شروط الاستخدام', 'إزالة المحتوى'].map((link) => (
              <a
                key={link}
                href="#"
                style={{
                  color: 'rgba(255,255,255,0.25)',
                  textDecoration: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                {link}
              </a>
            ))}
          </div>
          <div style={{
            color: 'rgba(255,255,255,0.25)',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}>
            <span>صُنع بـ</span>
            <span style={{ color: '#e50914' }}>❤️</span>
            <span>للعالم العربي</span>
          </div>
        </div>

        {/* Disclaimer */}
        <div style={{
          marginTop: '16px',
          padding: '12px 16px',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.04)',
          borderRadius: '8px',
          fontSize: '11px',
          color: 'rgba(255,255,255,0.2)',
          lineHeight: 1.5,
          textAlign: 'center',
        }}>
          ⚠️ إيجي تيوب هو موقع للتحميل الشخصي فقط. نلتزم بقوانين حقوق الملكية الفكرية. 
          يرجى تحميل المحتوى العام فقط المسموح بتحميله. المستخدم مسؤول عن الاستخدام.
        </div>
      </div>
    </footer>
  );
}
