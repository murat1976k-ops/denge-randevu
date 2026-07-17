const CACHE = 'denge-sw-v1';

self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SCHEDULE') {
    scheduleReminders(e.data.appointments || []);
  }
});

function scheduleReminders(apts) {
  const now = Date.now();
  apts.forEach(apt => {
    if (apt.status === 'cancelled') return;
    const parts = apt.date.split('-');
    const tParts = apt.time.split(':');
    const aptTime = new Date(
      parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]),
      parseInt(tParts[0]), parseInt(tParts[1])
    ).getTime();
    const notifTime = aptTime - 24*60*60*1000;
    const delay = notifTime - now;
    if (delay > 0 && delay < 36*60*60*1000) {
      setTimeout(() => {
        self.registration.showNotification('Randevu Hatırlatması — Denge', {
          body: apt.name + ' — Yarın ' + apt.time + ' randevusu var',
          icon: 'https://murat1976k-ops.github.io/denge-randevu/icon.png',
          tag: 'remind-' + apt.id,
          requireInteraction: true,
          vibrate: [200, 100, 200],
          data: apt
        });
      }, delay);
    }
  });
  // Save to cache for periodic sync
  caches.open(CACHE).then(cache => {
    cache.put('appointments', new Response(JSON.stringify(apts)));
  });
}

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({type:'window', includeUncontrolled:true}).then(list => {
      if (list.length) return list[0].focus();
      return clients.openWindow('https://murat1976k-ops.github.io/denge-randevu/');
    })
  );
});

self.addEventListener('periodicsync', e => {
  if (e.tag === 'reminder-check') {
    e.waitUntil(checkFromCache());
  }
});

async function checkFromCache() {
  const cache = await caches.open(CACHE);
  const resp = await cache.match('appointments');
  if (!resp) return;
  const apts = await resp.json();
  scheduleReminders(apts);
}
