/// <reference lib="webworker" />

const CACHE_NAME = "subtrack-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    vibrate: [100, 50, 100],
    data: {
      url: data.url || "/",
      subscriptionId: data.subscriptionId,
      action: data.action,
    },
    actions: data.actions || [],
    tag: data.tag || "subtrack-notification",
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(data.title || "SubTrack", options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.postMessage({
            type: "NOTIFICATION_CLICK",
            action: event.action,
            data: event.notification.data,
          });
          return;
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
