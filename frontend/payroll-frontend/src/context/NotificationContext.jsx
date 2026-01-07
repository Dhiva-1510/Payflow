import { createContext, useContext, useState, useCallback } from 'react';
import Notification from '../components/Notification';

/**
 * NotificationContext
 * Global notification system for displaying success, error, and info messages
 * Requirements: 7.6, 8.5 - Display appropriate error messages for authentication failures and network errors
 */
const NotificationContext = createContext(null);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((notification) => {
    const id = Date.now() + Math.random();
    setNotifications(prev => [...prev, { ...notification, id }]);
    return id;
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const showSuccess = useCallback((message, duration = 5000) => {
    return addNotification({ type: 'success', message, duration });
  }, [addNotification]);

  const showError = useCallback((message, duration = 7000) => {
    return addNotification({ type: 'error', message, duration });
  }, [addNotification]);

  const showInfo = useCallback((message, duration = 5000) => {
    return addNotification({ type: 'info', message, duration });
  }, [addNotification]);

  const showNetworkError = useCallback((message = 'Network error. Please check your connection.') => {
    return addNotification({ type: 'error', message, duration: 0 }); // duration 0 = persistent
  }, [addNotification]);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const value = {
    showSuccess,
    showError,
    showInfo,
    showNetworkError,
    removeNotification,
    clearAll
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {/* Notification Stack */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification, index) => (
          <div
            key={notification.id}
            style={{ transform: `translateY(${index * 4}px)` }}
          >
            <Notification
              type={notification.type}
              message={notification.message}
              duration={notification.duration}
              onClose={() => removeNotification(notification.id)}
            />
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
