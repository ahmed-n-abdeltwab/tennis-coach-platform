import api from './api';

/**
 * Notification types supported by the system
 */
export enum NotificationType {
  CUSTOM_SERVICE = 'CUSTOM_SERVICE',
  BOOKING_REMINDER = 'BOOKING_REMINDER',
  BOOKING_CONFIRMATION = 'BOOKING_CONFIRMATION',
  ROLE_CHANGE = 'ROLE_CHANGE',
  SYSTEM_ANNOUNCEMENT = 'SYSTEM_ANNOUNCEMENT',
  MESSAGE_RECEIVED = 'MESSAGE_RECEIVED',
}

/**
 * Notification priority levels
 */
export enum NotificationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

/**
 * Notification delivery channels
 */
export enum NotificationChannel {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
  WEBSOCKET = 'WEBSOCKET',
}

/**
 * Interface for notification data
 */
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  recipientId: string;
  senderId?: string;
  priority: NotificationPriority;
  channels: NotificationChannel[];
  metadata: Record<string, unknown>;
  isRead: boolean;
  readAt?: string;
  scheduledFor?: string;
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Interface for notification list response
 */
export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Interface for unread count response
 */
export interface UnreadCountResponse {
  count: number;
}

/**
 * Interface for notification query filters
 */
export interface NotificationFilters {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
  type?: NotificationType;
}

/**
 * Interface for sending announcements (admin only)
 */
export interface SendAnnouncementRequest {
  title: string;
  message: string;
  targetRoles?: string[];
  priority?: NotificationPriority;
}

/**
 * Notification service class
 */
class NotificationService {
  private readonly baseUrl = '/api/notifications';

  /**
   * Get user notifications with optional filters
   */
  async getNotifications(filters: NotificationFilters = {}): Promise<NotificationListResponse> {
    const params = new URLSearchParams();

    if (filters.limit !== undefined) {
      params.append('limit', filters.limit.toString());
    }
    if (filters.offset !== undefined) {
      params.append('offset', filters.offset.toString());
    }
    if (filters.unreadOnly !== undefined) {
      params.append('unreadOnly', filters.unreadOnly.toString());
    }
    if (filters.type !== undefined) {
      params.append('type', filters.type);
    }

    const url = params.toString() ? `${this.baseUrl}?${params.toString()}` : this.baseUrl;
    const response = await api.get<NotificationListResponse>(url);
    return response.data;
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
    const response = await api.get<UnreadCountResponse>(`${this.baseUrl}/unread-count`);
    return response.data.count;
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string): Promise<Notification> {
    const response = await api.patch<Notification>(`${this.baseUrl}/${notificationId}/read`, {
      isRead: true,
    });
    return response.data;
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<{ markedCount: number }> {
    const response = await api.patch<{ markedCount: number }>(`${this.baseUrl}/mark-all-read`);
    return response.data;
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    await api.delete(`${this.baseUrl}/${notificationId}`);
  }

  /**
   * Send system announcement (admin only)
   */
  async sendAnnouncement(announcement: SendAnnouncementRequest): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>(
      `${this.baseUrl}/announcement`,
      announcement
    );
    return response.data;
  }

  /**
   * Test custom service notification (development only)
   */
  async testCustomServiceNotification(data: {
    recipientId: string;
    serviceName: string;
    message?: string;
  }): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>(
      `${this.baseUrl}/test-custom-service`,
      data
    );
    return response.data;
  }

  /**
   * Get notification icon based on type
   */
  getNotificationIcon(type: NotificationType): string {
    switch (type) {
      case NotificationType.CUSTOM_SERVICE:
        return '🎯';
      case NotificationType.BOOKING_REMINDER:
        return '⏰';
      case NotificationType.BOOKING_CONFIRMATION:
        return '✅';
      case NotificationType.ROLE_CHANGE:
        return '👤';
      case NotificationType.SYSTEM_ANNOUNCEMENT:
        return '📢';
      case NotificationType.MESSAGE_RECEIVED:
        return '💬';
      default:
        return '🔔';
    }
  }

  /**
   * Get notification color based on priority
   */
  getNotificationColor(priority: NotificationPriority): string {
    switch (priority) {
      case NotificationPriority.LOW:
        return 'text-gray-400';
      case NotificationPriority.MEDIUM:
        return 'text-blue-400';
      case NotificationPriority.HIGH:
        return 'text-orange-400';
      case NotificationPriority.URGENT:
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  }

  /**
   * Format notification time for display
   */
  formatNotificationTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  /**
   * Check if notification is recent (within last hour)
   */
  isRecentNotification(dateString: string): boolean {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours < 1;
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;
