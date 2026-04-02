import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import type { Messaging } from 'firebase/messaging';
import { firebaseConfig, vapidKey } from './config';

let messaging: Messaging | null = null;
let currentToken: string | null = null;

// Initialize Firebase
const app = initializeApp(firebaseConfig);

try {
  messaging = getMessaging(app);
  console.log('✅ Firebase Messaging initialized');
} catch (error) {
  console.warn('⚠️ Firebase Messaging not supported in this browser', error);
}

/**
 * Request notification permission and get FCM token
 */
export async function requestNotificationPermission(): Promise<string | null> {
  if (!messaging) {
    console.warn('Firebase Messaging not available');
    return null;
  }

  try {
    // Request permission
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('✅ Notification permission granted');
      
      try {
        // Try to get FCM token
        const token = await getToken(messaging, { vapidKey });
        
        if (token) {
          console.log('✅ FCM Token:', token);
          currentToken = token;
          
          // Send token to backend
          await saveTokenToBackend(token);
          
          return token;
        } else {
          console.log('⚠️ No registration token available');
          return null;
        }
      } catch (tokenError) {
        // FCM token failed (common on localhost), but permission granted
        console.warn('⚠️ FCM token failed (push service error), but local notifications will work:', tokenError);
        
        //Return null but user can still see browser notifications
        return null;
      }
    } else {
      console.log('❌ Notification permission denied');
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting notification permission:', error);
    return null;
  }
}

/**
 * Save FCM token to backend
 */
async function saveTokenToBackend(token: string): Promise<void> {
  try {
    // Get JWT token from localStorage
    const jwtToken = localStorage.getItem('token');
    
    if (!jwtToken) {
      console.log('⚠️ User not logged in, skipping token save');
      return;
    }

    const response = await fetch('/api/Notification/save-fcm-token', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      },
      body: JSON.stringify({ token })
    });

    if (response.ok) {
      console.log('✅ FCM token saved to backend');
    } else {
      console.warn('⚠️ Failed to save token, status:', response.status);
    }
  } catch (error) {
    console.warn('⚠️ Failed to save FCM token to backend:', error);
  }
}

/**
 * Get current FCM token (without requesting permission again)
 */
export function getCurrentToken(): string | null {
  return currentToken;
}

/**
 * Subscribe to topic (note: web clients can't directly subscribe to topics)
 * This should be done server-side by sending the token to your backend
 */
export async function subscribeToTopic(topic: string): Promise<void> {
  const token = getCurrentToken();
  if (!token) {
    console.warn('No FCM token available');
    return;
  }

  try {
    // TODO: Call your backend API to subscribe this token to the topic
    const response = await fetch('/api/communication/Notification/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, topic })
    });

    if (response.ok) {
      console.log(`✅ Subscribed to topic: ${topic}`);
    }
  } catch (error) {
    console.error(`❌ Failed to subscribe to topic ${topic}:`, error);
  }
}

/**
 * Setup foreground message handler
 */
export function onForegroundMessage(callback: (payload: unknown) => void): void {
  if (!messaging) {
    return;
  }

  onMessage(messaging, (payload) => {
    console.log('📩 Foreground message received:', payload);
    callback(payload);
  });
}

/**
 * Show browser notification
 */
export function showNotification(title: string, options?: NotificationOptions): void {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, options);
  }
}

export default messaging;
