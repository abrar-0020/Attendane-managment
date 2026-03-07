const CACHE_NAME = 'attendit-v6';
const NOTIF_CACHE = 'attendit-notification-data';

const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== NOTIF_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-class-reminders') {
    event.waitUntil(checkAndFireReminders());
  }
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'Update', body: 'New information' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: data.url
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

async function checkAndFireReminders() {
  try {
    const cache = await caches.open(NOTIF_CACHE);
    const response = await cache.match('/api/notification-data');
    if (!response) return;
    const { timetable, prefs } = await response.json();
    
    if (!prefs.classReminders) return;

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const now = new Date();
    const todayStr = days[now.getDay()];

    const todaysClasses = timetable.filter(c => c.day === todayStr);
    
    for (const cls of todaysClasses) {
      const [hours, mins] = cls.starttime.split(':').map(Number);
      const classTime = new Date();
      classTime.setHours(hours, mins, 0, 0);

      const reminderTime = new Date(classTime.getTime() - prefs.reminderMinutes * 60000);
      const diffStr = (reminderTime.getTime() - now.getTime()) / 60000;

      // If the reminder window is within the past 15 mins (assuming periodic sync every 15 mins)
      if (diffStr <= 0 && diffStr > -15) {
        self.registration.showNotification(`Upcoming Class: ${cls.subject}`, {
          body: `Starts in ${Math.round(diffStr + prefs.reminderMinutes)} minutes at ${cls.starttime} in ${cls.room}`,
          icon: '/icon-192.png',
          tag: `class-${cls.subject}-${cls.starttime}`
        });
      }
    }
  } catch (err) {
    console.error('Periodic sync check failed:', err);
  }
}
