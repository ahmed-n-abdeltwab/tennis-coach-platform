import { useEffect, useRef } from 'react';

import type { AuthAccount, CustomService, Message } from '../../services/types';

import BookingRequestMessage from './BookingRequestMessage';
import CustomServiceMessage from './CustomServiceMessage';

interface MessageListProps {
  /** Array of messages to display */
  messages: Message[];
  /** The current authenticated user */
  currentUser: AuthAccount;
  /** Whether messages are currently loading */
  isLoading?: boolean;
  /** Custom services data for rendering service messages */
  customServices?: Map<string, CustomService>;
  /** ID of the conversation partner (for typing indicator) */
  partnerId?: string;
  /** Whether the partner is currently typing */
  isPartnerTyping?: boolean;
  /** Name of the partner (for typing indicator) */
  partnerName?: string;
}

/**
 * Formats a timestamp for display in the message list.
 */
function formatMessageTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '';

  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Formats a date for the date separator.
 */
function formatDateSeparator(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }
}

/**
 * Gets the date string (YYYY-MM-DD) from a timestamp.
 */
function getDateKey(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const parts = new Date(dateStr).toISOString().split('T');
  return parts[0] ?? '';
}

/**
 * Groups messages by date for displaying date separators.
 */
function groupMessagesByDate(messages: Message[]): Map<string, Message[]> {
  const groups = new Map<string, Message[]>();

  // Sort messages by date (oldest first)
  const sortedMessages = [...messages].sort((a, b) => {
    const dateA = a.sentAt ? new Date(a.sentAt).getTime() : 0;
    const dateB = b.sentAt ? new Date(b.sentAt).getTime() : 0;
    return dateA - dateB;
  });

  sortedMessages.forEach(msg => {
    const dateKey = getDateKey(msg.sentAt);
    const existing = groups.get(dateKey) ?? [];
    groups.set(dateKey, [...existing, msg]);
  });

  return groups;
}

/**
 * MessageList component displays messages in a conversation.
 *
 * Shows message content, sender name, and timestamp.
 * Messages are grouped by date with date separators.
 * Auto-scrolls to the bottom when new messages arrive.
 * Supports custom service messages with special rendering.
 * Displays typing indicator when partner is typing.
 *
 *
 * @example
 * <MessageList
 *   messages={conversationMessages}
 *   currentUser={account}
 *   isLoading={loading}
 *   customServices={servicesMap}
 *   partnerId={selectedPartnerId}
 *   isPartnerTyping={isTyping}
 *   partnerName={partnerName}
 * />
 */
function MessageList({
  messages,
  currentUser,
  isLoading = false,
  customServices,
  partnerId,
  isPartnerTyping = false,
  partnerName,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change or typing status changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPartnerTyping]);

  if (isLoading) {
    return (
      <div className='flex-1 flex items-center justify-center'>
        <div className='text-center text-gray-400'>
          <div className='animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent mx-auto mb-2' />
          <p>Loading messages...</p>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className='flex-1 flex items-center justify-center'>
        <div className='text-center text-gray-400'>
          <svg
            className='h-12 w-12 mx-auto mb-3 text-gray-600'
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
          <p>No messages yet</p>
          <p className='text-sm mt-1'>Send a message to start the conversation</p>
        </div>
      </div>
    );
  }

  const groupedMessages = groupMessagesByDate(messages);

  return (
    <div className='flex-1 overflow-y-auto p-4 space-y-4' role='log' aria-label='Messages'>
      {Array.from(groupedMessages.entries()).map(([dateKey, dateMessages]) => (
        <div key={dateKey}>
          {/* Date separator */}
          <DateSeparator date={dateKey} />

          {/* Messages for this date */}
          <div className='space-y-3'>
            {dateMessages.map(message => {
              const isOwnMessage = message.senderId === currentUser.id;

              // Check if this is a custom service message
              if (
                message.messageType === 'CUSTOM_SERVICE' &&
                message.customServiceId &&
                customServices
              ) {
                const customService = customServices.get(message.customServiceId);
                if (customService) {
                  return (
                    <CustomServiceMessage
                      key={message.id}
                      message={message}
                      customService={customService}
                      currentUser={currentUser}
                      isOwnMessage={isOwnMessage}
                    />
                  );
                }
              }

              // Check if this is a booking request message
              if (message.messageType === 'BOOKING_REQUEST') {
                return (
                  <BookingRequestMessage
                    key={message.id}
                    message={message}
                    isOwnMessage={isOwnMessage}
                  />
                );
              }

              // Regular text message
              return (
                <MessageBubble key={message.id} message={message} isOwnMessage={isOwnMessage} />
              );
            })}
          </div>
        </div>
      ))}

      {/* Typing indicator */}
      {isPartnerTyping && partnerId && <TypingIndicator partnerName={partnerName || 'User'} />}

      <div ref={messagesEndRef} />
    </div>
  );
}

interface DateSeparatorProps {
  date: string;
}

/**
 * Date separator component shown between message groups.
 */
function DateSeparator({ date }: DateSeparatorProps) {
  return (
    <div className='flex items-center justify-center my-4'>
      <div className='flex-1 border-t border-gray-700' />
      <span className='px-3 text-xs text-gray-500 bg-gray-800'>{formatDateSeparator(date)}</span>
      <div className='flex-1 border-t border-gray-700' />
    </div>
  );
}

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
}

/**
 * Individual message bubble component.
 */
function MessageBubble({ message, isOwnMessage }: MessageBubbleProps) {
  const senderName = message.sender?.name ?? 'Unknown';

  return (
    <div
      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
      role='article'
      aria-label={`Message from ${senderName}`}
    >
      <div
        className={`max-w-[75%] ${
          isOwnMessage
            ? 'bg-orange-500 text-white rounded-l-lg rounded-tr-lg'
            : 'bg-gray-700 text-white rounded-r-lg rounded-tl-lg'
        } px-4 py-2`}
      >
        {/* Sender name (only for received messages) */}
        {!isOwnMessage && <p className='text-xs font-medium text-orange-400 mb-1'>{senderName}</p>}

        {/* Message content */}
        <p className='text-sm whitespace-pre-wrap wrap-break-word'>{message.content}</p>

        {/* Timestamp and read receipt */}
        <div className='flex items-center gap-1.5 mt-1'>
          <p className={`text-xs ${isOwnMessage ? 'text-orange-200' : 'text-gray-500'}`}>
            {formatMessageTime(message.sentAt)}
          </p>

          {/* Read receipt indicator (only for sent messages) */}
          {isOwnMessage && <ReadReceiptIndicator isRead={message.isRead} />}
        </div>
      </div>
    </div>
  );
}

interface ReadReceiptIndicatorProps {
  isRead: boolean;
}

/**
 * Read receipt indicator component.
 * Shows single checkmark for sent messages, double checkmark for read messages.
 */
function ReadReceiptIndicator({ isRead }: ReadReceiptIndicatorProps) {
  if (isRead) {
    // Double checkmark for read messages
    return (
      <svg
        className='w-4 h-4 text-orange-200'
        fill='none'
        viewBox='0 0 24 24'
        stroke='currentColor'
        aria-label='Message read'
      >
        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth={2}
          d='M9 13l4 4L23 7'
          opacity={0.6}
        />
      </svg>
    );
  }

  // Single checkmark for sent but not read messages
  return (
    <svg
      className='w-4 h-4 text-orange-200'
      fill='none'
      viewBox='0 0 24 24'
      stroke='currentColor'
      aria-label='Message sent'
    >
      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
    </svg>
  );
}

interface TypingIndicatorProps {
  partnerName: string;
}

/**
 * Typing indicator component shown when partner is typing.
 */
function TypingIndicator({ partnerName }: TypingIndicatorProps) {
  return (
    <div
      className='flex justify-start'
      role='status'
      aria-live='polite'
      aria-label={`${partnerName} is typing`}
    >
      <div className='max-w-[75%] bg-gray-700 text-white rounded-r-lg rounded-tl-lg px-4 py-2'>
        <p className='text-xs font-medium text-orange-400 mb-1'>{partnerName}</p>
        <div className='flex items-center gap-1'>
          <span className='text-sm text-gray-400'>typing</span>
          <div className='flex gap-1'>
            <span
              className='w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce'
              style={{ animationDelay: '0ms' }}
            />
            <span
              className='w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce'
              style={{ animationDelay: '150ms' }}
            />
            <span
              className='w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce'
              style={{ animationDelay: '300ms' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default MessageList;
