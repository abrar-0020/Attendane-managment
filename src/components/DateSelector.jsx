import { useEffect, useRef } from 'react';
import { dateUtils } from '../utils/dateUtils';
import './DateSelector.css';

export default function DateSelector({ startDateStr, selectedDateStr, onSelectDate }) {
  const containerRef = useRef(null);
  
  const dates = dateUtils.getDatesForScroller(startDateStr);
  const todayStr = dateUtils.formatDate(new Date());

  useEffect(() => {
    // Scroll the selected date into view on mount or change
    const activeEl = containerRef.current?.querySelector('.date-chip.active');
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [selectedDateStr]);

  return (
    <div className="date-selector-container" ref={containerRef}>
      {dates.map(dateStr => {
        const dateObj = dateUtils.parseDate(dateStr);
        const dayName = dateUtils.getShortDayName(dateObj);
        const dateNum = dateObj.getDate();
        const monthName = dateObj.toLocaleString('default', { month: 'short' });
        const isToday = dateStr === todayStr;
        const isActive = dateStr === selectedDateStr;
        
        return (
          <div 
            key={dateStr}
            className={`date-chip ${isActive ? 'active' : ''} ${isToday ? 'today' : ''}`}
            onClick={() => onSelectDate(dateStr)}
          >
            <span className="day-name">{dayName}</span>
            <span className="date-num">{dateNum}</span>
            <span className="month-name">{monthName}</span>
            {isToday && <div className="today-dot"></div>}
          </div>
        );
      })}
    </div>
  );
}
