import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useSocket } from '../../hooks';
import {
  conversationService,
  customServiceService,
  isAppError,
  messageService,
  type ConversationSummary,
  type CustomService,
} from '../../services';
import type { Account, Message } from '../../services/types';
import { ErrorMessage, LoadingSpinner } from '../Common';
import { CustomServiceSelector } from '../CustomServices';

import {
  BookingRequestForm,
  ConversationList,
  MessageInput,
  MessageList,
  PinnedConversations,
} from './';

interface ChatInterfaceProps {
  /** Optional session ID for session-specific messages */
  sessionId?: string;
  /** Optional receiver ID to pre-select conversation */
  receiverId?: string;
  /** Available contacts based on user role */
  availableContacts?: Account[];
  /** Whether contacts are loading */
  loadingContacts?: boolean;
}

interface ChatState {
  /** All messages for the current user */
  messages: Message[];
  /** All conversations with enhanced data */
  conversations: ConversationSummary[];
  /** Currently selected conversation partner ID */
  selectedPartnerId: string | null;
  /** Whether messages are being loaded */
  loading: boolean;
  /** Whether conversations are being loaded */
  loadingConversations: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Whether a message is being sent */
  sending: boolean;
  /** Custom services data for rendering service messages */
  customServices: Map<string, CustomService>;
  /** Whether custom services are loading */
  loadingCustomServices: boolean;
  /** Set of conversation IDs being pinned/unpinned */
  processingPinIds: Set<string>;
  /** Whether the booking request form is shown */
  showBookingRequestForm: boolean;
  /** Whether the custom service selector is shown */
  showCustomServiceSelector: boolean;
}

const initialState: ChatState = {
  messages: [],
  conversations: [],
  selectedPartnerId: null,
  loading: true,
  loadingConversations: true,
  error: null,
  sending: false,
  customServices: new Map(),
  loadingCustomServices: false,
  processingPinIds: new Set(),
  showBookingRequestForm: false,
  showCustomServiceSelector: false,
};

/**
 * ChatInterface component provides a comprehensive chat experience.
 *
 * Features:
 * - Enhanced conversation management with pinning
 * - Custom service message rendering and interaction
 * - Real-time conversation updates
 * - Role-based functionality (pinning for coaches)
 * - Integration with custom services
 *
 *
 * @example
 * <ChatInterface
 *   sessionId={sessionId}
 *   receiverId={receiverId}
 *   availableContacts={contacts}
 *   loadingContacts={loadingContacts}
 * />
 */
function ChatInterface({
  sessionId,
  receiverId,
  availableContacts,
  loadingContacts: _loadingContacts = false,
}: ChatInterfaceProps) {
  const { account } = useAuth();
  const { addNotification } = useNotification();
  const socket = useSocket();
  const [state, setState] = useState<ChatState>(() => ({
    ...initialState,
    selectedPartnerId: receiverId ?? null,
  }));

  // Check if user can pin conversations (coaches and admins)
  const canPinConversations = account?.role === 'COACH' || account?.role === 'ADMIN';

  /**
   * Fetches messages from the API.
   */
  const fetchMessages = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      let messages: Message[];

      if (sessionId) {
        messages = await messageService.getSessionMessages(sessionId);
      } else {
        messages = await messageService.getMessages();
      }

      setState(prev => ({ ...prev, messages, loading: false }));
    } catch (error) {
      const message = isAppError(error) ? error.message : 'Failed to load messages';
      setState(prev => ({ ...prev, error: message, loading: false }));
    }
  }, [sessionId]);

  /**
   * Fetches conversations from the API.
   */
  const fetchConversations = useCallback(async () => {
    if (!canPinConversations) {
      setState(prev => ({ ...prev, loadingConversations: false }));
      return;
    }

    setState(prev => ({ ...prev, loadingConversations: true }));

    try {
      const conversations = await conversationService.getConversations();
      setState(prev => ({ ...prev, conversations, loadingConversations: false }));
    } catch (error) {
      console.error('Failed to load conversations:', error);
      setState(prev => ({ ...prev, loadingConversations: false }));
    }
  }, [canPinConversations]);

  /**
   * Fetches custom services for rendering service messages.
   */
  const fetchCustomServices = useCallback(async () => {
    setState(prev => ({ ...prev, loadingCustomServices: true }));

    try {
      const services = await customServiceService.getCustomServices();
      const servicesMap = new Map(services.map(service => [service.id, service]));
      setState(prev => ({ ...prev, customServices: servicesMap, loadingCustomServices: false }));
    } catch (error) {
      console.error('Failed to load custom services:', error);
      setState(prev => ({ ...prev, loadingCustomServices: false }));
    }
  }, []);

  /**
   * Handles conversation selection.
   */
  const handleSelectConversation = useCallback((partnerId: string) => {
    setState(prev => ({ ...prev, selectedPartnerId: partnerId }));
  }, []);

  /**
   * Marks unread messages as read for the current conversation.
   */
  const markConversationMessagesAsRead = useCallback(async () => {
    if (!account || !state.selectedPartnerId) {
      return;
    }

    // Get unread messages in the current conversation
    const unreadMessages = state.messages.filter(
      msg =>
        msg.receiverId === account.id && msg.senderId === state.selectedPartnerId && !msg.isRead
    );

    // If no unread messages, skip
    if (unreadMessages.length === 0) {
      return;
    }

    // Mark each unread message as read
    for (const message of unreadMessages) {
      try {
        const updatedMessage = await messageService.markAsRead(message.id);

        // Update the message in state
        setState(prev => ({
          ...prev,
          messages: prev.messages.map(m => (m.id === message.id ? updatedMessage : m)),
        }));
      } catch (error) {
        console.error(`Failed to mark message ${message.id} as read:`, error);
        // Continue marking other messages even if one fails
      }
    }
  }, [account, state.selectedPartnerId, state.messages]);

  /**
   * Handles pinning a conversation.
   */
  const handlePinConversation = useCallback(
    async (conversationId: string) => {
      setState(prev => ({
        ...prev,
        processingPinIds: new Set([...prev.processingPinIds, conversationId]),
      }));

      try {
        const updatedConversation = await conversationService.pinConversation(conversationId);

        setState(prev => ({
          ...prev,
          conversations: prev.conversations.map(conv =>
            conv.id === conversationId ? updatedConversation : conv
          ),
          processingPinIds: new Set([...prev.processingPinIds].filter(id => id !== conversationId)),
        }));

        addNotification('success', 'Conversation pinned');
      } catch (error) {
        const message = isAppError(error) ? error.message : 'Failed to pin conversation';
        addNotification('error', message);

        setState(prev => ({
          ...prev,
          processingPinIds: new Set([...prev.processingPinIds].filter(id => id !== conversationId)),
        }));
      }
    },
    [addNotification]
  );

  /**
   * Handles unpinning a conversation.
   */
  const handleUnpinConversation = useCallback(
    async (conversationId: string) => {
      setState(prev => ({
        ...prev,
        processingPinIds: new Set([...prev.processingPinIds, conversationId]),
      }));

      try {
        const updatedConversation = await conversationService.unpinConversation(conversationId);

        setState(prev => ({
          ...prev,
          conversations: prev.conversations.map(conv =>
            conv.id === conversationId ? updatedConversation : conv
          ),
          processingPinIds: new Set([...prev.processingPinIds].filter(id => id !== conversationId)),
        }));

        addNotification('success', 'Conversation unpinned');
      } catch (error) {
        const message = isAppError(error) ? error.message : 'Failed to unpin conversation';
        addNotification('error', message);

        setState(prev => ({
          ...prev,
          processingPinIds: new Set([...prev.processingPinIds].filter(id => id !== conversationId)),
        }));
      }
    },
    [addNotification]
  );

  /**
   * Handles sending a new message.
   */
  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!account) {
        addNotification('error', 'You must be logged in to send messages');
        return;
      }

      const receiverId = state.selectedPartnerId;
      if (!receiverId) {
        addNotification('error', 'Please select a conversation first');
        return;
      }

      setState(prev => ({ ...prev, sending: true }));

      try {
        // Send through WebSocket for real-time delivery
        if (socket.isConnected) {
          socket.sendMessage({
            content,
            receiverId,
            sessionId: sessionId ?? undefined,
          });
        } else {
          // Fallback to HTTP API if socket not connected
          const newMessage = await messageService.sendMessage({
            content,
            receiverId,
            sessionId: sessionId ?? undefined,
          });

          // Add the new message to the list
          setState(prev => ({
            ...prev,
            messages: [...prev.messages, newMessage],
          }));
        }

        setState(prev => ({ ...prev, sending: false }));
        addNotification('success', 'Message sent');
      } catch (error) {
        const message = isAppError(error) ? error.message : 'Failed to send message';
        addNotification('error', message);
        setState(prev => ({ ...prev, sending: false }));
      }
    },
    [account, state.selectedPartnerId, sessionId, addNotification, socket]
  );

  /**
   * Handles sending a booking request.
   */
  const handleSendBookingRequest = useCallback(
    async (bookingTypeId: string, message: string) => {
      if (!account) {
        addNotification('error', 'You must be logged in to send booking requests');
        return;
      }

      const receiverId = state.selectedPartnerId;
      if (!receiverId) {
        addNotification('error', 'Please select a conversation first');
        return;
      }

      try {
        // Send booking request through message service
        const bookingRequestMessage = await messageService.sendBookingRequest(
          receiverId,
          bookingTypeId,
          message
        );

        // Add the new message to the list
        setState(prev => ({
          ...prev,
          messages: [...prev.messages, bookingRequestMessage],
          showBookingRequestForm: false,
        }));

        addNotification('success', 'Booking request sent');
      } catch (error) {
        const errorMessage = isAppError(error) ? error.message : 'Failed to send booking request';
        addNotification('error', errorMessage);
      }
    },
    [account, state.selectedPartnerId, addNotification]
  );

  /**
   * Shows the booking request form.
   */
  const handleShowBookingRequestForm = useCallback(() => {
    setState(prev => ({ ...prev, showBookingRequestForm: true }));
  }, []);

  /**
   * Hides the booking request form.
   */
  const handleHideBookingRequestForm = useCallback(() => {
    setState(prev => ({ ...prev, showBookingRequestForm: false }));
  }, []);

  /**
   * Shows the custom service selector.
   */
  const handleShowCustomServiceSelector = useCallback(() => {
    setState(prev => ({ ...prev, showCustomServiceSelector: true }));
  }, []);

  /**
   * Hides the custom service selector.
   */
  const handleHideCustomServiceSelector = useCallback(() => {
    setState(prev => ({ ...prev, showCustomServiceSelector: false }));
  }, []);

  const handleSendCustomService = useCallback(
    async (serviceId: string, receiverId: string, message?: string) => {
      if (!account) {
        addNotification('error', 'You must be logged in to send services');
        return;
      }

      try {
        await customServiceService.sendToUser(serviceId, {
          userId: receiverId,
          message: message ?? "I've shared a custom service with you!",
        });

        addNotification('success', 'Custom service sent');

        // Refresh messages to show the new service message
        await fetchMessages();
      } catch (error) {
        const message = isAppError(error) ? error.message : 'Failed to send custom service';
        addNotification('error', message);
      }
    },
    [account, addNotification, fetchMessages]
  );

  // Load data on mount and when dependencies change
  useEffect(() => {
    if (!account) return;

    // Wrap async calls in IIFE to avoid ESLint warning
    const loadData = async () => {
      await Promise.all([fetchMessages(), fetchConversations(), fetchCustomServices()]);
    };

    void loadData();
  }, [account, fetchMessages, fetchConversations, fetchCustomServices]);

  // Mark messages as read when conversation is selected or messages change
  useEffect(() => {
    if (!account || !state.selectedPartnerId) return;

    // Wrap async call in IIFE to avoid ESLint warning
    const markAsRead = async () => {
      await markConversationMessagesAsRead();
    };

    void markAsRead();
  }, [account, state.selectedPartnerId, state.messages, markConversationMessagesAsRead]);

  // Set up real-time event listeners
  useEffect(() => {
    if (!account) return;

    // Handle new messages
    const handleNewMessage = (event: CustomEvent<Message>) => {
      const message = event.detail;

      // Only add message if it's relevant to current user
      if (message.senderId === account.id || message.receiverId === account.id) {
        setState(prev => {
          // Check if message already exists to avoid duplicates
          const messageExists = prev.messages.some(m => m.id === message.id);
          if (messageExists) return prev;

          return {
            ...prev,
            messages: [...prev.messages, message],
          };
        });
      }
    };

    // Handle message read events
    const handleMessageRead = (event: CustomEvent<{ messageId: string; readAt: string }>) => {
      const { messageId, readAt } = event.detail;

      setState(prev => ({
        ...prev,
        messages: prev.messages.map(msg =>
          msg.id === messageId ? { ...msg, isRead: true, readAt } : msg
        ),
      }));
    };

    // Handle conversation updates
    const handleConversationUpdated = (
      event: CustomEvent<{ conversationId: string; lastMessageAt: string }>
    ) => {
      const { conversationId, lastMessageAt } = event.detail;

      setState(prev => ({
        ...prev,
        conversations: prev.conversations.map(conv =>
          conv.id === conversationId ? { ...conv, lastMessageAt } : conv
        ),
      }));
    };

    // Handle custom service notifications
    const handleCustomServiceNotification = (
      event: CustomEvent<{
        serviceId: string;
        serviceName: string;
        fromUserId: string;
        fromUserName: string;
        message?: string;
      }>
    ) => {
      const { serviceName, fromUserName } = event.detail;
      addNotification('info', `${fromUserName} sent you a custom service: ${serviceName}`);

      // Refresh messages to show the new service message
      fetchMessages();
    };

    // Add event listeners
    window.addEventListener('socket:new-message', handleNewMessage as EventListener);
    window.addEventListener('socket:message-read', handleMessageRead as EventListener);
    window.addEventListener(
      'socket:conversation-updated',
      handleConversationUpdated as EventListener
    );
    window.addEventListener(
      'socket:custom-service-notification',
      handleCustomServiceNotification as EventListener
    );

    // Join session room if sessionId provided
    if (sessionId) {
      socket.joinSession(sessionId);
    }

    // Cleanup
    return () => {
      window.removeEventListener('socket:new-message', handleNewMessage as EventListener);
      window.removeEventListener('socket:message-read', handleMessageRead as EventListener);
      window.removeEventListener(
        'socket:conversation-updated',
        handleConversationUpdated as EventListener
      );
      window.removeEventListener(
        'socket:custom-service-notification',
        handleCustomServiceNotification as EventListener
      );

      if (sessionId) {
        socket.leaveSession(sessionId);
      }
    };
  }, [account, sessionId, socket, addNotification, fetchMessages]);

  // Get messages for the selected conversation
  const getConversationMessages = useCallback((): Message[] => {
    if (!account || !state.selectedPartnerId) {
      return [];
    }

    return state.messages.filter(
      msg =>
        (msg.senderId === account.id && msg.receiverId === state.selectedPartnerId) ||
        (msg.senderId === state.selectedPartnerId && msg.receiverId === account.id)
    );
  }, [account, state.messages, state.selectedPartnerId]);

  // Get the selected partner's name
  const getSelectedPartnerName = useCallback((): string => {
    if (!account || !state.selectedPartnerId) {
      return '';
    }

    // First check if there are messages with this partner
    const conversationMessages = getConversationMessages();
    const firstMessage = conversationMessages[0];
    if (firstMessage) {
      if (firstMessage.senderId === state.selectedPartnerId) {
        return firstMessage.sender?.name ?? 'Unknown User';
      }
      return firstMessage.receiver?.name ?? 'Unknown User';
    }

    // If no messages, check available contacts
    const contact = availableContacts?.find(c => c.id === state.selectedPartnerId);
    if (contact) {
      return contact.name;
    }

    return 'Unknown User';
  }, [account, state.selectedPartnerId, availableContacts, getConversationMessages]);

  // Loading state
  if (state.loading) {
    return (
      <div className='flex items-center justify-center h-96'>
        <LoadingSpinner size='lg' message='Loading messages...' />
      </div>
    );
  }

  // Error state
  if (state.error) {
    return (
      <ErrorMessage
        variant='card'
        title='Failed to Load Messages'
        message={state.error}
        onRetry={fetchMessages}
        retryText='Try Again'
      />
    );
  }

  // Not authenticated
  if (!account) {
    return (
      <ErrorMessage
        variant='card'
        title='Authentication Required'
        message='Please log in to view your messages.'
      />
    );
  }

  const conversationMessages = getConversationMessages();
  const selectedPartnerName = getSelectedPartnerName();
  const pinnedConversations = state.conversations.filter(conv => conv.isPinned);

  return (
    <div className='bg-gray-800 rounded-lg overflow-hidden h-[calc(100vh-200px)] min-h-[500px] flex'>
      {/* Conversation List (Left Panel) */}
      <div className='w-80 border-r border-gray-700 flex flex-col'>
        <div className='p-4 border-b border-gray-700'>
          <h2 className='font-semibold text-white'>Conversations</h2>
          {sessionId && <p className='text-xs text-gray-400 mt-1'>Session messages</p>}
        </div>

        <div className='flex-1 overflow-y-auto'>
          {/* Pinned Conversations (only for coaches/admins) */}
          {canPinConversations && (
            <PinnedConversations
              conversations={pinnedConversations}
              currentUser={account}
              selectedConversationId={state.selectedPartnerId}
              onSelectConversation={handleSelectConversation}
              onUnpinConversation={handleUnpinConversation}
              unpinningIds={state.processingPinIds}
              availableContacts={availableContacts}
            />
          )}

          {/* Regular Conversations */}
          <ConversationList
            messages={state.messages}
            currentUser={account}
            selectedPartnerId={state.selectedPartnerId}
            onSelectConversation={handleSelectConversation}
            availableContacts={availableContacts}
            conversationSummaries={state.conversations}
            onPinConversation={canPinConversations ? handlePinConversation : undefined}
            onUnpinConversation={canPinConversations ? handleUnpinConversation : undefined}
            processingPinIds={state.processingPinIds}
          />
        </div>
      </div>

      {/* Message Area (Right Panel) */}
      <div className='flex-1 flex flex-col'>
        {state.selectedPartnerId ? (
          <>
            {/* Conversation Header */}
            <div className='p-4 border-b border-gray-700 flex items-center gap-3'>
              <div className='w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center'>
                <span className='text-orange-400 font-semibold'>
                  {selectedPartnerName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className='flex-1'>
                <h3 className='font-semibold text-white'>{selectedPartnerName}</h3>
                <p className='text-sm text-gray-400'>
                  {conversationMessages.length} message
                  {conversationMessages.length !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Action Buttons */}
              <div className='flex items-center gap-2'>
                {/* Booking Request Button (for users) */}
                {account.role === 'USER' && (
                  <button
                    type='button'
                    className='px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500'
                    onClick={handleShowBookingRequestForm}
                  >
                    Request Booking
                  </button>
                )}

                {/* Custom Service Send Button (for coaches) */}
                {(account.role === 'COACH' || account.role === 'ADMIN') && (
                  <button
                    type='button'
                    className='px-3 py-1.5 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500'
                    onClick={handleShowCustomServiceSelector}
                  >
                    Send Service
                  </button>
                )}
              </div>
            </div>

            {/* Message List */}
            <MessageList
              messages={conversationMessages}
              currentUser={account}
              isLoading={false}
              customServices={state.customServices}
              partnerId={state.selectedPartnerId || undefined}
              isPartnerTyping={
                state.selectedPartnerId
                  ? socket.isUserTyping(state.selectedPartnerId, state.selectedPartnerId)
                  : false
              }
              partnerName={selectedPartnerName}
            />

            {/* Message Input */}
            <MessageInput
              onSendMessage={handleSendMessage}
              isSending={state.sending}
              placeholder={`Message ${selectedPartnerName}...`}
              conversationId={state.selectedPartnerId || undefined}
            />
          </>
        ) : (
          /* No Conversation Selected */
          <div className='flex-1 flex items-center justify-center'>
            <div className='text-center text-gray-400'>
              <svg
                className='h-16 w-16 mx-auto mb-4 text-gray-600'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
                aria-hidden='true'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={1.5}
                  d='M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z'
                />
              </svg>
              <h3 className='text-lg font-medium text-white mb-2'>Select a conversation</h3>
              <p className='text-sm'>Choose a conversation from the list to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* Booking Request Form Modal */}
      {state.showBookingRequestForm && state.selectedPartnerId && (
        <BookingRequestForm
          coachId={state.selectedPartnerId}
          onBookingRequestSent={handleSendBookingRequest}
          onClose={handleHideBookingRequestForm}
        />
      )}

      {/* Custom Service Selector Modal */}
      {state.showCustomServiceSelector && state.selectedPartnerId && (
        <CustomServiceSelector
          receiverId={state.selectedPartnerId}
          onServiceSent={handleSendCustomService}
          onClose={handleHideCustomServiceSelector}
        />
      )}
    </div>
  );
}

export default ChatInterface;
