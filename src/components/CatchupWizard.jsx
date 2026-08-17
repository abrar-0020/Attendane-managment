import { useState, useEffect } from 'react';
import { storage } from '../services/storage';
import './CatchupWizard.css';

export default function CatchupWizard({ onComplete }) {
  const [subjects, setSubjects] = useState([]);
  const [counts, setCounts] = useState({});

  useEffect(() => {
    const tt = storage.getTimetable();
    const uniqueSubjects = [...new Set(tt.map(c => c.subject))];
    setSubjects(uniqueSubjects);
    const initial = {};
    uniqueSubjects.forEach(s => { initial[s] = { attended: '', total: '' }; });
    setCounts(initial);
  }, []);

  const handleUpdate = (subject, field, value) => {
    const cleanValue = value.replace(/\D/g, '').slice(0, 3);
    let num = cleanValue === '' ? '' : parseInt(cleanValue, 10);
    if (Number.isNaN(num)) num = '';
    else num = Math.max(0, num);
    setCounts(prev => {
      const updated = { ...prev, [subject]: { ...prev[subject], [field]: num } };
      if (field === 'total' && updated[subject].attended !== '' && num !== '' && updated[subject].attended > num) {
        updated[subject].attended = num;
      }
      return updated;
    });
  };

  const submit = () => {
    const finalCounts = {};
    Object.keys(counts).forEach(s => {
      finalCounts[s] = {
        attended: counts[s].attended === '' ? 0 : counts[s].attended,
        total: counts[s].total === '' ? 0 : counts[s].total
      };
    });
    onComplete(finalCounts);
  };

  return (
    <div className="catchup-view">
      <div className="setup-icon-mark">
        <span className="material-symbols-outlined">history_edu</span>
      </div>
      <h1 className="setup-h1">Past Attendance</h1>
      <p className="setup-sub">
        {subjects.length > 0
          ? "If you're starting mid-semester, enter how many classes you've already attended."
          : "No subjects found yet. You can add them later from Settings."}
      </p>

      {subjects.length > 0 && (
        <div className="catchup-list">
          {subjects.map(sub => (
            <div key={sub} className="catchup-row">
              <div className="catchup-subject">
                <div className="catchup-dot" />
                <span className="catchup-name">{sub}</span>
              </div>
              <div className="catchup-inputs">
                <div className="catchup-input-wrap">
                  <label className="catchup-field-label">Attended</label>
                  <input
                    className="catchup-input"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength="3"
                    placeholder="0"
                    value={counts[sub]?.attended ?? ''}
                    onChange={e => handleUpdate(sub, 'attended', e.target.value)}
                  />
                </div>
                <span className="catchup-slash">/</span>
                <div className="catchup-input-wrap">
                  <label className="catchup-field-label">Total</label>
                  <input
                    className="catchup-input"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength="3"
                    placeholder="0"
                    value={counts[sub]?.total ?? ''}
                    onChange={e => handleUpdate(sub, 'total', e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <button className="setup-primary-btn" onClick={submit} style={{ marginTop: 'auto' }}>
        <span className="material-symbols-outlined">check</span>
        Finish Setup
      </button>
    </div>
  );
}
