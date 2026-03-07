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
    if (existing) {
      if(!window.confirm("Holiday already exists on this date. Overwrite?")) return;
    }
    
    const newList = existing 
      ? holidays.map(h => h.date === form.date ? form : h)
      : [...holidays, form];
      
    // Sort by date
    newList.sort((a,b) => new Date(a.date) - new Date(b.date));
    
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
    <div className="fullscreen-portal mng-portal">
      <div className="portal-header">
        <button className="back-btn" onClick={onClose}>← Back</button>
        <h2>Manage Holidays</h2>
      </div>

      <div className="portal-content">
        {!isAdding ? (
          <>
            <button className="add-fab" onClick={() => setIsAdding(true)}>+ Add Holiday</button>
            
            {holidays.length === 0 ? (
               <div className="empty-state">No holidays added yet.</div>
            ) : (
              <div className="class-list">
                {holidays.map(h => (
                  <div key={h.date} className="list-item">
                    <div className="list-info">
                      <span className="badge">{new Date(h.date).toLocaleDateString()}</span>
                      <h4>{h.name}</h4>
                    </div>
                    <button className="del-btn" onClick={() => handleDelete(h.date)}>🗑️</button>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <form className="add-form" onSubmit={handleSave}>
            <h3>Add New Holiday</h3>
            
            <div className="form-group">
              <label>Date</label>
              <input type="date" required value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
            </div>

            <div className="form-group">
              <label>Holiday Name</label>
              <input required placeholder="e.g. Diwali" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            </div>

            <div className="form-actions">
              <button type="button" className="cancel-btn" onClick={() => setIsAdding(false)}>Cancel</button>
              <button type="submit" className="save-btn">Save</button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
