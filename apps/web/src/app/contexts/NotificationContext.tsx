import { createContext, ReactNode, useContext, useRef, useState } from 'react';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (type: Notification['type'], message: string) => void;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const idCounterRef = useRef(0);

  const addNotification = (type: Notification['type'], message: string) => {
    // Generate ID using ref counter to avoid impure function during render
    idCounterRef.current += 1;
    const id = `notification-${idCounterRef.current}`;
    const notification = { id, type, message };

    setNotifications(prev => [...prev, notification]);

    // Auto remove after 5 seconds
    setTimeout(() => {
      removeNotification(id);
    }, 5000);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification }}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
}

function NotificationContainer() {
  const { notifications, removeNotification } = useNotification();

  return (
    <div className='fixed top-4 right-4 z-50 space-y-2'>
      {notifications.map(notification => (
        <div
          key={notification.id}
          className={`p-4 rounded-lg shadow-lg max-w-sm ${
            notification.type === 'success'
              ? 'bg-green-500'
              : notification.type === 'error'
                ? 'bg-red-500'
                : notification.type === 'warning'
                  ? 'bg-yellow-500'
                  : 'bg-blue-500'
          } text-white`}
        >
          <div className='flex justify-between items-start'>
            <p className='text-sm'>{notification.message}</p>
            <button
              onClick={() => removeNotification(notification.id)}
              className='ml-2 text-white hover:text-gray-200'
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
