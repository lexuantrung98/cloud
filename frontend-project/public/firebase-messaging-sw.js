// Firebase Cloud Messaging Service Worker
// Handles background notifications

importScripts('https://www.gstatic.com/firebasejs/11.2.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.2.0/firebase-messaging-compat.js');

// Initialize Firebase in service worker
firebase.initializeApp({
  apiKey: "AIzaSyB7wTAoHAH39Y27q-NlUo-1xpdIYmb-Cz0",
  authDomain: "collabsphere-8ebac.firebaseapp.com",
  projectId: "collabsphere-8ebac",
  storageBucket: "collabsphere-8ebac.firebasestorage.app",
  messagingSenderId: "584749741916",
  appId: "1:584749741916:web:6ac541bb31f8cdd52e7399",
  measurementId: "G-1X1VPPRETB"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message received:', payload);

  const notificationTitle = payload.notification?.title || 'CollabSphere';
  const notificationOptions = {
    body: payload.notification?.body || 'New notification',
    icon: '/logo.png',
    badge: '/badge.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event);
  
  event.notification.close();

  // Navigate to app when notification is clicked
  event.waitUntil(
    clients.openWindow('/')
  );
});
