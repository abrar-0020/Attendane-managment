import { useState, useEffect } from 'react';
import { storage } from '../services/storage';
import { notificationsService } from '../services/notifications';
import './SummaryView.css';

export default function SummaryView() {
  const [stats, setStats] = useState([]);
  const [overall, setOverall] = useState({ attended: 0, total: 0, percentage: 0 });
  const [threshold] = useState(() => storage.getNotificationPrefs().attendanceThreshold || 75);

  useEffect(() => {
    calculateStats();
  }, []);

  const calculateStats = () => {
    const timetable = storage.getTimetable();
    const records = storage.getRecords();
    const baseCounts = storage.getBaseCounts();
    const prefs = storage.getNotificationPrefs();
    
    // Get unique subjects
    const subjects = [...new Set(timetable.map(t => t.subject))];
    
    let totalAttended = 0;
    let totalClasses = 0;
    const statsArray = [];

    subjects.forEach(sub => {
      // Find all classes for this subject in timetable to count weekly frequency
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
        
        // Target is 75%
        if (percentage >= 75) {
          // How many can I miss?
          // (Attended) / (Total + X) >= 0.75  => Attended >= 0.75*(Total + X) => X <= (Attended / 0.75) - Total
          buffer = Math.floor((overallSubAttended / 0.75) - overallSubTotal);
        } else {
          // How many consecutive needed?
          // (Attended + X) / (Total + X) >= 0.75 => Attended + X >= 0.75*Total + 0.75*X => 0.25*X >= 0.75*Total - Attended => X >= 3*Total - 4*Attended
          needed = Math.ceil(3 * overallSubTotal - 4 * overallSubAttended);
        }
      }

      statsArray.push({
        subject: sub,
        weeklyCount,
        attended: overallSubAttended,
        total: overallSubTotal,
        percentage,
        buffer,
        needed
      });
    });

    // Sort by percentage ASC
    statsArray.sort((a, b) => a.percentage - b.percentage);
    
    setStats(statsArray);
    
    const overallPct = totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 100) : 0;
    setOverall({ attended: totalAttended, total: totalClasses, percentage: overallPct });

    // Check low attendance notifications
    if (prefs.lowAttendanceAlert) {
      notificationsService.checkAndNotifyLowAttendance(statsArray, prefs.attendanceThreshold);
    }
  };

  const getStatusClass = (pct) => {
    if (pct >= threshold) return 'good';
    if (pct >= threshold - 10) return 'warning';
    return 'danger';
  };

  return (
    <div className="summary-view">
      <h2 className="summary-title">Analytics</h2>
      
      <div className="overall-card">
        <div className="circle-wrap">
          <div className="circle">
            <div className="mask full" style={{ transform: `rotate(${Math.min(overall.percentage, 100) * 1.8}deg)` }}>
              <div className="fill" style={{ transform: `rotate(${Math.min(overall.percentage, 100) * 1.8}deg)` }}></div>
            </div>
            <div className="mask half">
              <div className="fill" style={{ transform: `rotate(${Math.min(overall.percentage, 100) * 1.8}deg)` }}></div>
            </div>
            <div className="inside-circle"> {overall.percentage}% </div>
          </div>
        </div>
        <div className="overall-stats">
          <h3>Overall Attendance</h3>
          <p>{overall.attended} / {overall.total} Classes</p>
          <div className="stats-row">
             <span>✓ {overall.attended}</span>
             <span>✕ {overall.total - overall.attended}</span>
          </div>
        </div>
      </div>

      <div className="subjects-list">
        {stats.map(stat => (
          <div key={stat.subject} className="stat-card">
            <div className="stat-header">
              <h3>{stat.subject} <span className="weekly-badge">{stat.weeklyCount}/wk</span></h3>
              <span className={`pct-badge ${getStatusClass(stat.percentage)}`}>{stat.percentage}%</span>
            </div>
            
            <div className="progress-bar">
              <div className={`progress-fill ${getStatusClass(stat.percentage)}`} style={{ width: `${Math.min(stat.percentage, 100)}%` }}></div>
            </div>
            
            <div className="stat-details">
              <span>{stat.attended}/{stat.total} Attended</span>
              
              {stat.total > 0 && stat.percentage >= 75 && (
                <span className={`buffer ${stat.buffer > 5 ? 'safe' : stat.buffer > 0 ? 'caution' : 'danger'}`}>
                  Can miss: {stat.buffer}
                </span>
              )}
              
              {stat.total > 0 && stat.percentage < 75 && (
                 <span className="needed">
                  Need: {stat.needed} class{stat.needed !== 1 ? 'es' : ''}
                </span>
              )}
            </div>
          </div>
        ))}
        {stats.length === 0 && (
          <p className="empty-text">No subjects found. Add them in Timetable Management.</p>
        )}
      </div>
    </div>
  );
}
