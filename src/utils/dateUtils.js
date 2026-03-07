export const dateUtils = {
  // Get YYYY-MM-DD string from a Date object
  formatDate: (dateObj) => {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  getDayName: (dateObj) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dateObj.getDay()];
  },

  getShortDayName: (dateObj) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[dateObj.getDay()];
  },

  parseDate: (dateStr) => {
    return new Date(dateStr);
  },

  generateDateRange: (startDate, endDate) => {
    const start = dateUtils.parseDate(startDate);
    const end = dateUtils.parseDate(endDate);
    const dates = [];
    
    // start at 00:00:00
    start.setHours(0,0,0,0);
    end.setHours(0,0,0,0);
    
    let current = new Date(start);
    while (current <= end) {
      dates.push(dateUtils.formatDate(current));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  },
  
  // Calculate relative dates for scroller
  // returns dates from startDate up to today + 14 days
  getDatesForScroller: (startDateStr) => {
    const start = new Date(startDateStr);
    const end = new Date();
    end.setDate(end.getDate() + 14); // today + 14 days
    
    return dateUtils.generateDateRange(dateUtils.formatDate(start), dateUtils.formatDate(end));
  },

  isBeforeOrEqual: (date1, date2) => {
    return new Date(date1).setHours(0,0,0,0) <= new Date(date2).setHours(0,0,0,0);
  }
};
