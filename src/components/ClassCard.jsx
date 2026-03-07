import { useRef } from 'react';
import './ClassCard.css';

export default function ClassCard({ cls, status, onUpdateStatus }) {
  const timerRef = useRef(null);
  const clickCount = useRef(0);
  const touchStartY = useRef(0);
  const scrollThreshold = 10;

  const cycleStatus = (type) => {
    let nextStatus = 'unmarked';
    if (type === 'present') {
      nextStatus = status === 'present' ? 'unmarked' : 'present';
      if(navigator.vibrate) navigator.vibrate(40);
    } else if (type === 'absent-double') {
      nextStatus = status === 'absent' ? 'unmarked' : 'absent';
      if(navigator.vibrate) navigator.vibrate([60, 30, 60]);
    } else if (type === 'absent-long') {
      nextStatus = status === 'absent' ? 'unmarked' : 'absent';
      if(navigator.vibrate) navigator.vibrate([80, 40, 80]);
    }
    onUpdateStatus(cls.subject, cls.hour, nextStatus);
  };

  const handlePointerDown = (e) => {
    if (e.pointerType === 'touch') {
      touchStartY.current = e.clientY;
      timerRef.current = setTimeout(() => {
        cycleStatus('absent-long');
        timerRef.current = null;
      }, 600);
    }
  };

  const handlePointerMove = (e) => {
    if (e.pointerType === 'touch' && timerRef.current) {
      if (Math.abs(e.clientY - touchStartY.current) > scrollThreshold) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handlePointerUp = (e) => {
    if (e.pointerType === 'touch') {
      if (timerRef.current) { // Didn't trigger long press
        clearTimeout(timerRef.current);
        timerRef.current = null;
        cycleStatus('present'); // treat as a tap
      }
    } else {
      // Desktop
      clickCount.current += 1;
      if (clickCount.current === 1) {
        setTimeout(() => {
          if (clickCount.current === 1) {
            cycleStatus('present');
          } else {
            cycleStatus('absent-double');
          }
          clickCount.current = 0;
        }, 300); // 300ms to determine single/double click
      }
    }
  };

  const handlePointerCancel = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  return (
    <div 
      className={`class-card status-${status}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onContextMenu={e => e.preventDefault()} // prevent context menu on long press
    >
      <div className="card-content">
        <div className="subject-info">
          <span className="hour-badge">Hr {cls.hour}</span>
          <h3 className="subject-title">{cls.subject}</h3>
          <p className="time-room">{cls.starttime} - {cls.endtime} • {cls.room}</p>
        </div>
        
        <div className="status-indicator">
          {status === 'present' && <div className="icon-present">✓</div>}
          {status === 'absent' && <div className="icon-absent">✕</div>}
          {status === 'unmarked' && <div className="icon-empty"></div>}
        </div>
      </div>
      <div className="card-hint">
        Tap: Present • Double-tap/Long-press: Absent
      </div>
    </div>
  );
}
