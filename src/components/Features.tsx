import AdBanner from './AdBanner';

const features = [
  {
    icon: '⚡',
    title: 'تحميل خاطف السرعة',
    desc: 'نستخدم أسرع الخوادم وأحدث التقنيات لضمان تحميل فوري لفيديوهاتك.',
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(245,158,11,0.03))',
  },
  {
    icon: '🎯',
    title: 'جميع الجودات',
    desc: 'من 144p الاقتصادية حتى 4K Ultra HD — اختر ما يناسب احتياجاتك.',
    color: '#3b82f6',
    gradient: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(59,130,246,0.03))',
  },
  {
    icon: '🎵',
    title: 'تحميل الصوت MP3',
    desc: 'حوّل أي فيديو إلى ملف صوتي MP3 بجودة تصل إلى 320kbps.',
    color: '#ec4899',
    gradient: 'linear-gradient(135deg, rgba(236,72,153,0.1), rgba(236,72,153,0.03))',
  },
  {
    icon: '📱',
    title: 'متوافق مع كل الأجهزة',
    desc: 'يعمل بسلاسة على الموبايل، التابلت، والكمبيوتر بدون تطبيقات إضافية.',
    color: '#22c55e',
    gradient: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(34,197,94,0.03))',
  },
  {
    icon: '🔒',
    title: 'آمن ومحمي',
    desc: 'لا نحتفظ ببياناتك أو سجل تحميلاتك. خصوصيتك أولويتنا.',
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(139,92,246,0.03))',
  },
  {
    icon: '♾️',
    title: 'بلا حدود',
    desc: 'لا حد أقصى للتحميلات، لا سجل، لا اشتراك — مجاناً تماماً.',
    color: '#e50914',
    gradient: 'linear-gradient(135deg, rgba(229,9,20,0.1), rgba(229,9,20,0.03))',
  },
  {
    icon: '🎬',
    title: 'يدعم الشورتس',
    desc: 'حمّل YouTube Shorts بنفس سهولة الفيديوهات العادية.',
    color: '#f97316',
    gradient: 'linear-gradient(135deg, rgba(249,115,22,0.1), rgba(249,115,22,0.03))',
  },
  {
    icon: '🌍',
    title: 'بدون VPN',
    desc: 'يعمل من جميع الدول العربية وحول العالم بدون الحاجة لـ VPN.',
    color: '#06b6d4',
    gradient: 'linear-gradient(135deg, rgba(6,182,212,0.1), rgba(6,182,212,0.03))',
  },
  {
    icon: '🤖',
    title: 'محرك ذكي',
    desc: 'نظام ذكاء اصطناعي يختار أفضل مصدر تحميل تلقائياً لضمان النجاح.',
    color: '#a855f7',
    gradient: 'linear-gradient(135deg, rgba(168,85,247,0.1), rgba(168,85,247,0.03))',
  },
];

const steps = [
  {
    num: '01',
    title: 'انسخ الرابط',
    desc: 'انسخ رابط أي فيديو يوتيوب من شريط العنوان',
    icon: '📋',
  },
  {
    num: '02',
    title: 'الصق وحلّل',
    desc: 'الصق الرابط في صندوق البحث واضغط تحليل',
    icon: '🔍',
  },
  {
    num: '03',
    title: 'اختر الجودة',
    desc: 'اختر الجودة المناسبة من القائمة المتاحة',
    icon: '🎯',
  },
  {
    num: '04',
    title: 'حمّل وتمتع',
    desc: 'اضغط تحميل وانتهى! الفيديو محفوظ لديك',
    icon: '⬇️',
  },
];

export default function Features() {
  return (
    <>
      {/* How it works */}
      <section id="how-it-works" style={{ padding: '80px 20px', background: 'rgba(0,0,0,0.2)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 900, color: 'white', margin: '0 0 12px' }}>
              كيف تعمل؟ <span className="gradient-text">بـ 4 خطوات</span>
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '15px' }}>
              أبسط وأسرع طريقة لتحميل الفيديوهات
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '20px',
            position: 'relative',
          }}>
            {steps.map((step, i) => (
              <div
                key={step.num}
                className="card-hover step-card"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '16px',
                  padding: '28px 24px',
                  textAlign: 'center',
                  position: 'relative',
                  animationDelay: `${i * 0.1}s`,
                }}
              >
                <div style={{
                  fontSize: '40px',
                  marginBottom: '16px',
                  display: 'block',
                }}>
                  {step.icon}
                </div>
                <div style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: 'rgba(229,9,20,0.7)',
                  letterSpacing: '2px',
                  marginBottom: '8px',
                }}>
                  الخطوة {step.num}
                </div>
                <h3 style={{
                  fontSize: '17px',
                  fontWeight: 800,
                  color: 'white',
                  margin: '0 0 8px',
                }}>
                  {step.title}
                </h3>
                <p style={{
                  fontSize: '13px',
                  color: 'rgba(255,255,255,0.45)',
                  margin: 0,
                  lineHeight: 1.6,
                }}>
                  {step.desc}
                </p>

                {/* Arrow between steps */}
                {i < steps.length - 1 && (
                  <div style={{
                    position: 'absolute',
                    left: '-12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'rgba(229,9,20,0.3)',
                    display: 'none',
                    zIndex: 1,
                  }} className="step-arrow">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ad between sections */}
      <div style={{ padding: '20px', background: 'rgba(0,0,0,0.1)' }}>
        <AdBanner size="leaderboard" />
      </div>

      {/* Features Grid */}
      <section id="features" style={{ padding: '80px 20px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 900, color: 'white', margin: '0 0 12px' }}>
              لماذا <span className="gradient-text">إيجي تيوب</span>؟
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '15px', maxWidth: '500px', margin: '0 auto' }}>
              نقدم أفضل تجربة تحميل في العالم العربي بأحدث التقنيات
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '20px',
          }}>
            {features.map((f) => (
              <div
                key={f.title}
                className="card-hover"
                style={{
                  background: f.gradient,
                  border: `1px solid ${f.color}20`,
                  borderRadius: '16px',
                  padding: '24px',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: f.color + '20',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  marginBottom: '16px',
                }}>
                  {f.icon}
                </div>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: 800,
                  color: 'white',
                  margin: '0 0 8px',
                }}>
                  {f.title}
                </h3>
                <p style={{
                  fontSize: '13px',
                  color: 'rgba(255,255,255,0.5)',
                  margin: 0,
                  lineHeight: 1.6,
                }}>
                  {f.desc}
                </p>

                {/* Decorative icon */}
                <div style={{
                  position: 'absolute',
                  bottom: '-10px',
                  left: '-10px',
                  fontSize: '80px',
                  opacity: 0.04,
                  pointerEvents: 'none',
                  lineHeight: 1,
                }}>
                  {f.icon}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Supported Formats Banner */}
      <section style={{
        padding: '60px 20px',
        background: 'linear-gradient(135deg, rgba(229,9,20,0.08), rgba(102,126,234,0.06))',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'white', margin: '0 0 8px' }}>
            جميع الجودات والصيغ المدعومة
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '32px', fontSize: '14px' }}>
            اختر الجودة المناسبة لجهازك وسرعة الإنترنت لديك
          </p>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
            {[
              { label: '4K Ultra HD', sub: '2160p', color: '#f59e0b', icon: '⭐' },
              { label: 'QHD', sub: '1440p', color: '#8b5cf6', icon: '💎' },
              { label: 'Full HD', sub: '1080p', color: '#3b82f6', icon: '🔵' },
              { label: 'HD', sub: '720p', color: '#22c55e', icon: '🟢' },
              { label: 'SD', sub: '480p', color: '#f97316', icon: '🟠' },
              { label: 'بيانات أقل', sub: '360p', color: '#6b7280', icon: '⚪' },
              { label: 'اقتصادي', sub: '240p', color: '#6b7280', icon: '⚫' },
              { label: 'ضعيف الإنترنت', sub: '144p', color: '#6b7280', icon: '📶' },
              { label: 'MP3 جودة عالية', sub: '320kbps', color: '#ec4899', icon: '🎵' },
              { label: 'MP3 عادي', sub: '128kbps', color: '#ec4899', icon: '🎶' },
            ].map((q) => (
              <div
                key={q.sub}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${q.color}30`,
                  borderRadius: '12px',
                  padding: '12px 20px',
                  textAlign: 'center',
                  minWidth: '110px',
                }}
              >
                <div style={{ fontSize: '20px', marginBottom: '4px' }}>{q.icon}</div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: q.color }}>{q.sub}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>{q.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Side ad placeholder area */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '30px 20px' }}>
        <AdBanner size="rectangle" />
      </div>
    </>
  );
}
