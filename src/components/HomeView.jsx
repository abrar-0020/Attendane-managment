import { useState, useEffect } from 'react';
import { storage } from '../services/storage';
import { timetableService } from '../services/timetable';
import { dateUtils } from '../utils/dateUtils';
import './HomeView.css';

export default function HomeView({ onNavigate }) {
  const [profile, setProfile] = useState({ name: 'Student' });
  const [overall, setOverall] = useState({ attended: 0, total: 0, bunksLeft: 0, percentage: 0 });
  const [nextClass, setNextClass] = useState(null);
  const [safetyMsg, setSafetyMsg] = useState('');

  useEffect(() => {
    const p = storage.getProfile() || { name: 'Student' };
    setProfile(p);
    computeStats();
    findNextClass();
  }, []);

  const computeStats = () => {
    const timetable = storage.getTimetable();
    const records = storage.getRecords();
    const baseCounts = storage.getBaseCounts();
    const subjects = [...new Set(timetable.map(t => t.subject))];

    let totalAttended = 0;
    let totalClasses = 0;

    subjects.forEach(sub => {
      const subRecords = records.filter(r => r.subject === sub && r.status !== 'unmarked');
      const presentRecs = subRecords.filter(r => r.status === 'present').length;
      const totalRecs = subRecords.length;
      const baseTotal = baseCounts[sub] ? baseCounts[sub].total : 0;
      const baseAttended = baseCounts[sub] ? baseCounts[sub].attended : 0;
      totalAttended += (presentRecs + baseAttended);
      totalClasses += (totalRecs + baseTotal);
    });

    const percentage = totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 100) : 0;
    // Bunks left: how many more you can miss while staying at 75%
    const bunksLeft = totalClasses > 0 ? Math.max(0, Math.floor((totalAttended / 0.75) - totalClasses)) : 0;

    setOverall({ attended: totalAttended, total: totalClasses, bunksLeft, percentage });

    if (percentage >= 90) setSafetyMsg("You're doing great! 🎉");
    else if (percentage >= 75) setSafetyMsg("You're safe this week");
    else setSafetyMsg("Attendance needs attention");
  };

  const findNextClass = () => {
    const todayStr = dateUtils.formatDate(new Date());
    const todayClasses = timetableService.getClassesForDate(todayStr);
    const records = storage.getRecords().filter(r => r.date === todayStr);
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Find first class that hasn't been marked yet or is coming up
    const next = todayClasses.find(cls => {
      if (!cls.starttime) return false;
      const [h, m] = cls.starttime.split(':').map(Number);
      const classMinutes = h * 60 + (m || 0);
      const rec = records.find(r => r.hour === cls.hour && r.subject === cls.subject);
      return classMinutes >= currentMinutes - 30 && !rec; // within 30min past or future
    });
    setNextClass(next || null);
  };

  const markClass = (status) => {
    if (!nextClass) return;
    const todayStr = dateUtils.formatDate(new Date());
    storage.addRecord({ date: todayStr, subject: nextClass.subject, hour: nextClass.hour, status });
    if (navigator.vibrate) {
      navigator.vibrate(status === 'present' ? 40 : [60, 30, 60]);
    }
    computeStats();
    findNextClass();
  };

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good morning';
    if (hr < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getTodayLabel = () => {
    const now = new Date();
    return now.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const firstName = profile.name ? profile.name.split(' ')[0] : 'Student';
  const avatarInitial = firstName[0]?.toUpperCase() || 'S';

  // SVG ring calculation
  const RADIUS = 65;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  // Ring shows how many bunks are safe (capped at some max for display)
  const maxBunks = Math.max(overall.bunksLeft, 10);
  const fraction = Math.min(overall.bunksLeft / maxBunks, 1);
  const dashOffset = CIRCUMFERENCE - fraction * CIRCUMFERENCE;

  const isSafe = overall.percentage >= 75;

  return (
    <div className="home-view">
      {/* Header */}
      <header className="home-header">
        <div className="home-header-text">
          <span className="home-date-label">{getTodayLabel()}</span>
          <h1 className="home-greeting">{getGreeting()}, {firstName}</h1>
        </div>
        <div className="home-avatar">{avatarInitial}</div>
      </header>

      <main className="home-main">
        {/* Status Ring Section */}
        <section className="home-ring-section">
          <div className="home-ring-wrapper">
            <svg className="home-ring-svg" viewBox="0 0 150 150">
              {/* Background track */}
              <circle
                cx="75" cy="75" r={RADIUS}
                fill="transparent"
                stroke={isSafe ? 'rgba(18,109,39,0.12)' : 'rgba(186,26,26,0.12)'}
                strokeWidth="10"
                strokeLinecap="round"
              />
              {/* Progress arc */}
              <circle
                cx="75" cy="75" r={RADIUS}
                fill="transparent"
                stroke={isSafe ? 'var(--secondary-container)' : 'var(--error-container)'}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
                style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 0.6s ease' }}
              />
            </svg>
            <div className="home-ring-center">
              <span className="home-ring-number">{overall.bunksLeft}</span>
              <span className="home-ring-label">bunks left</span>
            </div>
          </div>
          <p className={`home-safety-msg ${isSafe ? 'safe' : 'danger'}`}>{safetyMsg}</p>
        </section>

        {/* Up Next Section */}
        {nextClass ? (
          <section className="home-next-section">
            <h2 className="home-section-label">Up next</h2>
            <div className="home-next-card">
              <div className="home-next-dot" />
              <h3 className="home-next-subject">{nextClass.subject}</h3>
              <p className="home-next-meta">
                {nextClass.starttime} – {nextClass.endtime}
                {nextClass.room ? ` · ${nextClass.room}` : ''}
              </p>
              <div className="home-next-actions">
                <button
                  className="home-action-btn missed"
                  onClick={() => markClass('absent')}
                >
                  <span className="material-symbols-outlined">close</span>
                  <span>Missed</span>
                </button>
                <button
                  className="home-action-btn attended"
                  onClick={() => markClass('present')}
                >
                  <span className="material-symbols-outlined">check</span>
                  <span>Attended</span>
                </button>
              </div>
              <p className="home-next-hint">Tap Attended or Missed</p>
            </div>
          </section>
        ) : (
          <section className="home-next-section">
            <h2 className="home-section-label">Up next</h2>
            <div className="home-next-card home-next-empty">
              <span className="material-symbols-outlined home-empty-icon">check_circle</span>
              <p className="home-empty-text">No more classes today!</p>
              <span className="home-empty-sub">Enjoy your day 🎉</span>
            </div>
          </section>
        )}

        {/* Overall summary */}
        <section className="home-summary-row">
          <div className="home-stat-chip">
            <span className="home-stat-label">Attended</span>
            <span className="home-stat-value">{overall.attended}</span>
          </div>
          <div className="home-stat-chip">
            <span className="home-stat-label">Missed</span>
            <span className="home-stat-value">{overall.total - overall.attended}</span>
          </div>
          <div className="home-stat-chip">
            <span className="home-stat-label">Overall</span>
            <span className="home-stat-value">{overall.percentage}%</span>
          </div>
        </section>

        {/* Footer link */}
        <div className="home-footer-link">
          <button className="home-link-btn" onClick={() => onNavigate(2)}>
            View today's full schedule →
          </button>
        </div>
      </main>
    </div>
  );
}
