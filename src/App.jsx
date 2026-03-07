import { useState, useEffect, useRef } from 'react';
import { storage } from './services/storage';
import SplashScreen from './components/SplashScreen';
import ProfileSetup from './components/ProfileSetup';
import TimetableView from './components/TimetableView';
import SummaryView from './components/SummaryView';
import TimetableEditor from './components/TimetableEditor';
import ShareTimetable from './components/ShareTimetable';
import './App.css';

export default function App() {
  const [appState, setAppState] = useState('splash'); // splash, setup, main
  const [activeTab, setActiveTab] = useState(0); // 0: Timetable, 1: Summary, 2: Settings
  const [slideDir, setSlideDir] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [sharedCode, setSharedCode] = useState(null);
  const touchStartX = useRef(null);
  
  const APP_VERSION = 'v11';
  const [showUpdateToast, setShowUpdateToast] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shareQuery = params.get('share');
    if (shareQuery) {
      setSharedCode(shareQuery);
      window.history.replaceState({}, '', window.location.pathname);
    }

    const timer = setTimeout(() => {
      if (storage.hasProfile()) {
        setAppState('main');
        checkUpdateNotif();
      } else {
        setAppState('setup');
      }
    }, 1800);

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const checkUpdateNotif = () => {
    const notified = storage.getNotifiedVersion();
    if (notified !== APP_VERSION) {
      setShowUpdateToast(true);
      setTimeout(() => setShowUpdateToast(false), 15000);
      document.addEventListener('visibilitychange', handleVisibilityChange);
      storage.saveNotifiedVersion(APP_VERSION);
    }
  };

  const handleVisibilityChange = () => {
    if (document.hidden) {
      if ('serviceWorker' in navigator && Notification.permission === 'granted') {
        navigator.serviceWorker.ready.then(reg => {
          reg.showNotification('Attendknow updated!', {
            body: 'Run in background capabilities attached.',
            requireInteraction: true
          });
        });
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  };

  const navigateTab = (newTab) => {
    if (isAnimating || newTab === activeTab) return;
    if (newTab < 0 || newTab > 2) return;
    
    setSlideDir(newTab > activeTab ? 'slide-in-right' : 'slide-in-left');
    setActiveTab(newTab);
    setIsAnimating(true);
    window.scrollTo(0, 0);
    setTimeout(() => setIsAnimating(false), 320);
  };

  const handleTouchStart = (e) => {
    if (e.target.closest('.date-selector-container')) return;
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    
    if (Math.abs(diff) > 50) {
      if (diff > 0) navigateTab(activeTab + 1); // swipe left = next
      else navigateTab(activeTab - 1); // swipe right = prev
    }
    touchStartX.current = null;
  };

  if (appState === 'splash') {
    return (
      <>
        <SplashScreen />
        {sharedCode && <ShareTimetable initialImportCode={sharedCode} onClose={() => setSharedCode(null)} />}
      </>
    );
  }

  if (appState === 'setup') {
    return (
      <>
        <ProfileSetup onComplete={() => setAppState('main')} />
        {sharedCode && <ShareTimetable initialImportCode={sharedCode} onClose={() => setSharedCode(null)} />}
      </>
    );
  }

  return (
    <div className="app-container" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      
      {showUpdateToast && (
        <div className="update-toast">
          <span>📲 Press home button now to get notification!</span>
          <button onClick={() => setShowUpdateToast(false)}>✕</button>
        </div>
      )}

      {deferredPrompt && (
        <div className="update-toast" style={{ top: showUpdateToast ? '70px' : '16px', background: 'var(--success)', zIndex: 1999 }}>
          <span>Install Attendknow to your Home Screen</span>
          <button style={{ background: 'white', color: 'var(--success)', fontWeight: 'bold' }} onClick={handleInstallClick}>Install</button>
        </div>
      )}

      <div className={`main-content ${isAnimating ? `page-transition-enter ${slideDir}` : ''}`}>
        {activeTab === 0 && <TimetableView />}
        {activeTab === 1 && <SummaryView />}
        {activeTab === 2 && <TimetableEditor />}
      </div>

      <nav className="bottom-nav">
        <button className={`nav-item ${activeTab === 0 ? 'active' : ''}`} onClick={() => navigateTab(0)}>
          <span className="nav-icon">🗓️</span>
          <span>Timetable</span>
        </button>
        <button className={`nav-item ${activeTab === 1 ? 'active' : ''}`} onClick={() => navigateTab(1)}>
           <span className="nav-icon">📊</span>
          <span>Summary</span>
        </button>
        <button className={`nav-item ${activeTab === 2 ? 'active' : ''}`} onClick={() => navigateTab(2)}>
           <span className="nav-icon">⚙️</span>
          <span>Settings</span>
        </button>
      </nav>
      {sharedCode && <ShareTimetable initialImportCode={sharedCode} onClose={() => setSharedCode(null)} />}
    </div>
  );
}
