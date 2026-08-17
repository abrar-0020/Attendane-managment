import { useState, useEffect } from 'react';
import { storage } from '../services/storage';
import { notificationsService } from '../services/notifications';
import SubjectDetail from './SubjectDetail';
import './SummaryView.css';

export default function SummaryView() {
  const [stats, setStats] = useState([]);
  const [overall, setOverall] = useState({ attended: 0, total: 0, percentage: 0 });
  const [threshold] = useState(() => storage.getNotificationPrefs().attendanceThreshold || 75);
  const [selectedStat, setSelectedStat] = useState(null);

  useEffect(() => {
    calculateStats();
  }, []);

  const calculateStats = () => {
    const timetable = storage.getTimetable();
    const records = storage.getRecords();
    const baseCounts = storage.getBaseCounts();
    const prefs = storage.getNotificationPrefs();

    const subjects = [...new Set(timetable.map(t => t.subject))];
    let totalAttended = 0;
    let totalClasses = 0;
    const statsArray = [];

    subjects.forEach(sub => {
      const weeklyCount = timetable.filter(t => t.subject === sub).length;
      const subRecords = records.filter(r => r.subject === sub && r.status !== 'unmarked');
      const presentRecs = subRecords.filter(r => r.status === 'present').length;
      const totalRecs = subRecords.length;
      const baseTotal = baseCounts[sub] ? baseCounts[sub].total : 0;
      const baseAttended = baseCounts[sub] ? baseCounts[sub].attended : 0;
      const overallSubAttended = presentRecs + baseAttended;
      const overallSubTotal = totalRecs + baseTotal;
      totalAttended += overallSubAttended;
      totalClasses += overallSubTotal;

      let percentage = 0;
      let buffer = 0;
      let needed = 0;

      if (overallSubTotal > 0) {
        percentage = Math.round((overallSubAttended / overallSubTotal) * 100);
        if (percentage >= 75) {
          buffer = Math.floor((overallSubAttended / 0.75) - overallSubTotal);
        } else {
          needed = Math.ceil(3 * overallSubTotal - 4 * overallSubAttended);
        }
      }

      statsArray.push({
        subject: sub,
        subjectName: timetable.find(t => t.subject === sub)?.subjectName || sub,
        weeklyCount,
        attended: overallSubAttended,
        total: overallSubTotal,
        percentage,
        buffer,
        needed
      });
    });

    statsArray.sort((a, b) => a.percentage - b.percentage);
    setStats(statsArray);
    const overallPct = totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 100) : 0;
    setOverall({ attended: totalAttended, total: totalClasses, percentage: overallPct });

    if (prefs.lowAttendanceAlert) {
      notificationsService.checkAndNotifyLowAttendance(statsArray, prefs.attendanceThreshold);
    }
  };

  const getStatusClass = (pct) => {
    if (pct >= threshold) return 'good';
    if (pct >= threshold - 10) return 'warn';
    return 'danger';
  };

  const getStatusColor = (pct) => {
    if (pct >= threshold) return 'var(--secondary)';
    if (pct >= threshold - 10) return '#b45309'; // amber warning
    return 'var(--error)';
  };

  // SVG ring for overall
  const RADIUS = 60;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const dashOffset = CIRCUMFERENCE - (overall.percentage / 100) * CIRCUMFERENCE;

  return (
    <div className="summary-view">
      {/* Top bar */}
      <header className="sv-header">
        <div className="sv-header-inner">
          <h1 className="sv-app-title">AttendMe</h1>
          <button className="sv-icon-btn">
            <span className="material-symbols-outlined">notifications</span>
          </button>
        </div>
      </header>

      <main className="sv-main">
        <h2 className="sv-page-title">Statistics</h2>

        {/* Overall Status Card */}
        <section className="sv-overall-card">
          <div className="sv-ring-wrapper">
            <svg className="sv-ring-svg" viewBox="0 0 140 140">
              <circle
                cx="70" cy="70" r={RADIUS}
                fill="transparent"
                stroke="var(--surface-container-high)"
                strokeWidth="10"
                strokeLinecap="round"
              />
              <circle
                cx="70" cy="70" r={RADIUS}
                fill="transparent"
                stroke={getStatusColor(overall.percentage)}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
                style={{
                  transform: 'rotate(-90deg)',
                  transformOrigin: '50% 50%',
                  transition: 'stroke-dashoffset 0.6s ease'
                }}
              />
            </svg>
            <div className="sv-ring-center">
              <span className="sv-ring-pct" style={{ color: getStatusColor(overall.percentage) }}>
                {overall.percentage}%
              </span>
              <span className="sv-ring-sub">Overall</span>
            </div>
          </div>

          <div className="sv-overall-stats">
            <div className="sv-stat">
              <span className="sv-stat-label">Attended</span>
              <span className="sv-stat-value">{overall.attended}</span>
            </div>
            <div className="sv-stat-divider" />
            <div className="sv-stat">
              <span className="sv-stat-label">Missed</span>
              <span className="sv-stat-value">{overall.total - overall.attended}</span>
            </div>
            <div className="sv-stat-divider" />
            <div className="sv-stat">
              <span className="sv-stat-label">Total</span>
              <span className="sv-stat-value">{overall.total}</span>
            </div>
          </div>
        </section>

        {/* Subject List */}
        <section className="sv-subjects">
          <h3 className="sv-section-label">Subject Breakdown</h3>
          <div className="sv-subject-list">
            {stats.map(stat => {
              const statusClass = getStatusClass(stat.percentage);
              const statusColor = getStatusColor(stat.percentage);

              return (
                <div
                  key={stat.subject}
                  className="sv-subject-card"
                  onClick={() => setSelectedStat(stat)}
                >
                  <div className="sv-subject-row">
                    <div className="sv-subject-dot" style={{ background: statusColor }} />
                    <div className="sv-subject-info">
                      <h4 className="sv-subject-name">{stat.subjectName || stat.subject}</h4>
                      <span className="sv-subject-meta">{stat.subject !== stat.subjectName ? stat.subject + ' · ' : ''}{stat.attended}/{stat.total} classes · {stat.weeklyCount}/wk</span>
                    </div>
                    <div className="sv-subject-right">
                      <span className={`sv-pct-badge ${statusClass}`} style={{ color: statusColor, background: statusColor + '1a' }}>
                        {stat.percentage}%
                      </span>
                      <span className="material-symbols-outlined sv-chevron">
                        chevron_right
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="sv-progress-track">
                    <div
                      className="sv-progress-fill"
                      style={{
                        width: `${Math.min(stat.percentage, 100)}%`,
                        background: statusColor,
                        transition: 'width 0.6s ease'
                      }}
                    />
                  </div>

                  {/* Accordion expanded insight logic removed in favor of SubjectDetail screen */}
                </div>
              );
            })}

            {stats.length === 0 && (
              <div className="sv-empty">
                <span className="material-symbols-outlined sv-empty-icon">bar_chart</span>
                <p className="sv-empty-text">No subjects yet.</p>
                <span className="sv-empty-sub">Add your timetable from Settings to see stats.</span>
              </div>
            )}
          </div>
        </section>
      </main>
      
      {selectedStat && (
        <SubjectDetail stat={selectedStat} onClose={() => setSelectedStat(null)} />
      )}
    </div>
  );
}
