import Header from './components/Header';
import Hero from './components/Hero';
import Downloader from './components/Downloader';
import Features from './components/Features';
import FAQ from './components/FAQ';
import Footer from './components/Footer';
import FloatingAds from './components/FloatingAds';
import AdBanner from './components/AdBanner';

export default function App() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark)' }}>
      {/* Header */}
      <Header />

      {/* Hero Section */}
      <Hero />

      {/* Main Downloader */}
      <Downloader />

      {/* Mid-page ad */}
      <div style={{ padding: '10px 20px', maxWidth: '800px', margin: '0 auto' }}>
        <AdBanner size="leaderboard" label="مساحة إعلانية وسط الصفحة" />
      </div>

      {/* Features & How it works */}
      <Features />

      {/* FAQ */}
      <FAQ />

      {/* Footer */}
      <Footer />

      {/* Floating ads & scroll to top */}
      <FloatingAds />

      {/* Global keyframes */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 8px rgba(34,197,94,0.6); }
          50% { box-shadow: 0 0 20px rgba(34,197,94,0.9), 0 0 40px rgba(34,197,94,0.4); }
        }
      `}</style>
    </div>
  );
}
