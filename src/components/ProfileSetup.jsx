import { useState } from 'react';
import { storage } from '../services/storage';
import { dateUtils } from '../utils/dateUtils';
import LZString from 'lz-string';
import CatchupWizard from './CatchupWizard';
import './ProfileSetup.css';

export default function ProfileSetup({ onComplete }) {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState({ name: '', roll: '', section: '' });
  const [date, setDate] = useState(dateUtils.formatDate(new Date()));
  const [importText, setImportText] = useState('');
  const [buildMode, setBuildMode] = useState(null); // 'fresh' | 'import'

  const handleNextStep1 = (e) => {
    e.preventDefault();
    if (!profile.name.trim()) return alert("Name is required");
    storage.saveProfile(profile);
    storage.saveStartDate(date);
    setStep(2);
  };

  const handleBuildChoice = (mode) => {
    setBuildMode(mode);
    if (mode === 'fresh') setStep(3);
    else setStep(2.5); // import step
  };

  const handleImport = () => {
    try {
      if (importText.trim()) {
        let text = importText.trim();
        let jsonStr = text;
        let isAD1 = text.startsWith('AD1:');
        let isTT4 = text.startsWith('TT4:');
        let isFullBackup = isAD1 || isTT4;

        if (isFullBackup || text.startsWith('TT3:') || text.startsWith('TT2:') || text.startsWith('TT1:')) {
          jsonStr = LZString.decompressFromBase64(text.substring(4));
          if (!jsonStr) jsonStr = LZString.decompressFromEncodedURIComponent(text.substring(4));
        }

        const data = JSON.parse(jsonStr);
        let importedTt = [];
        let importedHolidays = [];

        if (Array.isArray(data)) {
          importedTt = data;
        } else if (data.timetable) {
          importedTt = data.timetable;
          if (data.holidays) importedHolidays = data.holidays;
        } else if (data.tt) {
          const dayMap = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday' };
          importedTt = data.tt.map(t => ({
            day: dayMap[t.d] || t.d, hour: parseInt(t.h), starttime: t.s, endtime: t.e,
            subject: t.c, room: t.r || '', startDate: t.sd || ''
          }));
          if (data.holidays) {
            importedHolidays = data.holidays.map(h => ({ date: h.d, name: h.n }));
          }
        }

        if (importedTt.length > 0) localStorage.setItem('attendance_timetable', JSON.stringify(importedTt));
        if (importedHolidays.length > 0) localStorage.setItem('attendance_holidays', JSON.stringify(importedHolidays));

        if (isFullBackup) {
          const recordsToSave = data.records || (data.ar ? data.ar.map(r => ({
            date: r.d || r.dt || r.date, hour: r.h || r.hour, subject: r.s || r.subject, status: r.st || r.status
          })) : null);
          if (recordsToSave) localStorage.setItem('attendance_records', JSON.stringify(recordsToSave));

          let rawCounts = data.baseCounts || data.bc;
          if (rawCounts) {
            const norm = {};
            Object.keys(rawCounts).forEach(s => {
              norm[s] = {
                attended: rawCounts[s].attended ?? rawCounts[s].baseAttended ?? 0,
                total: rawCounts[s].total ?? rawCounts[s].baseTotal ?? 0
              };
            });
            localStorage.setItem('attendance_base_counts', JSON.stringify(norm));
          }

          if (data.startDate || data.sd) localStorage.setItem('semester_start_date', JSON.stringify(data.startDate || data.sd));
          window.location.reload();
          return;
        }
      }
      setStep(3);
    } catch (e) {
      alert("Invalid timetable code. Please check the format.");
    }
  };

  const handleCatchupComplete = (baseCounts) => {
    storage.saveBaseCounts(baseCounts);
    onComplete();
  };

  return (
    <div className="setup-view">
      {/* Step 1: Profile */}
      {step === 1 && (
        <div className="setup-page">
          <div className="setup-top">
            <div className="setup-icon-mark">
              <span className="material-symbols-outlined">waving_hand</span>
            </div>
            <h1 className="setup-h1">Welcome to AttendMe</h1>
            <p className="setup-sub">Let's get you set up in a minute.</p>
          </div>

          <form className="setup-form" onSubmit={handleNextStep1}>
            <div className="setup-field">
              <label className="setup-label">Full Name *</label>
              <input
                className="setup-input"
                required
                placeholder="e.g. Priya Sharma"
                value={profile.name}
                onChange={e => setProfile({ ...profile, name: e.target.value })}
              />
            </div>
            <div className="setup-field">
              <label className="setup-label">Roll Number <span className="setup-optional">(optional)</span></label>
              <input
                className="setup-input"
                placeholder="e.g. 21BCA101"
                value={profile.roll}
                onChange={e => setProfile({ ...profile, roll: e.target.value })}
              />
            </div>
            <div className="setup-field">
              <label className="setup-label">Section <span className="setup-optional">(optional)</span></label>
              <input
                className="setup-input"
                placeholder="e.g. A"
                value={profile.section}
                onChange={e => setProfile({ ...profile, section: e.target.value })}
              />
            </div>
            <div className="setup-field">
              <label className="setup-label">Semester Start Date *</label>
              <input
                className="setup-input"
                required
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
            <button type="submit" className="setup-primary-btn">
              Continue
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </form>
        </div>
      )}

      {/* Step 2: Build timetable choice */}
      {step === 2 && (
        <div className="setup-page">
          <div className="setup-top">
            <div className="setup-icon-mark">
              <span className="material-symbols-outlined">calendar_month</span>
            </div>
            <h1 className="setup-h1">Build your timetable</h1>
            <p className="setup-sub">How would you like to set up your schedule?</p>
          </div>

          <div className="setup-choice-cards">
            <button className="setup-choice-card" onClick={() => handleBuildChoice('import')}>
              <div className="setup-choice-icon">
                <span className="material-symbols-outlined">download</span>
              </div>
              <div className="setup-choice-text">
                <span className="setup-choice-title">Import a timetable</span>
                <span className="setup-choice-sub">Paste a shared code or link</span>
              </div>
              <span className="material-symbols-outlined setup-choice-arrow">chevron_right</span>
            </button>

            <button className="setup-choice-card" onClick={() => handleBuildChoice('fresh')}>
              <div className="setup-choice-icon">
                <span className="material-symbols-outlined">add_circle</span>
              </div>
              <div className="setup-choice-text">
                <span className="setup-choice-title">Start from scratch</span>
                <span className="setup-choice-sub">Build it manually in Settings</span>
              </div>
              <span className="material-symbols-outlined setup-choice-arrow">chevron_right</span>
            </button>
          </div>
        </div>
      )}

      {/* Step 2.5: Import timetable */}
      {step === 2.5 && (
        <div className="setup-page">
          <button className="setup-back-btn" onClick={() => setStep(2)}>
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="setup-top">
            <div className="setup-icon-mark">
              <span className="material-symbols-outlined">content_paste</span>
            </div>
            <h1 className="setup-h1">Import timetable</h1>
            <p className="setup-sub">Paste a code or link provided by your professor or institution.</p>
          </div>

          <div className="setup-form">
            <div className="setup-field">
              <label className="setup-label">Timetable Code or Link</label>
              <textarea
                className="setup-textarea"
                placeholder="e.g. https://attendme.app/t/x8k9j2 or TT3:..."
                value={importText}
                onChange={e => setImportText(e.target.value)}
                rows={4}
              />
            </div>

            <button className="setup-primary-btn" onClick={handleImport}>
              <span className="material-symbols-outlined">download</span>
              Import timetable
            </button>
            <button className="setup-secondary-btn" onClick={() => setStep(3)}>
              Skip for now
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Catchup wizard */}
      {step === 3 && (
        <div className="setup-page">
          <CatchupWizard onComplete={handleCatchupComplete} />
        </div>
      )}
    </div>
  );
}
