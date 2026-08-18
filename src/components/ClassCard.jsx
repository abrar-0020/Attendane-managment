import { useState, useRef, useEffect } from 'react';
import './ClassCard.css';

export default function ClassCard({ cls, status, edgeColor, onUpdateStatus }) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef();

  const handleUpdate = (newStatus) => {
    onUpdateStatus(cls.subject, cls.hour, newStatus);
    setShowMenu(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuRef]);

  const isCancelled = status === 'cancelled';

  return (
    <div className={`cc-card ${isCancelled ? 'cancelled' : ''}`}>
      <div className={`cc-edge bg-${isCancelled ? 'error' : edgeColor}`}></div>
      
      <div className="cc-body">
        <div className="cc-header">
          <h3 className={`cc-subject ${isCancelled ? 'line-through' : ''}`}>
            <span className="cc-subject-name">{cls.subjectName || cls.subject}</span>
          </h3>
          {isCancelled && (
            <span className="cc-cancelled-pill">Cancelled</span>
          )}
        </div>
        
        <div className={`cc-meta ${isCancelled ? 'line-through' : ''}`}>
          <div className="cc-meta-item">
            <span className="material-symbols-outlined cc-icon">schedule</span>
            <span>{cls.starttime && cls.endtime ? `${cls.starttime} - ${cls.endtime}` : `Hr ${cls.hour}`}</span>
          </div>
          <span className="cc-dot">•</span>
          <div className="cc-meta-item">
            <span className="material-symbols-outlined cc-icon">meeting_room</span>
            <span>{cls.room || 'TBA'}</span>
          </div>
        </div>
      </div>

      <div className="cc-actions" ref={menuRef}>
        <button 
          className="cc-menu-btn" 
          onClick={() => setShowMenu(!showMenu)}
          aria-label="Options"
        >
          <span className="material-symbols-outlined">more_vert</span>
        </button>

        {showMenu && (
          <div className="cc-dropdown-menu">
            <button onClick={() => handleUpdate('present')} className={status === 'present' ? 'active text-secondary' : ''}>
              Present
            </button>
            <button onClick={() => handleUpdate('absent')} className={status === 'absent' ? 'active text-error' : ''}>
              Absent
            </button>
            <button onClick={() => handleUpdate('unmarked')} className={status === 'unmarked' ? 'active text-outline' : ''}>
              Reset
            </button>
            <div className="cc-dropdown-divider"></div>
            <button onClick={() => handleUpdate('cancelled')} className={status === 'cancelled' ? 'active text-error' : ''}>
              Cancel Class
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
