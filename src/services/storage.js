export const STORAGE_KEYS = {
  TIMETABLE: 'attendance_timetable',
  RECORDS: 'attendance_records',
  START_DATE: 'semester_start_date',
  HOLIDAYS: 'attendance_holidays',
  PROFILE: 'attendance_user_profile',
  BASE_COUNTS: 'attendance_base_counts',
  NOTIFICATIONS: 'attendance_notification_prefs',
  NOTIFIED_VERSION: 'app_notified_version'
};

const getArray = (key) => JSON.parse(localStorage.getItem(key) || '[]');
const getObj = (key) => JSON.parse(localStorage.getItem(key) || 'null');
const setVal = (key, val) => localStorage.setItem(key, JSON.stringify(val));

export const storage = {
  getTimetable: () => getArray(STORAGE_KEYS.TIMETABLE),
  saveTimetable: (data) => setVal(STORAGE_KEYS.TIMETABLE, data),

  importTimetableData: (newClasses, newProfile) => {
    if (newProfile && (newProfile.name || newProfile.studentId)) {
      const current = storage.getProfile() || {};
      storage.saveProfile({ ...current, ...newProfile });
    }

    const currentClasses = storage.getTimetable();
    const merged = [...currentClasses];
    
    newClasses.forEach(nc => {
      // Uniqueness rule: Day + Hour + Subject
      const exists = merged.some(ec => 
        ec.day === nc.day && 
        ec.hour === nc.hour && 
        ec.subject === nc.subject &&
        ec.starttime === nc.starttime &&
        ec.endtime === nc.endtime
      );
      if (!exists) {
        merged.push(nc);
      }
    });

    storage.saveTimetable(merged);
  },

  // Records
  getRecords: () => getArray(STORAGE_KEYS.RECORDS),
  saveRecords: (data) => setVal(STORAGE_KEYS.RECORDS, data),

  addRecord: (record) => {
    // record: { date, subject, hour, status }
    let records = storage.getRecords();
    const existingIndex = records.findIndex(r => r.date === record.date && r.hour === record.hour && r.subject === record.subject);
    if (existingIndex > -1) {
      if (record.status === 'unmarked') {
        records.splice(existingIndex, 1);
      } else {
        records[existingIndex] = record;
      }
    } else if (record.status !== 'unmarked') {
      records.push(record);
    }
    storage.saveRecords(records);
  },

  getRecordStatus: (date, subject, hour) => {
    const records = storage.getRecords();
    const record = records.find(r => r.date === date && r.hour === hour && r.subject === subject);
    return record ? record.status : 'unmarked';
  },

  // Holidays
  getHolidays: () => getArray(STORAGE_KEYS.HOLIDAYS),
  saveHolidays: (data) => setVal(STORAGE_KEYS.HOLIDAYS, data),

  // Profile
  getProfile: () => getObj(STORAGE_KEYS.PROFILE),
  saveProfile: (data) => setVal(STORAGE_KEYS.PROFILE, data),
  hasProfile: () => localStorage.getItem(STORAGE_KEYS.PROFILE) !== null,

  // Start Date
  getStartDate: () => {
    const date = localStorage.getItem(STORAGE_KEYS.START_DATE);
    if (!date) {
      // Default to 14 days ago if not set
      const d = new Date();
      d.setDate(d.getDate() - 14);
      return d.toISOString().split('T')[0];
    }
    // Remove quotes if present
    return date.replace(/"/g, '');
  },
  saveStartDate: (date) => localStorage.setItem(STORAGE_KEYS.START_DATE, date),

  // Base Counts
  getBaseCounts: () => getObj(STORAGE_KEYS.BASE_COUNTS) || {},
  saveBaseCounts: (data) => setVal(STORAGE_KEYS.BASE_COUNTS, data),

  // Notification Preferences
  getNotificationPrefs: () => {
    const defaults = {
      classReminders: false,
      reminderMinutes: 10,
      lowAttendanceAlert: false,
      attendanceThreshold: 75
    };
    const prefs = getObj(STORAGE_KEYS.NOTIFICATIONS) || {};
    return { ...defaults, ...prefs };
  },
  saveNotificationPrefs: (data) => setVal(STORAGE_KEYS.NOTIFICATIONS, data),

  // App Version
  getNotifiedVersion: () => localStorage.getItem(STORAGE_KEYS.NOTIFIED_VERSION),
  saveNotifiedVersion: (version) => localStorage.setItem(STORAGE_KEYS.NOTIFIED_VERSION, version),

  // Clear all
  clearAll: () => {
    localStorage.clear();
  }
};
