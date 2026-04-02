import { useEffect } from 'react';
import { requestNotificationPermission, onForegroundMessage, showNotification } from '../firebase/messaging';
import { toast } from 'react-toastify';

interface MessagePayload {
  notification?: {
    title?: string;
    body?: string;
  };
  data?: Record<string, unknown>;
}

export function useFirebaseNotifications() {
  useEffect(() => {
    // Request notification permission on component mount
    const initNotifications = async () => {
      try {
        const token = await requestNotificationPermission();
        
        if (token) {
          console.log('✅ Notifications enabled, FCM token:', token);
          
          // TODO: Send token to backend to save for this user
          // await saveTokenToBackend(token);
        }
      } catch (error) {
        console.error('Failed to initialize notifications:', error);
      }
    };

    // Register foreground message handler
    onForegroundMessage((payload: unknown) => {
      const msg = payload as MessagePayload;
      console.log('📩 Received foreground message:', msg);
      
      const title = msg.notification?.title || 'New Notification';
      const body = msg.notification?.body || '';
      
      // Show toast notification
      toast.info(`${title}: ${body}`, {
        position: 'top-right',
        autoClose: 5000
      });
      
      // Also show browser notification if permission granted
      if (Notification.permission === 'granted') {
        showNotification(title, {
          body,
          icon: '/logo.png',
          badge: '/badge.png',
          data: msg.data
        });
      }
    });

    // Initialize notifications after a short delay to avoid blocking UI
    const timer = setTimeout(initNotifications, 2000);
    
    return () => clearTimeout(timer);
  }, []);
}
