import { io, Socket } from 'socket.io-client';

import type { Message } from './types';

/**
 * Socket event types for type safety
 */
export interface SocketEvents {
  // Client to server events
  'join-session': { sessionId: string; userId: string; role: string };
  'send-message': {
    content: string;
    receiverId: string;
    sessionId?: string;
    messageType?: string;
    customServiceId?: string;
  };
  'leave-session': { sessionId: string };
  'join-user-room': { userId: string };
  'leave-user-room': { userId: string };
  'user-online': { userId: string };
  'user-offline': { userId: string };

  // Server to client events
  'new-message': Message;
  'message-read': { messageId: string; readAt: string };
  'conversation-updated': { conversationId: string; lastMessageAt: string };
  'user-status-changed': { userId: string; isOnline: boolean; lastSeen?: string };
  'custom-service-notification': {
    serviceId: string;
    serviceName: string;
    fromUserId: string;
    fromUserName: string;
    message?: string;
  };
  'typing-start': { userId: string; conversationId: string };
  'typing-stop': { userId: string; conversationId: string };
}

/**
 * Socket service class for managing WebSocket connections
 */
class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  /**
   * Initialize socket connection
   */
  connect(token: string): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    this.socket = io(serverUrl, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
    });

    this.setupEventListeners();
    return this.socket;
  }

  /**
   * Disconnect socket
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.reconnectAttempts = 0;
    }
  }

  /**
   * Get current socket instance
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Check if socket is connected
   */
  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  /**
   * Join a session room for session-specific messaging
   */
  joinSession(sessionId: string, userId: string, role: string): void {
    if (this.socket?.connected) {
      this.socket.emit('join-session', { sessionId, userId, role });
    }
  }

  /**
   * Leave a session room
   */
  leaveSession(sessionId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('leave-session', { sessionId });
    }
  }

  /**
   * Join user room for direct messaging
   */
  joinUserRoom(userId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('join-user-room', { userId });
    }
  }

  /**
   * Leave user room
   */
  leaveUserRoom(userId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('leave-user-room', { userId });
    }
  }

  /**
   * Send a message through WebSocket
   */
  sendMessage(messageData: {
    content: string;
    receiverId: string;
    sessionId?: string;
    messageType?: string;
    customServiceId?: string;
  }): void {
    if (this.socket?.connected) {
      this.socket.emit('send-message', messageData);
    }
  }

  /**
   * Emit user online status
   */
  setUserOnline(userId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('user-online', { userId });
    }
  }

  /**
   * Emit user offline status
   */
  setUserOffline(userId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('user-offline', { userId });
    }
  }

  /**
   * Emit typing start event
   */
  startTyping(conversationId: string, userId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('typing-start', { userId, conversationId });
    }
  }

  /**
   * Emit typing stop event
   */
  stopTyping(conversationId: string, userId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('typing-stop', { userId, conversationId });
    }
  }

  /**
   * Add event listener
   */
  on<K extends keyof SocketEvents>(event: K, callback: (data: SocketEvents[K]) => void): void {
    if (this.socket) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.socket.on(event as string, callback as any);
    }
  }

  /**
   * Remove event listener
   */
  off<K extends keyof SocketEvents>(event: K, callback?: (data: SocketEvents[K]) => void): void {
    if (this.socket) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.socket.off(event as string, callback as any);
    }
  }

  /**
   * Setup socket event listeners for connection management
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', reason => {
      console.log('Socket disconnected:', reason);
      this.isConnected = false;

      // Auto-reconnect for certain disconnect reasons
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, don't reconnect
        return;
      }

      this.handleReconnect();
    });

    this.socket.on('connect_error', error => {
      console.error('Socket connection error:', error);
      this.isConnected = false;
      this.handleReconnect();
    });

    this.socket.on('reconnect', attemptNumber => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.socket.on('reconnect_error', error => {
      console.error('Socket reconnection error:', error);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('Socket reconnection failed after maximum attempts');
      this.isConnected = false;
    });
  }

  /**
   * Handle reconnection logic
   */
  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Maximum reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      if (this.socket && !this.socket.connected) {
        this.socket.connect();
      }
    }, delay);
  }
}

// Export singleton instance
export const socketService = new SocketService();
export default socketService;
