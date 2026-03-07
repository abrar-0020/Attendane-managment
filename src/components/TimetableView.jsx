import { useState, useEffect } from 'react';
import DateSelector from './DateSelector';
import ClassCard from './ClassCard';
import { storage } from '../services/storage';
import { timetableService } from '../services/timetable';
import { dateUtils } from '../utils/dateUtils';
import './TimetableView.css';

export default function TimetableView() {
  const [selectedDate, setSelectedDate] = useState(dateUtils.formatDate(new Date()));
  const [classes, setClasses] = useState([]);
  const [records, setRecords] = useState([]);
  const [holiday, setHoliday] = useState(null);
  const [profile, setProfile] = useState({ name: 'Student' });
  const [startDate, setStartDate] = useState('');

  useEffect(() => {
    setProfile(storage.getProfile() || { name: 'Student' });
    setStartDate(storage.getStartDate());
  }, []);

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
    // Reload local records to re-render
    setRecords(storage.getRecords().filter(r => r.date === selectedDate));
  };

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good morning';
    if (hr < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const isSunday = dateUtils.getDayName(new Date(selectedDate)) === 'Sunday';

  return (
    <div className="timetable-view">
      <div className="header-section">
        <h1 className="greeting">{getGreeting()}, {profile.name.split(' ')[0]}</h1>
        <p className="subtitle">Here is your schedule.</p>
      </div>

      <div className="selector-wrapper">
        {startDate && <DateSelector 
          startDateStr={startDate} 
          selectedDateStr={selectedDate} 
          onSelectDate={setSelectedDate} 
        />}
      </div>

      <div className="classes-container">
        {holiday && (
          <div className="holiday-banner">
            <h3>🎉 Holiday</h3>
            <p>{holiday.name}</p>
          </div>
        )}

        {!holiday && isSunday && (
          <div className="empty-state">
            <div className="empty-icon">☕</div>
            <p>No classes on Sunday.</p>
            <span>Enjoy your weekend!</span>
          </div>
        )}

        {!holiday && !isSunday && classes.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🏖️</div>
            <p>No classes scheduled for today.</p>
            <span>You're all clear!</span>
          </div>
        )}

        {!holiday && !isSunday && classes.map((cls, idx) => {
          const rec = records.find(r => r.hour === cls.hour && r.subject === cls.subject);
          const status = rec ? rec.status : 'unmarked';
          
          return (
            <ClassCard 
              key={`${cls.subject}-${cls.hour}-${idx}`}
              cls={cls}
              status={status}
              onUpdateStatus={handleUpdateStatus}
            />
          );
        })}
      </div>
    </div>
  );
}
