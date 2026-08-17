import { useState, useEffect } from 'react';
import { storage } from '../services/storage';
import { dateUtils } from '../utils/dateUtils';
import { notificationsService } from '../services/notifications';

import TimetableManagement from './TimetableManagement';
import HolidayManagement from './HolidayManagement';
import ShareTimetable from './ShareTimetable';
import TextImportModal from './TextImportModal';
import QRScannerModal from './QRScannerModal';
import './TimetableEditor.css';

export default function TimetableEditor() {
  const [startDate, setStartDate] = useState(() => storage.getStartDate());
  const [activeModal, setActiveModal] = useState(null);
  const [notifPrefs, setNotifPrefs] = useState(() => storage.getNotificationPrefs());

  const profile = storage.getProfile() || {};

  useEffect(() => {
    storage.saveStartDate(startDate);
  }, [startDate]);

  useEffect(() => {
    storage.saveNotificationPrefs(notifPrefs);
    notificationsService.syncTimetableToCache();
  }, [notifPrefs]);



  const handleToggleReminder = async (e) => {
    if (e.target.checked) {
      const granted = await notificationsService.requestPermission();
      if (granted) {
        setNotifPrefs(prev => ({ ...prev, classReminders: true }));
        await notificationsService.registerPeriodicSync();
      } else {
        alert("Notification permission denied!");
      }
    } else {
      setNotifPrefs(prev => ({ ...prev, classReminders: false }));
    }
  };

  const handleToggleAlert = async (e) => {
    if (e.target.checked) {
      const granted = await notificationsService.requestPermission();
      if (granted) setNotifPrefs(prev => ({ ...prev, lowAttendanceAlert: true }));
      else alert("Notification permission denied!");
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
    <div className="settings-view">
      {/* Header */}
      <header className="set-header">
        <div className="set-header-inner">
          <h1 className="set-app-title">AttendMe</h1>

        </div>
      </header>

      <main className="set-main">
        <h2 className="set-page-title">Settings</h2>

        {/* Profile */}
        <section className="set-section">
          <h3 className="set-section-label">Profile</h3>
          <div className="set-card">
            <div className="set-profile-row">
              <div className="set-profile-avatar">
                {profile.name ? profile.name[0].toUpperCase() : 'S'}
              </div>
              <div className="set-profile-info">
                <span className="set-profile-name">{profile.name || 'Student'}</span>
                {profile.roll && <span className="set-profile-sub">{profile.roll}{profile.section ? ` · Section ${profile.section}` : ''}</span>}
              </div>
              <span className="material-symbols-outlined set-profile-arrow">chevron_right</span>
            </div>
          </div>
        </section>

        {/* Semester */}
        <section className="set-section">
          <h3 className="set-section-label">Semester</h3>
          <div className="set-card">
            <div className="set-row">
              <div className="set-row-left">
                <span className="material-symbols-outlined set-row-icon">event</span>
                <div>
                  <span className="set-row-title">Start Date</span>
                  <span className="set-row-sub">Used for attendance calendar</span>
                </div>
              </div>
              <input
                type="date"
                className="set-date-input"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Timetable */}
        <section className="set-section">
          <h3 className="set-section-label">Timetable</h3>
          <div className="set-card set-card-list">
            <button className="set-list-item" onClick={() => setActiveModal('timetable')}>
              <span className="material-symbols-outlined set-row-icon">edit_calendar</span>
              <div className="set-item-text">
                <span className="set-row-title">Manage Classes</span>
                <span className="set-row-sub">Add, edit or delete your timetable</span>
              </div>
              <span className="material-symbols-outlined set-chevron">chevron_right</span>
            </button>
            <div className="set-divider" />
            <button className="set-list-item" onClick={() => setActiveModal('holiday')}>
              <span className="material-symbols-outlined set-row-icon">beach_access</span>
              <div className="set-item-text">
                <span className="set-row-title">Manage Holidays</span>
                <span className="set-row-sub">Mark off days and breaks</span>
              </div>
              <span className="material-symbols-outlined set-chevron">chevron_right</span>
            </button>
            <div className="set-divider" />
            <button className="set-list-item" onClick={() => setActiveModal('share')}>
              <span className="material-symbols-outlined set-row-icon">ios_share</span>
              <div className="set-item-text">
                <span className="set-row-title">Share Timetable</span>
                <span className="set-row-sub">Export or import via share code</span>
              </div>
              <span className="material-symbols-outlined set-chevron">chevron_right</span>
            </button>
          </div>
        </section>

        {/* Notifications */}
        <section className="set-section">
          <h3 className="set-section-label">Notifications</h3>
          <div className="set-card set-card-list">
            <div className="set-toggle-row">
              <div className="set-row-left">
                <span className="material-symbols-outlined set-row-icon">alarm</span>
                <div>
                  <span className="set-row-title">Class Reminders</span>
                  <span className="set-row-sub">Notify before class starts</span>
                </div>
              </div>
              <label className="set-toggle">
                <input type="checkbox" checked={notifPrefs.classReminders} onChange={handleToggleReminder} />
                <span className="set-toggle-track" />
              </label>
            </div>

            {notifPrefs.classReminders && (
              <>
                <div className="set-divider" />
                <div className="set-row">
                  <div className="set-row-left">
                    <span className="material-symbols-outlined set-row-icon set-row-icon-sub">schedule</span>
                    <span className="set-row-title">Remind me before</span>
                  </div>
                  <select
                    className="set-select"
                    value={notifPrefs.reminderMinutes}
                    onChange={e => setNotifPrefs({ ...notifPrefs, reminderMinutes: parseInt(e.target.value) })}
                  >
                    <option value="5">5 mins</option>
                    <option value="10">10 mins</option>
                    <option value="15">15 mins</option>
                    <option value="30">30 mins</option>
                  </select>
                </div>
              </>
            )}

            <div className="set-divider" />

            <div className="set-toggle-row">
              <div className="set-row-left">
                <span className="material-symbols-outlined set-row-icon">notifications_active</span>
                <div>
                  <span className="set-row-title">Low Attendance Alert</span>
                  <span className="set-row-sub">Warn when below threshold</span>
                </div>
              </div>
              <label className="set-toggle">
                <input type="checkbox" checked={notifPrefs.lowAttendanceAlert} onChange={handleToggleAlert} />
                <span className="set-toggle-track" />
              </label>
            </div>

            {notifPrefs.lowAttendanceAlert && (
              <>
                <div className="set-divider" />
                <div className="set-row">
                  <div className="set-row-left">
                    <span className="material-symbols-outlined set-row-icon set-row-icon-sub">percent</span>
                    <span className="set-row-title">Alert threshold</span>
                  </div>
                  <select
                    className="set-select"
                    value={notifPrefs.attendanceThreshold}
                    onChange={e => setNotifPrefs({ ...notifPrefs, attendanceThreshold: parseInt(e.target.value) })}
                  >
                    <option value="60">60%</option>
                    <option value="65">65%</option>
                    <option value="70">70%</option>
                    <option value="75">75%</option>
                    <option value="80">80%</option>
                    <option value="85">85%</option>
                  </select>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Data Sync */}
        <section className="set-section">
          <h3 className="set-section-label">Data</h3>
          <div className="set-card set-card-list">
            <button className="set-list-item" onClick={() => setActiveModal('textImport')}>
              <span className="material-symbols-outlined set-row-icon">content_paste_go</span>
              <div className="set-item-text">
                <span className="set-row-title">Import Timetable from Text</span>
                <span className="set-row-sub">Paste readable timetable format</span>
              </div>
              <span className="material-symbols-outlined set-chevron">chevron_right</span>
            </button>
            <div className="set-divider" />
            
            <button className="set-list-item" onClick={() => setActiveModal('qrScanner')}>
              <span className="material-symbols-outlined set-row-icon">qr_code_scanner</span>
              <div className="set-item-text">
                <span className="set-row-title">Scan QR Code</span>
                <span className="set-row-sub">Import via device camera</span>
              </div>
              <span className="material-symbols-outlined set-chevron">chevron_right</span>
            </button>

          </div>
        </section>

        {/* Danger Zone */}
        <section className="set-section">
          <div className="set-card">
            <button className="set-danger-btn" onClick={handleClearAll}>
              <span className="material-symbols-outlined">delete_forever</span>
              <span>Clear All Data</span>
            </button>
          </div>
        </section>
      </main>

      {activeModal === 'timetable' && <TimetableManagement onClose={() => setActiveModal(null)} />}
      {activeModal === 'holiday' && <HolidayManagement onClose={() => setActiveModal(null)} />}
      {activeModal === 'share' && <ShareTimetable onClose={() => setActiveModal(null)} />}
      {activeModal === 'textImport' && <TextImportModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'qrScanner' && <QRScannerModal onClose={() => setActiveModal(null)} />}
    </div>
  );
}
