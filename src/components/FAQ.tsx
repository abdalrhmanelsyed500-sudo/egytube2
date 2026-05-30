import { useState } from 'react';

const faqs = [
  {
    q: 'هل التحميل مجاني تماماً؟',
    a: 'نعم، إيجي تيوب مجاني 100% بدون أي رسوم خفية أو اشتراكات. يمكنك تحميل ما تريد بدون حدود.',
  },
  {
    q: 'ما هي أعلى جودة يمكن تحميلها؟',
    a: 'يدعم إيجي تيوب التحميل بجودة تصل إلى 4K Ultra HD (2160p)، بالإضافة إلى 1440p, 1080p, 720p وأقل.',
  },
  {
    q: 'هل يمكنني تحميل YouTube Shorts؟',
    a: 'بالتأكيد! فقط الصق رابط الـ Shorts في صندوق البحث وسيتم التعامل معه تلقائياً.',
  },
  {
    q: 'كيف أحوّل الفيديو إلى MP3؟',
    a: 'بعد تحليل الرابط، اختر تبويب "صوت MP3" واختر الجودة المناسبة (128kbps أو 320kbps).',
  },
  {
    q: 'هل يحفظ الموقع بياناتي؟',
    a: 'لا إطلاقاً. لا نحتفظ بأي بيانات، روابط، أو سجل تحميل. خصوصيتك مصانة تماماً.',
  },
  {
    q: 'لماذا الرابط لا يعمل أحياناً؟',
    a: 'قد يكون الفيديو خاصاً أو محمياً بحقوق الملكية. تأكد أن الفيديو عام ومتاح للمشاهدة في منطقتك.',
  },
  {
    q: 'هل يعمل على الموبايل؟',
    a: 'نعم! الموقع مصمم بالكامل للعمل على الموبايل والتابلت والكمبيوتر بنفس الكفاءة.',
  },
  {
    q: 'ما الفرق بين الجودات المختلفة؟',
    a: '4K/1080p تناسب الشاشات الكبيرة، 720p جيدة للموبايل، 360p/480p توفر البيانات، 144p للإنترنت البطيء.',
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section style={{ padding: '80px 20px', background: 'rgba(0,0,0,0.15)' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 900, color: 'white', margin: '0 0 12px' }}>
            الأسئلة <span className="gradient-text">الشائعة</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
            إجابات لأكثر الأسئلة التي يطرحها مستخدمونا
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {faqs.map((faq, i) => (
            <div
              key={i}
              style={{
                background: openIndex === i
                  ? 'rgba(229,9,20,0.06)'
                  : 'rgba(255,255,255,0.03)',
                border: `1px solid ${openIndex === i ? 'rgba(229,9,20,0.2)' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: '14px',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
              }}
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                style={{
                  width: '100%',
                  padding: '18px 20px',
                  background: 'transparent',
                  border: 'none',
                  color: openIndex === i ? 'white' : 'rgba(255,255,255,0.75)',
                  textAlign: 'right',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: 700,
                  fontFamily: 'Cairo, sans-serif',
                  gap: '12px',
                }}
              >
                <span style={{ flex: 1 }}>{faq.q}</span>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: openIndex === i ? 'rgba(229,9,20,0.2)' : 'rgba(255,255,255,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all 0.3s ease',
                  transform: openIndex === i ? 'rotate(45deg)' : 'none',
                  color: openIndex === i ? '#e50914' : 'rgba(255,255,255,0.5)',
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </div>
              </button>

              {openIndex === i && (
                <div style={{
                  padding: '0 20px 18px',
                  color: 'rgba(255,255,255,0.55)',
                  fontSize: '14px',
                  lineHeight: 1.7,
                  borderTop: '1px solid rgba(255,255,255,0.04)',
                  paddingTop: '14px',
                  animation: 'fadeInUp 0.3s ease',
                }}>
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
