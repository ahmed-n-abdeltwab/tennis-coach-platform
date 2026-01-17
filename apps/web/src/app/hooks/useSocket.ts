import { useCallback, useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';

import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { socketService, type SocketEvents } from '../services/socket.service';
import type { Message } from '../services/types';

/**
 * Online status tracking interface
 */
export interface UserOnlineStatus {
  userId: string;
  isOnline: boolean;
  lastSeen?: string;
}

/**
 * Typing indicator interface
 */
export interface TypingIndicator {
  userId: string;
  conversationId: string;
  userName?: string;
}

/**
 * Socket hook state interface
 */
export interface SocketState {
  /** Whether socket is connected */
  isConnected: boolean;
  /** Online status of users */
  onlineUsers: Map<string, UserOnlineStatus>;
  /** Currently typing users */
  typingUsers: Map<string, TypingIndicator>;
  /** Connection erny */
  connectionError: string | null;
}

/**
 * Socket hook return interface
 */
export interface UseSocketReturn extends SocketState {
  /** Send a message through WebSocket */
  sendMessage: (messageData: {
    content: string;
    receiverId: string;
    sessionId?: string;
    messageType?: string;
    customServiceId?: string;
  }) => void;
  /** Join a session room */
  joinSession: (sessionId: string) => void;
  /** Leave a session room */
  leaveSession: (sessionId: string) => void;
  /** Join user room for direct messaging */
  joinUserRoom: (userId: string) => void;
  /** Leave user room */
  leaveUserRoom: (userId: string) => void;
  /** Start typing indicator */
  startTyping: (conversationId: string) => void;
  /** Stop typing indicator */
  stopTyping: (conversationId: string) => void;
  /** Check if a user is online */
  isUserOnline: (userId: string) => boolean;
  /** Check if a user is typing in a conversation */
  isUserTyping: (userId: string, conversationId: string) => boolean;
  /** Add socket event listener */
  addEventListener: <K extends keyof SocketEvents>(
    event: K,
    callback: (data: SocketEvents[K]) => void
  ) => void;
  /** Remove socket event listener */
  removeEventListener: <K extends keyof SocketEvents>(
    event: K,
    callback?: (data: SocketEvents[K]) => void
  ) => void;
}

/**
 * Initial socket state
 */
const initialState: SocketState = {
  isConnected: false,
  onlineUsers: new Map(),
  typingUsers: new Map(),
  connectionError: null,
};

/**
 * Custom hook for managing WebSocket connections and real-time features
 */
export function useSocket(): UseSocketReturn {
  const { account, accessToken } = useAuth();
  const { addNotification } = useNotification();
  const [state, setState] = useState<SocketState>(initialState);
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  /**
   * Initialize socket connection when user is authenticated
   */
  useEffect(() => {
    if (account && accessToken) {
      try {
        const socket = socketService.connect(accessToken);
        socketRef.current = socket;

        // Set up connection status listeners
        const handleConnect = () => {
          setState(prev => ({ ...prev, isConnected: true, connectionError: null }));

          // Join user room for direct messaging
          if (account.id) {
            socketService.joinUserRoom(account.id);
            socketService.setUserOnline(account.id);
          }
        };

        const handleDisconnect = () => {
          setState(prev => ({ ...prev, isConnected: false }));
        };

        const handleConnectError = (error: Error) => {
          setState(prev => ({
            ...prev,
            isConnected: false,
            connectionError: error.message,
          }));
        };

        // Set up real-time event listeners
        const handleNewMessage = (message: Message) => {
          // Emit custom event for message components to listen to
          window.dispatchEvent(new CustomEvent('socket:new-message', { detail: message }));
        };

        const handleMessageRead = (data: { messageId: string; readAt: string }) => {
          window.dispatchEvent(new CustomEvent('socket:message-read', { detail: data }));
        };

        const handleConversationUpdated = (data: {
          conversationId: string;
          lastMessageAt: string;
        }) => {
          window.dispatchEvent(new CustomEvent('socket:conversation-updated', { detail: data }));
        };

        const handleUserStatusChanged = (data: {
          userId: string;
          isOnline: boolean;
          lastSeen?: string;
        }) => {
          setState(prev => ({
            ...prev,
            onlineUsers: new Map(prev.onlineUsers).set(data.userId, {
              userId: data.userId,
              isOnline: data.isOnline,
              lastSeen: data.lastSeen,
            }),
          }));
        };

        const handleCustomServiceNotification = (data: {
          serviceId: string;
          serviceName: string;
          fromUserId: string;
          fromUserName: string;
          message?: string;
        }) => {
          addNotification(
            'info',
            `${data.fromUserName} sent you a custom service: ${data.serviceName}`
          );
          window.dispatchEvent(
            new CustomEvent('socket:custom-service-notification', { detail: data })
          );
        };

        const handleTypingStart = (data: { userId: string; conversationId: string }) => {
          setState(prev => ({
            ...prev,
            typingUsers: new Map(prev.typingUsers).set(`${data.userId}-${data.conversationId}`, {
              userId: data.userId,
              conversationId: data.conversationId,
            }),
          }));

          // Auto-clear typing indicator after 3 seconds
          const timeoutKey = `${data.userId}-${data.conversationId}`;
          const existingTimeout = typingTimeoutRef.current.get(timeoutKey);
          if (existingTimeout) {
            clearTimeout(existingTimeout);
          }

          const timeout = setTimeout(() => {
            setState(prev => {
              const newTypingUsers = new Map(prev.typingUsers);
              newTypingUsers.delete(timeoutKey);
              return { ...prev, typingUsers: newTypingUsers };
            });
            typingTimeoutRef.current.delete(timeoutKey);
          }, 3000);

          typingTimeoutRef.current.set(timeoutKey, timeout);
        };

        const handleTypingStop = (data: { userId: string; conversationId: string }) => {
          const timeoutKey = `${data.userId}-${data.conversationId}`;

          setState(prev => {
            const newTypingUsers = new Map(prev.typingUsers);
            newTypingUsers.delete(timeoutKey);
            return { ...prev, typingUsers: newTypingUsers };
          });

          // Clear timeout if exists
          const existingTimeout = typingTimeoutRef.current.get(timeoutKey);
          if (existingTimeout) {
            clearTimeout(existingTimeout);
            typingTimeoutRef.current.delete(timeoutKey);
          }
        };

        // Add event listeners
        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('connect_error', handleConnectError);
        socket.on('new-message', handleNewMessage);
        socket.on('message-read', handleMessageRead);
        socket.on('conversation-updated', handleConversationUpdated);
        socket.on('user-status-changed', handleUserStatusChanged);
        socket.on('custom-service-notification', handleCustomServiceNotification);
        socket.on('typing-start', handleTypingStart);
        socket.on('typing-stop', handleTypingStop);

        // Cleanup function
        return () => {
          socket.off('connect', handleConnect);
          socket.off('disconnect', handleDisconnect);
          socket.off('connect_error', handleConnectError);
          socket.off('new-message', handleNewMessage);
          socket.off('message-read', handleMessageRead);
          socket.off('conversation-updated', handleConversationUpdated);
          socket.off('user-status-changed', handleUserStatusChanged);
          socket.off('custom-service-notification', handleCustomServiceNotification);
          socket.off('typing-start', handleTypingStart);
          socket.off('typing-stop', handleTypingStop);

          // Clear all typing timeouts
          typingTimeoutRef.current.forEach(timeout => clearTimeout(timeout));
          typingTimeoutRef.current.clear();

          if (account?.id) {
            socketService.setUserOffline(account.id);
            socketService.leaveUserRoom(account.id);
          }
        };
      } catch (error) {
        console.error('Failed to initialize socket connection:', error);
        setState(prev => ({
          ...prev,
          connectionError: error instanceof Error ? error.message : 'Connection failed',
        }));
      }
    } else {
      // Disconnect when user logs out
      socketService.disconnect();
      socketRef.current = null;
      setState(initialState);
    }
  }, [account, accessToken, addNotification]);

  /**
   * Send message through WebSocket
   */
  const sendMessage = useCallback(
    (messageData: {
      content: string;
      receiverId: string;
      sessionId?: string;
      messageType?: string;
      customServiceId?: string;
    }) => {
      socketService.sendMessage(messageData);
    },
    []
  );

  /**
   * Join session room
   */
  const joinSession = useCallback(
    (sessionId: string) => {
      if (account) {
        socketService.joinSession(sessionId, account.id, account.role);
      }
    },
    [account]
  );

  /**
   * Leave session room
   */
  const leaveSession = useCallback((sessionId: string) => {
    socketService.leaveSession(sessionId);
  }, []);

  /**
   * Join user room
   */
  const joinUserRoom = useCallback((userId: string) => {
    socketService.joinUserRoom(userId);
  }, []);

  /**
   * Leave user room
   */
  const leaveUserRoom = useCallback((userId: string) => {
    socketService.leaveUserRoom(userId);
  }, []);

  /**
   * Start typing indicator
   */
  const startTyping = useCallback(
    (conversationId: string) => {
      if (account) {
        socketService.startTyping(conversationId, account.id);
      }
    },
    [account]
  );

  /**
   * Stop typing indicator
   */
  const stopTyping = useCallback(
    (conversationId: string) => {
      if (account) {
        socketService.stopTyping(conversationId, account.id);
      }
    },
    [account]
  );

  /**
   * Check if user is online
   */
  const isUserOnline = useCallback(
    (userId: string): boolean => {
      const userStatus = state.onlineUsers.get(userId);
      return userStatus?.isOnline ?? false;
    },
    [state.onlineUsers]
  );

  /**
   * Check if user is typing in conversation
   */
  const isUserTyping = useCallback(
    (userId: string, conversationId: string): boolean => {
      return state.typingUsers.has(`${userId}-${conversationId}`);
    },
    [state.typingUsers]
  );

  /**
   * Add event listener
   */
  const addEventListener = useCallback(
    <K extends keyof SocketEvents>(event: K, callback: (data: SocketEvents[K]) => void) => {
      socketService.on(event, callback);
    },
    []
  );

  /**
   * Remove event listener
   */
  const removeEventListener = useCallback(
    <K extends keyof SocketEvents>(event: K, callback?: (data: SocketEvents[K]) => void) => {
      socketService.off(event, callback);
    },
    []
  );

  return {
    ...state,
    sendMessage,
    joinSession,
    leaveSession,
    joinUserRoom,
    leaveUserRoom,
    startTyping,
    stopTyping,
    isUserOnline,
    isUserTyping,
    addEventListener,
    removeEventListener,
  };
}

export default useSocket;
