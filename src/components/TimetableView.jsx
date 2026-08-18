import { useState, useEffect } from 'react';
import { storage } from '../services/storage';
import { timetableService } from '../services/timetable';
import { dateUtils } from '../utils/dateUtils';
import ClassCard from './ClassCard';
import './TimetableView.css';

export default function TimetableView() {
  const [selectedDate, setSelectedDate] = useState(dateUtils.formatDate(new Date()));
  const [classes, setClasses] = useState([]);
  const [records, setRecords] = useState([]);
  const [holiday, setHoliday] = useState(null);

  const loadDataForDate = (dateStr) => {
    setHoliday(timetableService.getHolidayForDate(dateStr));
    setClasses(timetableService.getClassesForDate(dateStr));
    setRecords(storage.getRecords().filter(r => r.date === dateStr));
  };

  useEffect(() => {
    loadDataForDate(selectedDate);
  }, [selectedDate]);

  const handleUpdateStatus = (subject, hour, status) => {
    storage.addRecord({ date: selectedDate, subject, hour, status });
    setRecords(storage.getRecords().filter(r => r.date === selectedDate));
  };

  const navigateDay = (direction) => {
    const current = dateUtils.parseDate(selectedDate);
    current.setDate(current.getDate() + direction);
    setSelectedDate(dateUtils.formatDate(current));
  };

  const getDayName = () => {
    const d = dateUtils.parseDate(selectedDate);
    return d.toLocaleDateString('en-US', { weekday: 'long' });
  };

  const getDateLabel = () => {
    const d = dateUtils.parseDate(selectedDate);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isToday = selectedDate === dateUtils.formatDate(new Date());
  const isSunday = dateUtils.getDayName(dateUtils.parseDate(selectedDate)) === 'Sunday';

  return (
    <div className="timetable-view">
      {/* Top App Bar */}
      <header className="tv-header">
        <div className="tv-header-inner">
          <h1 className="tv-app-title">Timetable</h1>
        </div>
      </header>

      <main className="tv-main">
        {/* Day Selector */}
        <section className="tv-day-selector-section">
          <div className="tv-day-selector">
            <button
              className="tv-day-nav-btn"
              aria-label="Previous Day"
              onClick={() => navigateDay(-1)}
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <div className="tv-day-center">
              <h2 className="tv-day-name">{getDayName()}</h2>
              <span className="tv-date-label">{getDateLabel()}</span>
            </div>
            <button
              className="tv-day-nav-btn"
              aria-label="Next Day"
              onClick={() => navigateDay(1)}
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
          {/* Dots indicating Day of Week (Mon-Fri) */}
          <div className="tv-dots">
            {[0, 1, 2, 3, 4].map(idx => {
              const currentDayIndex = dateUtils.parseDate(selectedDate).getDay() - 1;
              return (
                <div key={idx} className={`tv-dot ${currentDayIndex === idx ? 'active' : ''}`} />
              );
            })}
          </div>
        </section>

        {/* Classes List */}
        <section className="tv-classes-section">
          {holiday && (
            <div className="tv-holiday-banner">
              <span className="material-symbols-outlined tv-holiday-icon">celebration</span>
              <div>
                <h3 className="tv-holiday-title">Holiday</h3>
                <p className="tv-holiday-name">{holiday.name}</p>
              </div>
            </div>
          )}

          {!holiday && isSunday && (
            <div className="tv-empty-state">
              <span className="material-symbols-outlined tv-empty-icon">weekend</span>
              <p className="tv-empty-title">No classes on Sunday.</p>
              <span className="tv-empty-sub">Enjoy your weekend!</span>
            </div>
          )}

          {!holiday && !isSunday && classes.length === 0 && (
            <div className="tv-empty-state">
              <span className="material-symbols-outlined tv-empty-icon">beach_access</span>
              <p className="tv-empty-title">No classes today.</p>
              <span className="tv-empty-sub">You're all clear!</span>
            </div>
          )}

          {!holiday && !isSunday && classes.map((cls, idx) => {
            const rec = records.find(r => r.hour === cls.hour && r.subject === cls.subject);
            const status = rec ? rec.status : 'unmarked';
            
            // Edge color based on status
            let edgeClass = 'primary';
            if (status === 'present') edgeClass = 'secondary';
            if (status === 'absent') edgeClass = 'error';

            // Check if this class is just before the 12:35 - 01:35 PM lunch break
            // and if there is a subsequent class after the break.
            // We can determine this by checking if the next class's start time or hour is after lunch.
            // To simplify, we check if the current class ends before/at 12:40 PM and the next class is after 1:30 PM.
            let showLunchBreak = false;
            const nextCls = classes[idx + 1];
            if (nextCls) {
              const currentHourNum = Number(cls.hour);
              const nextHourNum = Number(nextCls.hour);
              
              if (!isNaN(currentHourNum) && !isNaN(nextHourNum)) {
                 if (currentHourNum <= 4 && nextHourNum >= 5) {
                    showLunchBreak = true;
                 }
              } else {
                const thisEnd = cls.endtime ? cls.endtime.replace(/\s*[A-Z]+/i, '').trim() : '';
                if (thisEnd.includes('12:35') || thisEnd.includes('12:40') || thisEnd.includes('12:45')) {
                   showLunchBreak = true;
                }
              }
            }

            return (
              <div key={`${cls.subject}-${cls.hour}-${idx}`}>
                <ClassCard
                  cls={cls}
                  status={status}
                  edgeColor={edgeClass}
                  onUpdateStatus={handleUpdateStatus}
                />
                
                {showLunchBreak && (
                   <div className="tv-lunch-break">
                     <div className="tv-lunch-line"></div>
                     <div className="tv-lunch-text">
                       <span className="material-symbols-outlined">restaurant</span>
                       <span>Lunch Break (12:35 PM - 01:35 PM)</span>
                     </div>
                     <div className="tv-lunch-line"></div>
                   </div>
                )}
              </div>
            );
          })}
        </section>
      </main>
    </div>
  );
}
