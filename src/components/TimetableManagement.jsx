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

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function TimetableManagement({ onClose }) {
  const [classes, setClasses] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingClass, setEditingClass] = useState(null); // { cls, idx }
  const [form, setForm] = useState({
    day: 'Monday', hour: 1, starttime: '08:50', endtime: '09:45', subject: '', room: '', startDate: ''
  });

  useEffect(() => { loadClasses(); }, []);

  const loadClasses = () => {
    const data = storage.getTimetable();
    setClasses(data);
    const nextSlot = timetableService.suggestNextSlot();
    setForm(f => ({
      ...f, day: nextSlot.day, hour: nextSlot.hour,
      starttime: DEFAULT_TIMES[nextSlot.hour]?.start || '',
      endtime: DEFAULT_TIMES[nextSlot.hour]?.end || ''
    }));
  };

  const handleHourChange = (e) => {
    const hr = parseInt(e.target.value);
    setForm(f => ({ ...f, hour: hr, starttime: DEFAULT_TIMES[hr]?.start || '', endtime: DEFAULT_TIMES[hr]?.end || '' }));
  };

  const handleDaySelect = (day) => setForm(f => ({ ...f, day }));

  const handleSave = (e) => {
    e.preventDefault();
    if (!form.subject) return alert("Subject required");
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
    setEditingClass(null);
  };

  const handleDelete = (cls) => {
    if (window.confirm(`Delete ${cls.subject} on ${cls.day}?`)) {
      const newClasses = classes.filter(c => !(c.day === cls.day && c.hour === cls.hour));
      storage.saveTimetable(newClasses);
      loadClasses();
    }
  };

  const openEdit = (cls) => {
    setForm({ ...cls });
    setEditingClass(cls);
    setIsAdding(true);
  };

  const sortedClasses = [...classes].sort((a, b) => {
    if (a.day === b.day) return a.hour - b.hour;
    return DAYS.indexOf(a.day) - DAYS.indexOf(b.day);
  });

  // Group by day
  const grouped = DAYS.reduce((acc, day) => {
    const dayCls = sortedClasses.filter(c => c.day === day);
    if (dayCls.length > 0) acc[day] = dayCls;
    return acc;
  }, {});

  return createPortal(
    <div className="tmng-portal">
      {/* Header */}
      <header className="tmng-header">
        <div className="tmng-header-inner">
          <button className="tmng-back-btn" onClick={isAdding ? () => { setIsAdding(false); setEditingClass(null); } : onClose}>
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className="tmng-title">{isAdding ? (editingClass ? 'Edit Class' : 'Add Class') : 'Manage Classes'}</h2>
          {!isAdding && (
            <button className="tmng-add-btn" onClick={() => setIsAdding(true)}>
              <span className="material-symbols-outlined">add</span>
            </button>
          )}
          {isAdding && <div style={{ width: 40 }} />}
        </div>
      </header>

      {/* Content */}
      {!isAdding ? (
        <div className="tmng-content">
          {sortedClasses.length === 0 ? (
            <div className="tmng-empty">
              <span className="material-symbols-outlined tmng-empty-icon">calendar_month</span>
              <p className="tmng-empty-text">No classes yet.</p>
              <span className="tmng-empty-sub">Tap + to add your first class</span>
            </div>
          ) : (
            Object.entries(grouped).map(([day, dayCls]) => (
              <div key={day} className="tmng-day-group">
                <h3 className="tmng-day-label">{day}</h3>
                <div className="tmng-day-cards">
                  {dayCls.map((cls, idx) => (
                    <div key={`${cls.day}-${cls.hour}`} className="tmng-class-card">
                      <div className="tmng-card-edge" />
                      <div className="tmng-card-body">
                        <div className="tmng-card-top">
                          <span className="tmng-card-time">
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>schedule</span>
                            {cls.starttime}–{cls.endtime}
                          </span>
                          <div className="tmng-card-actions">
                            <button className="tmng-edit-btn" onClick={() => openEdit(cls)}>
                              <span className="material-symbols-outlined">edit</span>
                            </button>
                            <button className="tmng-del-btn" onClick={() => handleDelete(cls)}>
                              <span className="material-symbols-outlined">delete</span>
                            </button>
                          </div>
                        </div>
                        <h4 className="tmng-card-subject">{cls.subject}</h4>
                        {cls.room && (
                          <div className="tmng-card-room">
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>location_on</span>
                            {cls.room}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <form className="tmng-form" onSubmit={handleSave}>
          {/* Subject */}
          <div className="tmng-field">
            <label className="tmng-label">Subject Name</label>
            <input
              className="tmng-input"
              required
              placeholder="e.g. CS301 – Data Structures"
              value={form.subject}
              onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
            />
          </div>

          {/* Day chips */}
          <div className="tmng-field">
            <label className="tmng-label">Day</label>
            <div className="tmng-day-chips">
              {DAYS.map(day => (
                <button
                  key={day}
                  type="button"
                  className={`tmng-day-chip ${form.day === day ? 'active' : ''}`}
                  onClick={() => handleDaySelect(day)}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          {/* Hour */}
          <div className="tmng-field">
            <label className="tmng-label">Hour</label>
            <div className="tmng-select-wrap">
              <select className="tmng-select" value={form.hour} onChange={handleHourChange}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(h => (
                  <option key={h} value={h}>Hour {h}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Times */}
          <div className="tmng-row-2">
            <div className="tmng-field">
              <label className="tmng-label">Start Time</label>
              <div className="tmng-input-icon-wrap">
                <span className="material-symbols-outlined tmng-input-icon">schedule</span>
                <input
                  className="tmng-input tmng-input-with-icon"
                  type="time"
                  required
                  value={form.starttime}
                  onChange={e => setForm(f => ({ ...f, starttime: e.target.value }))}
                />
              </div>
            </div>
            <div className="tmng-field">
              <label className="tmng-label">End Time</label>
              <div className="tmng-input-icon-wrap">
                <span className="material-symbols-outlined tmng-input-icon">schedule</span>
                <input
                  className="tmng-input tmng-input-with-icon"
                  type="time"
                  required
                  value={form.endtime}
                  onChange={e => setForm(f => ({ ...f, endtime: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Room */}
          <div className="tmng-field">
            <label className="tmng-label">Room / Location</label>
            <div className="tmng-input-icon-wrap">
              <span className="material-symbols-outlined tmng-input-icon">location_on</span>
              <input
                className="tmng-input tmng-input-with-icon"
                placeholder="Room / location"
                value={form.room}
                onChange={e => setForm(f => ({ ...f, room: e.target.value }))}
              />
            </div>
          </div>

          {/* Start Date */}
          <div className="tmng-field">
            <label className="tmng-label">Class Start Date (optional)</label>
            <input
              className="tmng-input"
              type="date"
              value={form.startDate}
              onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
            />
          </div>

          {editingClass && (
            <button type="button" className="tmng-delete-inline" onClick={() => { handleDelete(editingClass); setIsAdding(false); }}>
              <span className="material-symbols-outlined">delete</span>
              Delete Class
            </button>
          )}

          <button type="submit" className="tmng-save-btn">
            {editingClass ? 'Save Changes' : 'Add Class'}
          </button>
        </form>
      )}
    </div>,
    document.body
  );
}
