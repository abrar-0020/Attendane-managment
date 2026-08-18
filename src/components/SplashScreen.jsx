import './SplashScreen.css';

export default function SplashScreen() {
  return (
    <div className="splash-screen">
      <div className="splash-content">
        <div className="splash-icon">
          <span className="material-symbols-outlined splash-icon-symbol">fact_check</span>
        </div>
        <h1 className="splash-title">AttendMe</h1>
        <p className="splash-tagline">Track. Know. Stay Safe.</p>
        <div className="splash-loader">
          <div className="splash-dot"></div>
          <div className="splash-dot"></div>
          <div className="splash-dot"></div>
        </div>
      </div>
    </div>
  );
}
