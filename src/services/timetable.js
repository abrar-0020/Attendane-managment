import { storage } from './storage';
import { dateUtils } from '../utils/dateUtils';

export const timetableService = {
  getClassesForDate: (dateString) => {
    const dateObj = new Date(dateString);
    const dayName = dateUtils.getDayName(dateObj);
    
    // Check if it's a Sunday
    if (dayName === 'Sunday') {
      return [];
    }
    
    const allClasses = storage.getTimetable();
    
    // Filter by day of week and if the class has started (class.startDate <= dateString)
    const todaysClasses = allClasses.filter(cls => {
      if (cls.day !== dayName) return false;
      if (cls.startDate && !dateUtils.isBeforeOrEqual(cls.startDate, dateString)) {
        return false;
      }
      return true;
    });

    // Sort by hour
    return todaysClasses.sort((a, b) => a.hour - b.hour);
  },

  getHolidayForDate: (dateString) => {
    const holidays = storage.getHolidays();
    return holidays.find(h => h.date === dateString);
  },
  
  // Predicts the next logical day/hour combination for management screens
  suggestNextSlot: () => {
    const schedule = storage.getTimetable();
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Default to Monday hour 1
    if (schedule.length === 0) {
      return { day: 'Monday', hour: 1 };
    }
    
    // Find the max hour populated generally, or we just find the last entry
    // Actually, a simple approach is finding the last day/hour in the schedule and suggesting next hour
    const lastEntry = schedule[schedule.length - 1];
    let nextHour = lastEntry.hour + 1;
    let nextDay = lastEntry.day;
    if (nextHour > 8) {
      nextHour = 1;
      const index = days.indexOf(nextDay);
      nextDay = days[(index + 1) % days.length];
    }
    return { day: nextDay, hour: nextHour };
  }
};
