import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { storage } from '../services/storage';

export default function HolidayManagement({ onClose }) {
  const [holidays, setHolidays] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({ date: '', name: '' });

  useEffect(() => {
    setHolidays(storage.getHolidays());
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    if (!form.date || !form.name) return alert("Date and name required");
    const existing = holidays.find(h => h.date === form.date);
    if (existing && !window.confirm("Holiday already exists on this date. Overwrite?")) return;
    const newList = existing
      ? holidays.map(h => h.date === form.date ? form : h)
      : [...holidays, form];
    newList.sort((a, b) => new Date(a.date) - new Date(b.date));
    storage.saveHolidays(newList);
    setHolidays(newList);
    setIsAdding(false);
    setForm({ date: '', name: '' });
  };

  const handleDelete = (date) => {
    if (window.confirm("Delete this holiday?")) {
      const newList = holidays.filter(h => h.date !== date);
      storage.saveHolidays(newList);
      setHolidays(newList);
    }
  };

  return createPortal(
    <div className="tmng-portal">
      {/* Header */}
      <header className="tmng-header">
        <div className="tmng-header-inner">
          <button className="tmng-back-btn" onClick={isAdding ? () => setIsAdding(false) : onClose}>
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className="tmng-title">{isAdding ? 'Add Holiday' : 'Manage Holidays'}</h2>
          {!isAdding ? (
            <button className="tmng-add-btn" onClick={() => setIsAdding(true)}>
              <span className="material-symbols-outlined">add</span>
            </button>
          ) : (
            <div style={{ width: 40 }} />
          )}
        </div>
      </header>

      {!isAdding ? (
        <div className="tmng-content">
          {holidays.length === 0 ? (
            <div className="tmng-empty">
              <span className="material-symbols-outlined tmng-empty-icon">beach_access</span>
              <p className="tmng-empty-text">No holidays added yet.</p>
              <span className="tmng-empty-sub">Tap + to add a holiday or break</span>
            </div>
          ) : (
            <div className="tmng-day-cards">
              {holidays.map(h => (
                <div key={h.date} className="tmng-class-card">
                  <div className="tmng-card-edge" style={{ background: 'var(--secondary)' }} />
                  <div className="tmng-card-body">
                    <div className="tmng-card-top">
                      <span className="tmng-card-time">
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>event</span>
                        {new Date(h.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      <button className="tmng-del-btn" onClick={() => handleDelete(h.date)}>
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                    <h4 className="tmng-card-subject">{h.name}</h4>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <form className="tmng-form" onSubmit={handleSave}>
          <div className="tmng-field">
            <label className="tmng-label">Date *</label>
            <input
              className="tmng-input"
              type="date"
              required
              value={form.date}
              onChange={e => setForm({ ...form, date: e.target.value })}
            />
          </div>
          <div className="tmng-field">
            <label className="tmng-label">Holiday Name *</label>
            <input
              className="tmng-input"
              required
              placeholder="e.g. Diwali, Republic Day"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <button type="submit" className="tmng-save-btn">Save Holiday</button>
        </form>
      )}
    </div>,
    document.body
  );
}
