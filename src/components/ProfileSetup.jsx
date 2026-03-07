import { useState } from 'react';
import { storage } from '../services/storage';
import { dateUtils } from '../utils/dateUtils';
import LZString from 'lz-string';
import CatchupWizard from './CatchupWizard';
import './ProfileSetup.css';

export default function ProfileSetup({ onComplete }) {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState({ name: '', roll: '', section: '', photo: null });
  const [date, setDate] = useState(dateUtils.formatDate(new Date()));
  const [importText, setImportText] = useState('');

  const handleNextStep1 = (e) => {
    e.preventDefault();
    if (!profile.name.trim()) return alert("Name is required");
    storage.saveProfile(profile);
    storage.saveStartDate(date);
    setStep(2);
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
            if (!jsonStr) {
               // Try URI decoding fallback in case it was modified in transit
               jsonStr = LZString.decompressFromEncodedURIComponent(text.substring(4));
            }
        }
        
        const data = JSON.parse(jsonStr);
        let importedTt = [];
        let importedHolidays = [];

        if (Array.isArray(data)) {
            importedTt = data;
        } else if (data.timetable) {
            importedTt = data.timetable;
            if (data.holidays) importedHolidays = data.holidays;
        } else if (data.tt) { // Support minified schema format seen in shared links
            importedTt = data.tt.map(t => ({
              day: t.d === 'Mon' ? 'Monday' : 
                   t.d === 'Tue' ? 'Tuesday' :
                   t.d === 'Wed' ? 'Wednesday' :
                   t.d === 'Thu' ? 'Thursday' :
                   t.d === 'Fri' ? 'Friday' :
                   t.d === 'Sat' ? 'Saturday' : t.d,
              hour: parseInt(t.h),
              starttime: t.s,
              endtime: t.e,
              subject: t.c,
              room: t.r || '',
              startDate: t.sd || ''
            }));
            if (data.holidays) {
               importedHolidays = data.holidays.map(h => ({
                 date: h.d,
                 name: h.n
               }));
            }
        }
        
        if (importedTt.length > 0) {
            storage.saveTimetable(importedTt);
        }
        if (importedHolidays.length > 0) {
            storage.saveHolidays(importedHolidays);
        }
        if (isFullBackup) {
            const recordsToSave = data.records || (data.ar ? data.ar.map(r => ({
              date: r.d || r.date,
              hour: r.h || r.hour,
              subject: r.s || r.subject,
              status: r.st || r.status
            })) : null);
            
            if (recordsToSave) storage.saveRecords(recordsToSave);
            if (data.baseCounts || data.bc) storage.saveBaseCounts(data.baseCounts || data.bc);
            if (data.startDate || data.sd) storage.saveStartDate(data.startDate || data.sd);
            
            // Full backup means we already have baseline counts, skip CatchupWizard
            onComplete();
            return;
        }
      }
      setStep(3);
    } catch (e) {
      console.warn("Import failed", e);
      alert("Invalid timetable code. Please check the format.");
    }
  };

  const skipImport = () => setStep(3);

  const handleCatchupComplete = (baseCounts) => {
    storage.saveBaseCounts(baseCounts);
    onComplete();
  };

  return (
    <div className="profile-setup">
      {step === 1 && (
        <form className="setup-card slide-in-right" onSubmit={handleNextStep1}>
          <h2>Welcome! Let's get started.</h2>
          <p className="subtitle">Enter your details to personalization context.</p>
          
          <div className="input-group">
            <label>Full Name</label>
            <input required value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} placeholder="John Doe" />
          </div>
          <div className="input-group">
            <label>Roll Number (optional)</label>
            <input value={profile.roll} onChange={e => setProfile({...profile, roll: e.target.value})} placeholder="21BCA101" />
          </div>
          <div className="input-group">
            <label>Section (optional)</label>
            <input value={profile.section} onChange={e => setProfile({...profile, section: e.target.value})} placeholder="A" />
          </div>
          <div className="input-group">
            <label>Semester Start Date</label>
            <input required type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          
          <button type="submit" className="primary-btn">Next Step</button>
        </form>
      )}

      {step === 2 && (
        <div className="setup-card slide-in-right">
          <h2>Import Timetable</h2>
          <p className="subtitle">Paste a shared timetable code or JSON. You can also skip this and build it manually later.</p>
          
          <textarea 
            placeholder="Paste code here (TT3:... or JSON)" 
            value={importText} 
            onChange={e => setImportText(e.target.value)}
            rows={6}
          />
          
          <div className="button-group">
            <button className="secondary-btn" onClick={skipImport}>Skip</button>
            <button className="primary-btn" onClick={handleImport}>Import & Next</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="setup-card slide-in-right">
          <CatchupWizard onComplete={handleCatchupComplete} />
        </div>
      )}
    </div>
  );
}
