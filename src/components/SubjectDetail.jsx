import { useState, useEffect } from 'react';
import { storage } from '../services/storage';
import './SubjectDetail.css';

export default function SubjectDetail({ stat, onClose }) {
  const [history, setHistory] = useState([]);
  const [room, setRoom] = useState('');

  useEffect(() => {
    // Get room from timetable
    const tt = storage.getTimetable().find(t => t.subject === stat.subject);
    if (tt && tt.room) {
      setRoom(tt.room);
    }

    // Get history records for this subject
    const allRecords = storage.getRecords();
    const subjectRecords = allRecords
      .filter(r => r.subject === stat.subject && r.status !== 'unmarked')
      .sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort descending

    setHistory(subjectRecords);
  }, [stat.subject]);

  const threshold = storage.getNotificationPrefs().attendanceThreshold || 75;

  const getStatusColor = (status) => {
    switch (status) {
      case 'present': return 'var(--secondary)';
      case 'absent': return 'var(--error)';
      case 'excused': return 'var(--outline)';
      default: return 'var(--outline-variant)';
    }
  };

  const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <div className="sd-overlay">
      <header className="sd-header">
        <button className="sd-icon-btn" onClick={onClose}>
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="sd-app-title">AttendMe</div>
        <button className="sd-icon-btn">
          <span className="material-symbols-outlined">notifications</span>
        </button>
      </header>

      <main className="sd-main">
        {/* Subject Header */}
        <section className="sd-section">
          <div className="sd-subject-indicator"></div>
          <h1 className="sd-subject-title">
            {stat.subjectName && stat.subjectName !== stat.subject ? (
              <>
                <span style={{ fontSize: '14px', color: 'var(--primary)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.subject}</span>
                {stat.subjectName}
              </>
            ) : (
              stat.subject
            )}
          </h1>
          <p className="sd-subject-meta">{room ? `Room ${room}` : 'No room assigned'}</p>

          {/* Stat Row */}
          <div className="sd-stats-row">
            <div className="sd-stat-box">
              <p className="sd-stat-label">Attended</p>
              <p className="sd-stat-value">{stat.attended}</p>
            </div>
            <div className="sd-stat-box">
              <p className="sd-stat-label">Missed</p>
              <p className="sd-stat-value">{stat.total - stat.attended}</p>
            </div>
            <div className="sd-stat-box text-right">
              <p className="sd-stat-label">Total</p>
              <p className="sd-stat-value text-primary">{stat.percentage}%</p>
            </div>
          </div>
        </section>

        {/* Insights Pill */}
        <section className="sd-section">
          {stat.total > 0 && stat.percentage >= threshold && (
            <div className="sd-insight-pill info">
              <span className="material-symbols-outlined">trending_up</span>
              <p>Can miss {stat.buffer} class{stat.buffer !== 1 ? 'es' : ''} safely</p>
            </div>
          )}
          {stat.total > 0 && stat.percentage < threshold && (
            <div className="sd-insight-pill info">
              <span className="material-symbols-outlined">trending_up</span>
              <p>Attend {stat.needed} class{stat.needed !== 1 ? 'es' : ''} to reach {threshold}%</p>
            </div>
          )}
          {stat.total === 0 && (
            <div className="sd-insight-pill neutral">
              <span className="material-symbols-outlined">info</span>
              <p>No records yet</p>
            </div>
          )}
        </section>

        {/* History List */}
        <section className="sd-section">
          <h2 className="sd-section-title">Recent History</h2>
          <div className="sd-history-list">
            {history.length > 0 ? (
              history.map((record, idx) => {
                const dateObj = new Date(record.date);
                const dayStr = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
                const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                return (
                  <div key={idx} className="sd-history-item">
                    <div className="sd-history-left">
                      <p className="sd-history-date">{dateStr}</p>
                      <p className="sd-history-meta">{dayStr} · Hour {record.hour}</p>
                    </div>
                    <div className="sd-history-right">
                      <div className="sd-status-dot" style={{ background: getStatusColor(record.status) }}></div>
                      <span className="sd-status-text">{capitalize(record.status)}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="sd-empty-text">No attendance history available.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
