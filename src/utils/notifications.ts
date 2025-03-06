/**
 * Utility for handling notifications that persist across route navigations
 */

interface Notification {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

// Key for sessionStorage
const SESSION_NOTIFICATION_KEY = 'app_notification';

/**
 * Stores a notification to be displayed on the next route
 */
export const setNotification = (notification: Notification): void => {
  sessionStorage.setItem(SESSION_NOTIFICATION_KEY, JSON.stringify(notification));
};

/**
 * Gets the notification if any and clears it
 */
export const getAndClearNotification = (): Notification | null => {
  const notificationStr = sessionStorage.getItem(SESSION_NOTIFICATION_KEY);
  
  if (notificationStr) {
    sessionStorage.removeItem(SESSION_NOTIFICATION_KEY);
    try {
      return JSON.parse(notificationStr);
    } catch (e) {
      console.error('Failed to parse notification', e);
    }
  }
  
  return null;
};

/**
 * Success notification shorthand
 */
export const notifySuccess = (message: string): void => {
  setNotification({ message, type: 'success' });
};

/**
 * Error notification shorthand
 */
export const notifyError = (message: string): void => {
  setNotification({ message, type: 'error' });
};

/**
 * Info notification shorthand
 */
export const notifyInfo = (message: string): void => {
  setNotification({ message, type: 'info' });
}; 