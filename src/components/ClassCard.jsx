import { useState, useRef, useEffect } from 'react';
import './ClassCard.css';

export default function ClassCard({ cls, status, edgeColor, onUpdateStatus }) {
  const [showMenu, setShowMenu] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const menuRef = useRef();
  const timerRef = useRef(null);
  const touchStartY = useRef(0);
  const SCROLL_THRESHOLD = 10;

  const handleUpdate = (newStatus) => {
    onUpdateStatus(cls.subject, cls.hour, newStatus);
    setShowMenu(false);
  };

  const handlePointerDown = (e) => {
    touchStartY.current = e.clientY;
    setIsPressed(true);
    timerRef.current = setTimeout(() => {
      // 2 seconds held = toggle absent
      const nextStatus = status === 'absent' ? 'unmarked' : 'absent';
      handleUpdate(nextStatus);
      timerRef.current = null;
      setIsPressed(false);
      if (navigator.vibrate) navigator.vibrate([60, 30, 60]);
    }, 2000);
  };

  const handlePointerMove = (e) => {
    if (timerRef.current) {
      if (Math.abs(e.clientY - touchStartY.current) > SCROLL_THRESHOLD) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
        setIsPressed(false);
      }
    }
  };

  const handlePointerUp = (e) => {
    setIsPressed(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      // Tapped = toggle present
      const nextStatus = status === 'present' ? 'unmarked' : 'present';
      handleUpdate(nextStatus);
      if (navigator.vibrate) navigator.vibrate(40);
    }
  };

  const handlePointerCancel = () => {
    setIsPressed(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
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
    <div className={`cc-card ${isCancelled ? 'cancelled' : ''} ${isPressed ? 'pressing' : ''}`}>
      <div className={`cc-edge bg-${isCancelled ? 'error' : edgeColor}`}></div>
      
      <div 
        className="cc-body"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onContextMenu={e => {
          // Prevent context menu to allow long-press on mobile
          e.preventDefault();
        }}
      >
        <div className="cc-header">
          <h3 className={`cc-subject ${isCancelled ? 'line-through' : ''}`}>
            {cls.subject}
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
