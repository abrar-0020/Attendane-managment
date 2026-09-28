import { Platform, ToastAndroid } from 'react-native';
import Constants from 'expo-constants';
import { storage } from './storage';
import { timetableService } from './timetable';
import { dateUtils } from '../utils/dateUtils';

// expo-notifications push token registration was removed from Expo Go in SDK 53.
// We detect Expo Go at runtime and skip the import entirely to avoid the error.
// In a proper dev build or production APK, this will work fully.
const isExpoGo = Constants.appOwnership === 'expo';

let Notifications: any = null;

try {
  Notifications = require('expo-notifications');
  if (Notifications?.setNotificationHandler) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  }
} catch (e) {
  console.warn('[Notifications] expo-notifications not available', e);
}

export const notificationService = {
  async requestPermissions(): Promise<boolean> {
    if (!Notifications) return false;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('class-reminders', {
        name: 'Class Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4f46e5',
      });
      await Notifications.setNotificationChannelAsync('attendance-marks', {
        name: 'Attendance Updates',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 150],
        lightColor: '#22c55e',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  },

  async scheduleClassReminders() {
    if (!Notifications) return;

    const prefs = await storage.getNotificationPrefs();
    if (!prefs?.classReminders) return;

    const reminderMinutes: number = prefs.reminderMinutes ?? 10;

    // Cancel existing class reminder notifications
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if (n.content.data?.type === 'class-reminder') {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }

    const timetable = await storage.getTimetable();
    if (!timetable || timetable.length === 0) return;

    const daysMap: Record<string, number> = {
      'Sunday': 1,
      'Monday': 2,
      'Tuesday': 3,
      'Wednesday': 4,
      'Thursday': 5,
      'Friday': 6,
      'Saturday': 7
    };

    let scheduledCount = 0;

    for (const cls of timetable) {
      if (!cls.starttime || !cls.day || !daysMap[cls.day]) continue;

      const [hourStr, minStr] = cls.starttime.split(':');
      let triggerHour = parseInt(hourStr, 10);
      let triggerMin = parseInt(minStr || '0', 10);

      // Subtract reminderMinutes
      triggerMin -= reminderMinutes;
      while (triggerMin < 0) {
        triggerMin += 60;
        triggerHour -= 1;
      }
      if (triggerHour < 0) {
        triggerHour += 24;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Class in ${reminderMinutes} minutes`,
          body: `${cls.subject}${cls.room ? ' · ' + cls.room : ''} at ${cls.starttime}`,
          sound: true,
          data: { type: 'class-reminder', subject: cls.subject },
        },
        trigger: {
          weekday: daysMap[cls.day],
          hour: triggerHour,
          minute: triggerMin,
          repeats: true,
        },
      });
      scheduledCount++;
    }

    console.log(`[Notifications] Scheduled ${scheduledCount} weekly class reminder(s)`);
  },

  async notifyAttendanceMarked(subject: string, status: 'present' | 'absent', date?: string) {
    const isPresent = status === 'present';
    const body = isPresent
      ? `You've been marked present for ${subject}.`
      : `You've been marked absent for ${subject}.`;

    if (Platform.OS === 'android') {
      ToastAndroid.show(body, ToastAndroid.SHORT);
    }
  },

  async cancelAll() {
    if (!Notifications) return;
    await Notifications.cancelAllScheduledNotificationsAsync();
  },
};
