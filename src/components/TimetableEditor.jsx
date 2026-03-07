import { useState, useEffect } from 'react';
import ProfileCard from './ProfileCard';
import { storage } from '../services/storage';
import { dateUtils } from '../utils/dateUtils';
import { notificationsService } from '../services/notifications';

import TimetableManagement from './TimetableManagement';
import HolidayManagement from './HolidayManagement';
import ShareTimetable from './ShareTimetable';
import './TimetableEditor.css';

export default function TimetableEditor() {
  const [startDate, setStartDate] = useState(() => storage.getStartDate());
  const [activeModal, setActiveModal] = useState(null); // 'timetable', 'holiday', 'share'
  const [notifPrefs, setNotifPrefs] = useState(() => storage.getNotificationPrefs());

  useEffect(() => {
    storage.saveStartDate(startDate);
  }, [startDate]);

  useEffect(() => {
    storage.saveNotificationPrefs(notifPrefs);
    notificationsService.syncTimetableToCache();
  }, [notifPrefs]);

  const handleToggleReminder = async (e) => {
    const checked = e.target.checked;
    if (checked) {
      const granted = await notificationsService.requestPermission();
      if (granted) {
        setNotifPrefs(prev => ({ ...prev, classReminders: true }));
        const syncRegistered = await notificationsService.registerPeriodicSync();
        if (!syncRegistered) {
          console.warn("Background sync not supported or delayed by browser constraints.");
        }
      } else {
        alert("Notification permission denied!");
      }
    } else {
      setNotifPrefs(prev => ({ ...prev, classReminders: false }));
    }
  };

  const handleToggleAlert = async (e) => {
    const checked = e.target.checked;
    if (checked) {
      const granted = await notificationsService.requestPermission();
      if (granted) {
        setNotifPrefs(prev => ({ ...prev, lowAttendanceAlert: true }));
      } else {
         alert("Notification permission denied!");
      }
    } else {
      setNotifPrefs(prev => ({ ...prev, lowAttendanceAlert: false }));
    }
  };

  const handleClearAll = () => {
    if (window.confirm("Are you sure you want to clear ALL data? This cannot be undone.")) {
      storage.clearAll();
      window.location.reload();
    }
  };

  return (
    <div className="timetable-editor">
      <h2 className="settings-title">Settings</h2>
      
      <ProfileCard />

      <div className="settings-card">
        <h3>Semester Start Date</h3>
        <p className="card-hint">Used to generate your daily attendance scroller.</p>
        <input 
          type="date" 
          className="date-input"
          value={startDate} 
          onChange={e => setStartDate(e.target.value)} 
        />
      </div>

      <div className="settings-card grid-menu">
        <button className="menu-btn" onClick={() => setActiveModal('timetable')}>
          <div className="icon">📝</div>
          <span>Manage Timetable</span>
        </button>
        <button className="menu-btn" onClick={() => setActiveModal('holiday')}>
           <div className="icon">🏖️</div>
          <span>Manage Holidays</span>
        </button>
        <button className="menu-btn" onClick={() => setActiveModal('share')}>
           <div className="icon">📤</div>
          <span>Share Timetable</span>
        </button>
      </div>

      <div className="settings-card">
        <div className="card-header">
          <h3>🔔 Notifications</h3>
        </div>
        
        <div className="setting-row">
          <div className="setting-label">
            <strong>Class Reminders</strong>
            <span>Notifies you before class starts</span>
          </div>
          <label className="toggle-switch">
             <input type="checkbox" checked={notifPrefs.classReminders} onChange={handleToggleReminder}/>
             <span className="slider"></span>
          </label>
        </div>

        {notifPrefs.classReminders && (
          <div className="setting-row sub-row">
            <span>Remind me before</span>
            <select 
              value={notifPrefs.reminderMinutes} 
              onChange={e => setNotifPrefs({...notifPrefs, reminderMinutes: parseInt(e.target.value)})}
            >
              <option value="5">5 mins</option>
              <option value="10">10 mins</option>
              <option value="15">15 mins</option>
              <option value="30">30 mins</option>
            </select>
          </div>
        )}

        <div className="divider"></div>

        <div className="setting-row">
          <div className="setting-label">
            <strong>Low Attendance Alert</strong>
            <span>Get warned when you drop below threshold</span>
          </div>
          <label className="toggle-switch">
             <input type="checkbox" checked={notifPrefs.lowAttendanceAlert} onChange={handleToggleAlert}/>
             <span className="slider"></span>
          </label>
        </div>

        {notifPrefs.lowAttendanceAlert && (
          <div className="setting-row sub-row">
            <span>Alert Threshold</span>
            <select 
              value={notifPrefs.attendanceThreshold} 
              onChange={e => setNotifPrefs({...notifPrefs, attendanceThreshold: parseInt(e.target.value)})}
            >
              <option value="60">60%</option>
              <option value="65">65%</option>
              <option value="70">70%</option>
              <option value="75">75%</option>
              <option value="80">80%</option>
              <option value="85">85%</option>
            </select>
          </div>
        )}
      </div>

      <div className="settings-card danger-zone">
        <h3>Danger Zone</h3>
        <button className="danger-btn" onClick={handleClearAll}>Clear All Data</button>
      </div>

      {activeModal === 'timetable' && <TimetableManagement onClose={() => setActiveModal(null)} />}
      {activeModal === 'holiday' && <HolidayManagement onClose={() => setActiveModal(null)} />}
      {activeModal === 'share' && <ShareTimetable onClose={() => setActiveModal(null)} />}
      
    </div>
  );
}
