import { useEffect, useState } from 'react';

import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { bookingService, isAppError, type BookingType, type Message } from '../../services';
import { LoadingSpinner } from '../Common';

interface BookingRequestMessageProps {
  /** The message containing the booking request */
  message: Message;
  /** Whether this message was sent by the current user */
  isOwnMessage: boolean;
}

/**
 * BookingRequestMessage component displays booking request messages in chat.
 *
 * Features:
 * - Shows booking type details
 * - Displays custom message from user
 * - Shows booking request status
 * - Provides action buttons for coaches
 *
 *
 * @example
 * <BookingRequestMessage
 *   message={bookingRequestMessage}
 *   isOwnMessage={message.senderId === currentUser.id}
 * />
 */
function BookingRequestMessage({ message, isOwnMessage }: BookingRequestMessageProps) {
  const { account } = useAuth();
  const { addNotification } = useNotification();
  const [bookingType, setBookingType] = useState<BookingType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Extract booking type ID from message content or metadata
  // For now, we'll parse it from the message content since we don't have a dedicated field
  const extractBookingTypeId = (content: string): string | null => {
    // This is a simple implementation - in a real system, you might store this in message metadata
    const match = content.match(/booking type:\s*([a-zA-Z0-9-]+)/i);
    return match ? (match[1] ?? null) : null;
  };

  // Load booking type details
  useEffect(() => {
    const loadBookingType = async () => {
      try {
        setLoading(true);
        setError(null);

        // For this implementation, we'll try to extract booking type from message
        // In a real system, you might have a dedicated field for this
        const bookingTypeId = extractBookingTypeId(message.content);

        if (bookingTypeId) {
          const type = await bookingService.getBookingType(bookingTypeId);
          setBookingType(type);
        } else {
          // If no booking type ID found, this is just a general booking request
          setBookingType(null);
        }
      } catch (err) {
        const errorMessage = isAppError(err) ? err.message : 'Failed to load booking type';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadBookingType();
  }, [message.content]);

  const handleRespondToRequest = () => {
    // This would typically open a booking management interface
    // For now, we'll just show a notification
    addNotification('info', 'Booking management interface coming soon!');
  };

  const handleViewServices = () => {
    // Navigate to services page
    window.location.href = '/services';
  };

  const messageClasses = isOwnMessage
    ? 'ml-auto bg-orange-500 text-white'
    : 'mr-auto bg-gray-700 text-white';

  return (
    <div className={`max-w-xs sm:max-w-sm md:max-w-md p-4 rounded-lg ${messageClasses} relative`}>
      {/* Booking Request Header */}
      <div className='flex items-center gap-2 mb-3'>
        <svg
          className='h-5 w-5 text-blue-400'
          fill='none'
          viewBox='0 0 24 24'
          stroke='currentColor'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0V6a2 2 0 012-2h2a2 2 0 012 2v1m-6 0h6m-6 0l-.5 3.5A2 2 0 003.5 13H20.5a2 2 0 002-2l-.5-3.5m-16 0h16'
          />
        </svg>
        <span className='font-semibold text-sm'>
          {isOwnMessage ? 'Booking Request Sent' : 'Booking Request'}
        </span>
      </div>

      {/* Booking Type Details */}
      {loading ? (
        <div className='flex items-center gap-2 mb-3'>
          <LoadingSpinner size='sm' />
          <span className='text-sm opacity-75'>Loading booking details...</span>
        </div>
      ) : error ? (
        <div className='mb-3 p-2 bg-red-500/20 rounded border border-red-500/30'>
          <p className='text-sm text-red-300'>Failed to load booking details</p>
        </div>
      ) : bookingType ? (
        <div className='mb-3 p-3 bg-black/20 rounded border border-white/10'>
          <h4 className='font-semibold text-sm mb-1'>{bookingType.name}</h4>
          <p className='text-sm opacity-75 mb-2'>{bookingType.description}</p>
          <p className='text-sm font-medium'>Price: ${bookingType.basePrice}</p>
        </div>
      ) : (
        <div className='mb-3 p-3 bg-black/20 rounded border border-white/10'>
          <p className='text-sm opacity-75'>General booking request</p>
        </div>
      )}

      {/* Message Content */}
      <div className='mb-3'>
        <p className='text-sm leading-relaxed'>{message.content}</p>
      </div>

      {/* Action Buttons */}
      {!isOwnMessage && account?.role === 'COACH' && (
        <div className='flex gap-2 mt-3'>
          <button
            onClick={handleRespondToRequest}
            className='flex-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors focus:outline-none focus:ring-2 focus:ring-green-500'
          >
            Respond
          </button>
          <button
            onClick={handleViewServices}
            className='flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500'
          >
            View Services
          </button>
        </div>
      )}

      {/* User Action Buttons */}
      {isOwnMessage && (
        <div className='flex gap-2 mt-3'>
          <button
            onClick={handleViewServices}
            className='flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500'
          >
            View Services
          </button>
        </div>
      )}

      {/* Timestamp */}
      <div className='mt-3 pt-2 border-t border-white/10'>
        <p className='text-xs opacity-50'>{new Date(message.sentAt).toLocaleString()}</p>
      </div>
    </div>
  );
}

export default BookingRequestMessage;
