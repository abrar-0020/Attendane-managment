import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { storage } from '../services/storage';
import { timetableService } from '../services/timetable';
import './TimetableManagement.css';

const DEFAULT_TIMES = {
  1: { start: '08:50', end: '09:45' },
  2: { start: '09:45', end: '10:40' },
  3: { start: '10:50', end: '11:45' },
  4: { start: '11:45', end: '12:40' },
  5: { start: '13:30', end: '14:25' },
  6: { start: '14:25', end: '15:20' },
  7: { start: '15:30', end: '16:25' },
  8: { start: '16:25', end: '17:20' }
};

export default function TimetableManagement({ onClose }) {
  const [classes, setClasses] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [suggestion, setSuggestion] = useState({ day: 'Monday', hour: 1 });
  
  const [form, setForm] = useState({
    day: 'Monday',
    hour: 1,
    starttime: '',
    endtime: '',
    subject: '',
    room: '',
    startDate: ''
  });

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = () => {
    const data = storage.getTimetable();
    setClasses(data);
    const nextSlot = timetableService.suggestNextSlot();
    setSuggestion(nextSlot);
    setForm({
      ...form, 
      day: nextSlot.day, 
      hour: nextSlot.hour,
      starttime: DEFAULT_TIMES[nextSlot.hour]?.start || '',
      endtime: DEFAULT_TIMES[nextSlot.hour]?.end || ''
    });
  };

  const handleHourChange = (e) => {
    const hr = parseInt(e.target.value);
    setForm({
      ...form,
      hour: hr,
      starttime: DEFAULT_TIMES[hr]?.start || '',
      endtime: DEFAULT_TIMES[hr]?.end || ''
    });
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!form.subject) return alert("Subject required");
    
    // Check if slot already exists
    const existingIdx = classes.findIndex(c => c.day === form.day && c.hour === form.hour);
    let newClasses = [...classes];
    
    if (existingIdx > -1) {
      if (!window.confirm("Class already exists for this day and hour. Overwrite?")) return;
      newClasses[existingIdx] = form;
    } else {
      newClasses.push(form);
    }
    
    storage.saveTimetable(newClasses);
    loadClasses();
    setIsAdding(false);
    
    // Suggest next naturally
    const hrs = parseInt(form.hour) + 1;
    setForm(prev => ({
      ...prev, 
      subject: '', 
      hour: hrs <= 8 ? hrs : 1,
      starttime: DEFAULT_TIMES[hrs <= 8 ? hrs : 1]?.start || '',
      endtime: DEFAULT_TIMES[hrs <= 8 ? hrs : 1]?.end || ''
    }));
  };

  const handleDelete = (cls) => {
    if (window.confirm(`Delete ${cls.subject} on ${cls.day} Hr ${cls.hour}?`)) {
      const newClasses = classes.filter(c => !(c.day === cls.day && c.hour === cls.hour));
      storage.saveTimetable(newClasses);
      loadClasses();
    }
  };

  const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const sortedClasses = [...classes].sort((a, b) => {
    if (a.day === b.day) return a.hour - b.hour;
    return daysOrder.indexOf(a.day) - daysOrder.indexOf(b.day);
  });

  return createPortal(
    <div className="fullscreen-portal mng-portal">
      <div className="portal-header">
        <button className="back-btn" onClick={onClose}>← Back</button>
        <h2>Manage Timetable</h2>
      </div>

      <div className="portal-content">
        {!isAdding ? (
          <>
            <button className="add-fab" onClick={() => setIsAdding(true)}>+ Add Class</button>
            
            {sortedClasses.length === 0 ? (
               <div className="empty-state">No classes scheduled.</div>
            ) : (
              <div className="class-list">
                {sortedClasses.map((cls, idx) => (
                  <div key={`${cls.day}-${cls.hour}-${idx}`} className="list-item">
                    <div className="list-info">
                      <span className="badge">{cls.day.substr(0,3)} • Hr {cls.hour}</span>
                      <h4>{cls.subject}</h4>
                      <p>{cls.starttime} - {cls.endtime} • {cls.room}</p>
                    </div>
                    <button className="del-btn" onClick={() => handleDelete(cls)}>🗑️</button>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <form className="add-form" onSubmit={handleSave}>
            <h3>Add New Class</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label>Day</label>
                <select value={form.day} onChange={e => setForm({...form, day: e.target.value})}>
                  {daysOrder.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              
              <div className="form-group">
                <label>Hour</label>
                <select value={form.hour} onChange={handleHourChange}>
                   {[1,2,3,4,5,6,7,8].map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Start Time</label>
                <input type="time" required value={form.starttime} onChange={e => setForm({...form, starttime: e.target.value})} />
              </div>
              <div className="form-group">
                <label>End Time</label>
                <input type="time" required value={form.endtime} onChange={e => setForm({...form, endtime: e.target.value})} />
              </div>
            </div>

            <div className="form-group">
              <label>Subject Code/Name</label>
              <input required placeholder="e.g. CS301" value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} />
            </div>

            <div className="form-group">
              <label>Room</label>
              <input placeholder="e.g. A101" value={form.room} onChange={e => setForm({...form, room: e.target.value})} />
            </div>

            <div className="form-group">
              <label>Start Date (Optional)</label>
              <input type="date" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} />
            </div>

            <div className="form-actions">
              <button type="button" className="cancel-btn" onClick={() => setIsAdding(false)}>Cancel</button>
              <button type="submit" className="save-btn">Save Class</button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
