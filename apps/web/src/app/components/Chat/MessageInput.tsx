import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';

import { useSocket } from '../../hooks';

interface MessageInputProps {
  /** Callback when a message is submitted */
  onSendMessage: (content: string) => void;
  /** Whether the send action is in progress */
  isSending?: boolean;
  /** Placeholder text for the input */
  placeholder?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Conversation ID for typing indicators */
  conversationId?: string;
}

/**
 * MessageInput component provides a text input with send button for chat.
 *
 * Supports Enter key to send (Shift+Enter for new line).
 * Auto-focuses on mount and after sending.
 *
 *
 * @example
 * <MessageInput
 *   onSendMessage={(content) => handleSend(content)}
 *   isSending={sending}
 *   placeholder="Type a message..."
 * />
 */
function MessageInput({
  onSendMessage,
  isSending = false,
  placeholder = 'Type a message...',
  disabled = false,
  conversationId,
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);
  const socket = useSocket();

  // Handle typing indicators
  const handleTypingStart = () => {
    if (!conversationId || !socket.isConnected || isTypingRef.current) return;

    socket.startTyping(conversationId);
    isTypingRef.current = true;
  };

  const handleTypingStop = () => {
    if (!conversationId || !socket.isConnected || !isTypingRef.current) return;

    socket.stopTyping(conversationId);
    isTypingRef.current = false;
  };

  // Handle input changes with typing indicators
  const handleInputChange = (value: string) => {
    setMessage(value);

    if (!conversationId) return;

    // Start typing indicator if not already started
    if (value.trim() && !isTypingRef.current) {
      handleTypingStart();
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing indicator
    if (value.trim()) {
      typingTimeoutRef.current = setTimeout(() => {
        handleTypingStop();
      }, 1000); // Stop typing after 1 second of inactivity
    } else {
      // Stop typing immediately if input is empty
      handleTypingStop();
    }
  };

  // Cleanup typing indicators on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTypingRef.current && conversationId) {
        handleTypingStop();
      }
    };
  }, [conversationId]);

  // Auto-focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  }, [message]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMessage();
  };

  const sendMessage = () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isSending || disabled) return;

    // Stop typing indicator before sending
    if (isTypingRef.current && conversationId) {
      handleTypingStop();
    }

    onSendMessage(trimmedMessage);
    setMessage('');

    // Reset textarea height and refocus
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const isDisabled = disabled || isSending;
  const canSend = message.trim().length > 0 && !isDisabled;

  return (
    <form onSubmit={handleSubmit} className='border-t border-gray-700 p-4'>
      <div className='flex items-end gap-3'>
        <div className='flex-1 relative'>
          <textarea
            ref={textareaRef}
            value={message}
            onChange={e => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isDisabled}
            rows={1}
            className='w-full bg-gray-700 text-white rounded-lg px-4 py-3 pr-12 resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed placeholder-gray-400'
            aria-label='Message input'
          />
        </div>

        <button
          type='submit'
          disabled={!canSend}
          className='shrink-0 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg p-3 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-800'
          aria-label='Send message'
        >
          {isSending ? (
            <svg
              className='h-5 w-5 animate-spin'
              fill='none'
              viewBox='0 0 24 24'
              aria-hidden='true'
            >
              <circle
                className='opacity-25'
                cx='12'
                cy='12'
                r='10'
                stroke='currentColor'
                strokeWidth='4'
              />
              <path
                className='opacity-75'
                fill='currentColor'
                d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
              />
            </svg>
          ) : (
            <svg
              className='h-5 w-5'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
              aria-hidden='true'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 19l9 2-9-18-9 18 9-2zm0 0v-8'
              />
            </svg>
          )}
        </button>
      </div>

      <p className='text-xs text-gray-500 mt-2'>Press Enter to send, Shift+Enter for new line</p>
    </form>
  );
}

export default MessageInput;
