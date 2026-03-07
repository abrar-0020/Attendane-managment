import { useState, useEffect } from 'react';
import { storage } from '../services/storage';
import './CatchupWizard.css';

export default function CatchupWizard({ onComplete }) {
  const [subjects, setSubjects] = useState([]);
  const [counts, setCounts] = useState({});

  useEffect(() => {
    // Extract unique subjects from the imported timetable
    const tt = storage.getTimetable();
    const uniqueSubjects = [...new Set(tt.map(c => c.subject))];
    setSubjects(uniqueSubjects);
    
    // Initialize default counts
    const initial = {};
    uniqueSubjects.forEach(s => {
      initial[s] = { attended: '', total: '' };
    });
    setCounts(initial);
  }, []);

  const handleUpdate = (subject, field, value) => {
    const cleanValue = value.replace(/\D/g, '').slice(0, 2);
    let num = cleanValue === '' ? '' : parseInt(cleanValue, 10);
    if (Number.isNaN(num)) num = '';
    else num = Math.max(0, num);

    setCounts(prev => {
      const updated = { ...prev, [subject]: { ...prev[subject], [field]: num } };
      // Ensure attended doesn't exceed total realistically, but allowing it for flexibility
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
    <div className="catchup-wizard">
      <h2>Catchup Setup</h2>
      <p className="subtitle">If you're starting mid-semester, enter the classes you've already attended and the total classes held so far.</p>
      
      {subjects.length === 0 ? (
        <div className="empty-subjects">
          <p>No subjects found in timetable.</p>
        </div>
      ) : (
        <div className="subjects-grid">
          {subjects.map(sub => (
            <div key={sub} className="subject-row">
              <span className="subject-name">{sub}</span>
              <div className="counters">
                <input 
                  type="text" 
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength="2"
                  value={counts[sub].attended} 
                  onChange={e => handleUpdate(sub, 'attended', e.target.value)} 
                  title="Classes Attended"
                  placeholder="0"
                />
                <span>/</span>
                <input 
                  type="text" 
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength="2"
                  value={counts[sub].total} 
                  onChange={e => handleUpdate(sub, 'total', e.target.value)} 
                  title="Total Classes Held"
                  placeholder="0"
                />
              </div>
            </div>
          ))}
        </div>
      )}
      
      <button className="primary-btn mt-4" onClick={submit}>Finish Setup</button>
    </div>
  );
}
