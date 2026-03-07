import { storage } from './storage';

export const notificationsService = {
  isSupported: () => 'Notification' in window && 'serviceWorker' in navigator,
  
  hasPermission: () => Notification.permission === 'granted',
  
  requestPermission: async () => {
    if (!notificationsService.isSupported()) return false;
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  },

  scheduleInAppReminders: (todaysClasses, prefs) => {
    if (!prefs.classReminders || !notificationsService.hasPermission()) return;
    
    const now = new Date();
    todaysClasses.forEach(cls => {
      const [hours, mins] = cls.starttime.split(':').map(Number);
      const classTime = new Date();
      classTime.setHours(hours, mins, 0, 0);
      
      const reminderTime = new Date(classTime.getTime() - prefs.reminderMinutes * 60000);
      const timeUntilReminder = reminderTime.getTime() - now.getTime();
      
      if (timeUntilReminder > 0 && timeUntilReminder < 24 * 60 * 60 * 1000) {
        setTimeout(() => {
          notificationsService.showNotification(
            `Upcoming Class: ${cls.subject}`,
            {
              body: `Starts in ${prefs.reminderMinutes} minutes at ${cls.starttime} in ${cls.room}`,
              icon: '/icon-192.png',
              badge: '/icon-192.png',
              tag: `class-${cls.subject}-${cls.starttime}`
            }
          );
        }, timeUntilReminder);
      }
    });
  },

  checkAndNotifyLowAttendance: (stats, threshold) => {
    if (!notificationsService.hasPermission()) return;
    
    const subjectsBelow = stats.filter(s => s.percentage < threshold && s.total > 0);
    
    if (subjectsBelow.length > 0) {
      const bodyText = subjectsBelow.map(s => `${s.subject}: ${s.percentage}%`).join(', ');
      notificationsService.showNotification(
        'Low Attendance Alert',
        {
          body: `The following subjects are below ${threshold}%: ${bodyText}`,
          icon: '/icon-192.png',
          requireInteraction: true,
          tag: 'low-attendance-alert'
        }
      );
    }
  },

  showNotification: async (title, options) => {
    if (notificationsService.hasPermission()) {
      try {
        const registration = await navigator.serviceWorker.ready;
        registration.showNotification(title, options);
      } catch (err) {
        new Notification(title, options);
      }
    }
  },

  registerPeriodicSync: async () => {
    if (!('serviceWorker' in navigator)) return false;
    try {
      const registration = await navigator.serviceWorker.ready;
      if ('periodicSync' in registration) {
        // Requires user permission and potentially installed PWA depending on browser
        const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
        if (status.state === 'granted') {
          await registration.periodicSync.register('check-class-reminders', {
            minInterval: 15 * 60 * 1000 // 15 mins
          });
          return true;
        }
      }
    } catch (e) {
      console.warn('Periodic sync could not be registered', e);
    }
    return false;
  },

  syncTimetableToCache: async () => {
    if (!('caches' in window)) return;
    try {
      const timetable = storage.getTimetable();
      const prefs = storage.getNotificationPrefs();
      const data = new Response(JSON.stringify({ timetable, prefs }));
      const cache = await caches.open('attendknow-notification-data');
      await cache.put('/api/notification-data', data);
    } catch (e) {
      console.warn('Failed to sync to cache', e);
    }
  }
};
