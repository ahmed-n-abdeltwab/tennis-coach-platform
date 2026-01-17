import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useSocket } from '../../hooks/useSocket';
import { isAppError, notificationService, type Notification } from '../../services';
import { LoadingSpinner } from '../Common';

interface NotificationBellProps {
  /** Additional CSS classes */
  className?: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  isOpen: boolean;
}

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,
  isOpen: false,
};

/**
 * NotificationBell comor displaying and managing notifications
 */
function NotificationBell({ className = '' }: NotificationBellProps) {
  const { account } = useAuth();
  const { addNotification } = useNotification();
  const _socket = useSocket();
  const [state, setState] = useState<NotificationState>(initialState);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hasLoadedRef = useRef(false);

  /**
   * Fetch notifications from the API
   */
  const fetchNotifications = useCallback(async () => {
    if (!account) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const [notificationsResponse, unreadCount] = await Promise.all([
        notificationService.getNotifications({ limit: 10, unreadOnly: false }),
        notificationService.getUnreadCount(),
      ]);

      setState(prev => ({
        ...prev,
        notifications: notificationsResponse.notifications,
        unreadCount,
        loading: false,
      }));
    } catch (error) {
      const message = isAppError(error) ? error.message : 'Failed to load notifications';
      setState(prev => ({ ...prev, error: message, loading: false }));
    }
  }, [account]);

  /**
   * Handle marking notification as read
   */
  const handleMarkAsRead = useCallback(
    async (notificationId: string) => {
      try {
        await notificationService.markAsRead(notificationId);

        setState(prev => ({
          ...prev,
          notifications: prev.notifications.map(n =>
            n.id === notificationId ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
          ),
          unreadCount: Math.max(0, prev.unreadCount - 1),
        }));
      } catch (error) {
        const message = isAppError(error) ? error.message : 'Failed to mark notification as read';
        addNotification('error', message);
      }
    },
    [addNotification]
  );

  /**
   * Handle marking all notifications as read
   */
  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();

      setState(prev => ({
        ...prev,
        notifications: prev.notifications.map(n => ({
          ...n,
          isRead: true,
          readAt: new Date().toISOString(),
        })),
        unreadCount: 0,
      }));

      addNotification('success', 'All notifications marked as read');
    } catch (error) {
      const message = isAppError(error)
        ? error.message
        : 'Failed to mark all notifications as read';
      addNotification('error', message);
    }
  }, [addNotification]);

  /**
   * Handle deleting notification
   */
  const handleDeleteNotification = useCallback(
    async (notificationId: string) => {
      try {
        await notificationService.deleteNotification(notificationId);

        setState(prev => {
          const notification = prev.notifications.find(n => n.id === notificationId);
          const wasUnread = notification && !notification.isRead;

          return {
            ...prev,
            notifications: prev.notifications.filter(n => n.id !== notificationId),
            unreadCount: wasUnread ? Math.max(0, prev.unreadCount - 1) : prev.unreadCount,
          };
        });

        addNotification('success', 'Notification deleted');
      } catch (error) {
        const message = isAppError(error) ? error.message : 'Failed to delete notification';
        addNotification('error', message);
      }
    },
    [addNotification]
  );

  /**
   * Toggle dropdown visibility
   */
  const toggleDropdown = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: !prev.isOpen }));
  }, []);

  /**
   * Close dropdown when clicking outside
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setState(prev => ({ ...prev, isOpen: false }));
      }
    };

    if (state.isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [state.isOpen]);

  /**
   * Load notifications on mount and when user changes
   */
  useEffect(() => {
    if (account && !hasLoadedRef.current) {
      hasLoadedRef.current = true;

      // Move the async logic directly into the effect
      const loadNotifications = async () => {
        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
          const [notificationsResponse, unreadCount] = await Promise.all([
            notificationService.getNotifications({ limit: 10, unreadOnly: false }),
            notificationService.getUnreadCount(),
          ]);

          setState(prev => ({
            ...prev,
            notifications: notificationsResponse.notifications,
            unreadCount,
            loading: false,
          }));
        } catch (error) {
          const errorMessage = isAppError(error) ? error.message : 'Failed to load notifications';
          setState(prev => ({ ...prev, error: errorMessage, loading: false }));
        }
      };

      void loadNotifications();
    }
  }, [account]);

  /**
   * Listen for real-time notification updates
   */
  useEffect(() => {
    if (!account) return;

    const handleNewNotification = () => {
      // Refresh notifications when new ones arrive
      fetchNotifications();
    };

    // Listen for custom service notifications
    window.addEventListener('socket:custom-service-notification', handleNewNotification);

    return () => {
      window.removeEventListener('socket:custom-service-notification', handleNewNotification);
    };
  }, [account, fetchNotifications]);

  if (!account) {
    return null;
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Notification Bell Button */}
      <button
        type='button'
        onClick={toggleDropdown}
        className='relative p-2 text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-800 rounded-lg transition-colors'
        aria-label='Notifications'
      >
        <svg
          className='h-6 w-6'
          fill='none'
          viewBox='0 0 24 24'
          stroke='currentColor'
          aria-hidden='true'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9'
          />
        </svg>

        {/* Unread Count Badge */}
        {state.unreadCount > 0 && (
          <span className='absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full'>
            {state.unreadCount > 99 ? '99+' : state.unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {state.isOpen && (
        <div className='absolute right-0 mt-2 w-80 bg-gray-800 rounded-lg shadow-lg border border-gray-700 z-50'>
          {/* Header */}
          <div className='px-4 py-3 border-b border-gray-700'>
            <div className='flex items-center justify-between'>
              <h3 className='text-lg font-semibold text-white'>Notifications</h3>
              {state.unreadCount > 0 && (
                <button
                  type='button'
                  onClick={handleMarkAllAsRead}
                  className='text-sm text-orange-400 hover:text-orange-300 focus:outline-none'
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className='max-h-96 overflow-y-auto'>
            {state.loading ? (
              <div className='flex items-center justify-center py-8'>
                <LoadingSpinner size='sm' message='Loading notifications...' />
              </div>
            ) : state.error ? (
              <div className='px-4 py-6 text-center'>
                <p className='text-red-400 text-sm'>{state.error}</p>
                <button
                  type='button'
                  onClick={fetchNotifications}
                  className='mt-2 text-sm text-orange-400 hover:text-orange-300 focus:outline-none'
                >
                  Try again
                </button>
              </div>
            ) : state.notifications.length === 0 ? (
              <div className='px-4 py-6 text-center'>
                <svg
                  className='h-12 w-12 mx-auto text-gray-600 mb-2'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                  aria-hidden='true'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={1}
                    d='M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9'
                  />
                </svg>
                <p className='text-gray-400 text-sm'>No notifications yet</p>
              </div>
            ) : (
              <div className='divide-y divide-gray-700'>
                {state.notifications.map(notification => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={handleMarkAsRead}
                    onDelete={handleDeleteNotification}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {state.notifications.length > 0 && (
            <div className='px-4 py-3 border-t border-gray-700'>
              <button
                type='button'
                className='w-full text-center text-sm text-orange-400 hover:text-orange-300 focus:outline-none'
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Individual notification item component
 */
interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

function NotificationItem({ notification, onMarkAsRead, onDelete }: NotificationItemProps) {
  const handleClick = () => {
    if (!notification.isRead) {
      onMarkAsRead(notification.id);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(notification.id);
  };

  return (
    <div
      className={`px-4 py-3 hover:bg-gray-700/50 cursor-pointer transition-colors ${
        !notification.isRead ? 'bg-gray-700/30' : ''
      }`}
      onClick={handleClick}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      role='button'
      tabIndex={0}
    >
      <div className='flex items-start gap-3'>
        {/* Icon */}
        <div className='shrink-0 mt-1'>
          <span className='text-lg'>
            {notificationService.getNotificationIcon(notification.type)}
          </span>
        </div>

        {/* Content */}
        <div className='flex-1 min-w-0'>
          <div className='flex items-start justify-between gap-2'>
            <div className='flex-1'>
              <p
                className={`text-sm font-medium ${!notification.isRead ? 'text-white' : 'text-gray-300'}`}
              >
                {notification.title}
              </p>
              <p className='text-sm text-gray-400 mt-1 line-clamp-2'>{notification.message}</p>
              <p className='text-xs text-gray-500 mt-1'>
                {notificationService.formatNotificationTime(notification.createdAt)}
              </p>
            </div>

            {/* Actions */}
            <div className='flex items-center gap-1'>
              {!notification.isRead && <div className='w-2 h-2 bg-orange-500 rounded-full'></div>}
              <button
                type='button'
                onClick={handleDelete}
                className='p-1 text-gray-500 hover:text-red-400 focus:outline-none'
                aria-label='Delete notification'
              >
                <svg className='h-4 w-4' fill='currentColor' viewBox='0 0 20 20' aria-hidden='true'>
                  <path
                    fillRule='evenodd'
                    d='M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z'
                    clipRule='evenodd'
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NotificationBell;
