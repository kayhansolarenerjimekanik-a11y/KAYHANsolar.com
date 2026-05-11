// KAYHAN Solar — demo service worker for Web Push.
// Real push payload handling will be wired when VAPID keys are set.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let title = "KAYHAN Solar";
  let body = "Yeni bir bildirim var.";
  let url = "/";
  try {
    if (event.data) {
      const payload = event.data.json();
      title = payload.title || title;
      body = payload.body || body;
      url = payload.url || url;
    }
  } catch {
    // payload was not JSON — fall back to defaults
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      badge: "/icons/badge.png",
      icon: "/icons/badge.png",
      data: { url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(self.clients.openWindow(url));
});
