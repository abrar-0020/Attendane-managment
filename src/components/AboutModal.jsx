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
              <span className="am-logo-char">ア</span>
            </div>
            
            <h2 className="am-app-name">AttendMe</h2>
            
            <div className="am-badges">
              <span className="am-badge">v1.0.0</span>
              <span className="am-badge">Web</span>
            </div>
            
            <hr className="am-divider" />
            
            <div className="am-actions-grid">
              <button className="am-action-btn">
                <span className="material-symbols-outlined am-icon-accent">code</span>
                <span>GitHub</span>
              </button>
              <button className="am-action-btn">
                <span className="material-symbols-outlined am-icon-accent">language</span>
                <span>Website</span>
              </button>
              <button className="am-action-btn">
                <span className="material-symbols-outlined am-icon-accent">send</span>
                <span>Telegram</span>
              </button>
              <button className="am-action-btn">
                <span className="material-symbols-outlined am-icon-accent">local_cafe</span>
                <span>Donate</span>
              </button>
            </div>
          </section>

          {/* Developer Info */}
          <section className="am-dev-section">
            <h3 className="am-section-label">Lead Developer</h3>
            <div className="am-card am-dev-card">
              <div className="am-avatar">
                {/* Fallback to simple letter if image is not desired, but let's use the provided styling */}
                <div className="am-avatar-placeholder">A</div>
              </div>
              
              <div className="am-dev-info">
                <h4 className="am-dev-name">abrar-0020</h4>
                <p className="am-dev-sub">Developer</p>
              </div>
              
              <div className="am-social-links">
                <a href="#" className="am-social-btn" aria-label="GitHub">
                  <span className="material-symbols-outlined">code</span>
                </a>
                <a href="#" className="am-social-btn" aria-label="Website">
                  <span className="material-symbols-outlined">language</span>
                </a>
                <a href="#" className="am-social-btn" aria-label="Email">
                  <span className="material-symbols-outlined">alternate_email</span>
                </a>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
