import './AboutModal.css';

export default function AboutModal({ onClose }) {
  return (
    <div className="am-overlay">
      <div className="am-container">
        {/* Header */}
        <header className="am-header">
          <button className="am-back-btn" onClick={onClose} aria-label="Go back">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
        </header>

        {/* Main Content */}
        <main className="am-main">
          <h1 className="am-page-title">About</h1>

          {/* App Info Card */}
          <section className="am-card am-app-info">
            <div className="am-logo-container">
              <span className="material-symbols-outlined am-logo-char" style={{ fontSize: '48px' }}>fact_check</span>
            </div>
            
            <h2 className="am-app-name">AttendMe</h2>
            
            <div className="am-badges">
              <span className="am-badge">v1.0.0</span>
            </div>
            
            <p className="am-app-desc" style={{ color: 'var(--on-surface-variant)', fontSize: '14px', lineHeight: '1.5', margin: '0 0 24px 0', padding: '0 8px' }}>
              AttendMe is a streamlined, privacy-first attendance management tool designed to help students track their academic schedules effortlessly. All data is securely stored locally on your device.
            </p>
            
            <hr className="am-divider" />
            
            <div className="am-actions-grid" style={{ gridTemplateColumns: '1fr' }}>
              <button className="am-action-btn" onClick={() => window.open('https://github.com/abrar-0020/Attendane--managment-Antigravity-', '_blank')}>
                <span className="material-symbols-outlined am-icon-accent">code</span>
                <span>GitHub Repository</span>
              </button>
            </div>
          </section>

          {/* Developer Info */}
          <section className="am-dev-section">
            <h3 className="am-section-label">Lead Developer</h3>
            <div className="am-card am-dev-card">
              <div className="am-avatar">
                <div className="am-avatar-placeholder">A</div>
              </div>
              
              <div className="am-dev-info">
                <h4 className="am-dev-name">Abrar</h4>
                <p className="am-dev-sub">Creator & Lead Developer</p>
              </div>
              
              <div className="am-social-links">
                <a href="https://github.com/abrar-0020" target="_blank" rel="noopener noreferrer" className="am-social-btn" aria-label="GitHub">
                  <span className="material-symbols-outlined">code</span>
                </a>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
