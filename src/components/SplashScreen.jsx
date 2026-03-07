import './SplashScreen.css';

export default function SplashScreen() {
  return (
    <div className="splash-screen">
      <div className="logo-container">
        <div className="logo-icon">🗓️</div>
        <h1 className="logo-text">Attendit</h1>
        <div className="loading-dots">
          <div></div><div></div><div></div>
        </div>
      </div>
    </div>
  );
}
