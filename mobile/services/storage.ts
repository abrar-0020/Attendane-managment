import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export const STORAGE_KEYS = {
  TIMETABLE: 'attendance_timetable',
  RECORDS: 'attendance_records',
  START_DATE: 'semester_start_date',
  HOLIDAYS: 'attendance_holidays',
  PROFILE: 'attendance_user_profile',
  BASE_COUNTS: 'attendance_base_counts',
  NOTIFICATIONS: 'attendance_notification_prefs',
  NOTIFIED_VERSION: 'app_notified_version',
  THEME: 'attendance_theme',
  LINWAYS_CONFIG: 'linways_sync_config',
  EXACT_TIMETABLE: 'attendance_exact_timetable',
};

const getArray = async (key: string) => {
  const val = await AsyncStorage.getItem(key);
  return val ? JSON.parse(val) : [];
};

const getObj = async (key: string) => {
  const val = await AsyncStorage.getItem(key);
  return val ? JSON.parse(val) : null;
};

const setVal = async (key: string, val: any) => {
  await AsyncStorage.setItem(key, JSON.stringify(val));
};

export const storage = {
  getTimetable: () => getArray(STORAGE_KEYS.TIMETABLE),
  saveTimetable: (data: any) => setVal(STORAGE_KEYS.TIMETABLE, data),

  importTimetableData: async (newClasses: any[]) => {
    const currentClasses = await storage.getTimetable();
    const merged = [...currentClasses];
    
    newClasses.forEach(nc => {
      const existingIndex = merged.findIndex(ec => 
        ec.day === nc.day && 
        ec.hour === nc.hour
      );
      if (existingIndex > -1) {
        merged[existingIndex] = { ...merged[existingIndex], ...nc };
      } else {
        merged.push(nc);
      }
    });

    await storage.saveTimetable(merged);
  },

  getExactTimetable: () => getObj(STORAGE_KEYS.EXACT_TIMETABLE),
  saveExactTimetable: (data: any) => setVal(STORAGE_KEYS.EXACT_TIMETABLE, data),
  
  importExactTimetableData: async (dateClassMap: Record<string, any[]>) => {
    const current = (await storage.getExactTimetable()) || {};
    const merged = { ...current, ...dateClassMap };
    await storage.saveExactTimetable(merged);
  },

  // Records
  getRecords: () => getArray(STORAGE_KEYS.RECORDS),
  saveRecords: (data: any) => setVal(STORAGE_KEYS.RECORDS, data),

  addRecord: async (record: any) => {
    let records = await storage.getRecords();
    const existingIndex = records.findIndex((r: any) => r.date === record.date && r.hour === record.hour && r.subject === record.subject);
    if (existingIndex > -1) {
      if (record.status === 'unmarked') {
        records.splice(existingIndex, 1);
      } else {
        records[existingIndex] = record;
      }
    } else if (record.status !== 'unmarked') {
      records.push(record);
    }
    await storage.saveRecords(records);
  },

  getRecordStatus: async (date: string, subject: string, hour: string) => {
    const records = await storage.getRecords();
    const record = records.find((r: any) => r.date === date && r.hour === hour && r.subject === subject);
    return record ? record.status : 'unmarked';
  },

  // Holidays
  getHolidays: () => getArray(STORAGE_KEYS.HOLIDAYS),
  saveHolidays: (data: any) => setVal(STORAGE_KEYS.HOLIDAYS, data),

  // Profile
  getProfile: () => getObj(STORAGE_KEYS.PROFILE),
  saveProfile: (data: any) => setVal(STORAGE_KEYS.PROFILE, data),
  hasProfile: async () => (await AsyncStorage.getItem(STORAGE_KEYS.PROFILE)) !== null,

  // Start Date
  getStartDate: async () => {
    const date = await AsyncStorage.getItem(STORAGE_KEYS.START_DATE);
    if (!date) {
      const d = new Date();
      d.setDate(d.getDate() - 120);
      return d.toISOString().split('T')[0];
    }
    return date.replace(/"/g, '');
  },
  saveStartDate: (date: string) => AsyncStorage.setItem(STORAGE_KEYS.START_DATE, date),

  // Base Counts
  getBaseCounts: async () => (await getObj(STORAGE_KEYS.BASE_COUNTS)) || {},
  saveBaseCounts: (data: any) => setVal(STORAGE_KEYS.BASE_COUNTS, data),

  // Notification Preferences
  getNotificationPrefs: async () => {
    const defaults = {
      classReminders: false,
      reminderMinutes: 10,
      lowAttendanceAlert: false,
      attendanceThreshold: 75
    };
    const prefs = await getObj(STORAGE_KEYS.NOTIFICATIONS) || {};
    return { ...defaults, ...prefs };
  },
  saveNotificationPrefs: (data: any) => setVal(STORAGE_KEYS.NOTIFICATIONS, data),

  // App Version
  getNotifiedVersion: () => AsyncStorage.getItem(STORAGE_KEYS.NOTIFIED_VERSION),
  saveNotifiedVersion: (version: string) => AsyncStorage.setItem(STORAGE_KEYS.NOTIFIED_VERSION, version),

  // Theme
  getTheme: async () => (await AsyncStorage.getItem(STORAGE_KEYS.THEME)) || 'light',
  saveTheme: (theme: string) => AsyncStorage.setItem(STORAGE_KEYS.THEME, theme),

  // Linways Portal Sync Config (Using SecureStore!)
  getLinwaysConfig: async () => {
    if (Platform.OS === 'web') {
      const val = await AsyncStorage.getItem(STORAGE_KEYS.LINWAYS_CONFIG);
      return val ? JSON.parse(val) : null;
    }
    const val = await SecureStore.getItemAsync(STORAGE_KEYS.LINWAYS_CONFIG);
    return val ? JSON.parse(val) : null;
  },
  saveLinwaysConfig: async (data: any) => {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(STORAGE_KEYS.LINWAYS_CONFIG, JSON.stringify(data));
      return;
    }
    await SecureStore.setItemAsync(STORAGE_KEYS.LINWAYS_CONFIG, JSON.stringify(data));
  },

  // Clear all
  clearAll: async () => {
    await AsyncStorage.clear();
    if (Platform.OS !== 'web') {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.LINWAYS_CONFIG);
    }
  }
};
