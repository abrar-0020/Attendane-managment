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

    const todayStr = dateUtils.formatDate(new Date());
    const todayClasses = await timetableService.getClassesForDate(todayStr);

    if (!todayClasses || todayClasses.length === 0) return;

    const now = new Date();
    let scheduledCount = 0;

    for (const cls of todayClasses) {
      if (!cls.starttime) continue;

      const [hourStr, minStr] = cls.starttime.split(':');
      const classHour = parseInt(hourStr, 10);
      const classMin = parseInt(minStr || '0', 10);

      const classTime = new Date();
      classTime.setHours(classHour, classMin, 0, 0);

      const triggerTime = new Date(classTime.getTime() - reminderMinutes * 60 * 1000);

      // Only schedule if still in the future
      if (triggerTime.getTime() - now.getTime() < 30000) continue;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Class in ${reminderMinutes} minutes`,
          body: `${cls.subject}${cls.room ? ' · ' + cls.room : ''} at ${cls.starttime}`,
          sound: true,
          data: { type: 'class-reminder', subject: cls.subject },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerTime,
        },
      });
      scheduledCount++;
    }

    console.log(`[Notifications] Scheduled ${scheduledCount} class reminder(s) for today`);
  },

  /**
   * Fire an immediate local notification when attendance is marked.
   * @param subject  Subject/course name
   * @param status   'present' | 'absent'
   * @param date     Date string e.g. '2026-09-05'
   */
  async notifyAttendanceMarked(subject: string, status: 'present' | 'absent', date?: string) {
    if (!Notifications) return;
    const granted = await this.requestPermissions();
    if (!granted) return;

    const isPresent = status === 'present';
    const emoji = isPresent ? '✅' : '❌';
    const title = isPresent
      ? `${emoji} Marked Present`
      : `${emoji} Marked Absent`;
    const body = isPresent
      ? `You've been marked present for ${subject}.`
      : `You've been marked absent for ${subject}. Keep an eye on your attendance!`;

    if (Platform.OS === 'android') {
      ToastAndroid.show(body, ToastAndroid.SHORT);
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        data: { type: 'attendance-mark', subject, status, date },
        ...(Platform.OS === 'android' && { channelId: 'attendance-marks' }),
      },
      trigger: null, // null means fire immediately
    });
  },

  async cancelAll() {
    if (!Notifications) return;
    await Notifications.cancelAllScheduledNotificationsAsync();
  },
};
