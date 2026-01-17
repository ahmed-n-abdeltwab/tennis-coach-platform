import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { AuthAccount, CustomService, Message } from '../../services/types';

interface CustomServiceMessageProps {
  /** The message containing the custom service */
  message: Message;
  /** The custom service data */
  customService: CustomService;
  /** The current authenticated user */
  currentUser: AuthAccount;
  /** Whether this is the user's own message */
  isOwnMessage: boolean;
}

/**
 * Formats a price for display.
 */
function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price);
}

/**
 * Formats duration in minutes to a readable string.
 */
function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Formats a timestamp for display in the message.
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
 * CustomServiceMessage component displays a custom service shared in chat.
 *
 * Shows service details including name, description, price, and duration.
 * Provides a button to book the service (for recipients) or view details.
 * Handles pre-filled booking informatioilable.
 *
 *
 * @example
 * <CustomServiceMessage
 *   message={message}
 *   customService={service}
 *   currentUser={account}
 *   isOwnMessage={false}
 * />
 */
function CustomServiceMessage({
  message,
  customService,
  currentUser: _currentUser,
  isOwnMessage,
}: CustomServiceMessageProps) {
  const navigate = useNavigate();
  const [isNavigating, setIsNavigating] = useState(false);

  const senderName = message.sender?.name ?? 'Unknown';
  const hasPrefilledBooking = Boolean(
    customService.prefilledBookingTypeId ||
    customService.prefilledDateTime ||
    customService.prefilledTimeSlotId
  );

  const handleBookService = async () => {
    setIsNavigating(true);

    try {
      // Navigate to services page with custom service pre-filled
      const searchParams = new URLSearchParams({
        customServiceId: customService.id,
      });

      // Add pre-filled booking parameters if available
      if (customService.prefilledBookingTypeId) {
        searchParams.set('bookingTypeId', customService.prefilledBookingTypeId);
      }
      if (customService.prefilledDateTime) {
        searchParams.set('dateTime', customService.prefilledDateTime);
      }
      if (customService.prefilledTimeSlotId) {
        searchParams.set('timeSlotId', customService.prefilledTimeSlotId);
      }

      navigate(`/services?${searchParams.toString()}`);
    } catch (error) {
      console.error('Failed to navigate to booking:', error);
      setIsNavigating(false);
    }
  };

  return (
    <div
      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
      role='article'
      aria-label={`Custom service message from ${senderName}`}
    >
      <div
        className={`max-w-[75%] ${
          isOwnMessage
            ? 'bg-orange-500 text-white rounded-l-lg rounded-tr-lg'
            : 'bg-gray-700 text-white rounded-r-lg rounded-tl-lg'
        } overflow-hidden`}
      >
        {/* Message header */}
        <div className='px-4 py-2 border-b border-white/10'>
          {!isOwnMessage && (
            <p className='text-xs font-medium text-orange-400 mb-1'>{senderName}</p>
          )}

          {/* Message content if any */}
          {message.content?.trim() && <p className='text-sm mb-2'>{message.content}</p>}

          <div className='flex items-center gap-2'>
            <svg
              className='h-4 w-4 text-current'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
              aria-hidden='true'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
              />
            </svg>
            <span className='text-xs font-medium'>Custom Service</span>
          </div>
        </div>

        {/* Service details */}
        <div className='p-4'>
          <h4 className='font-semibold text-lg mb-2'>{customService.name}</h4>

          {customService.description && (
            <p className='text-sm opacity-90 mb-3'>{customService.description}</p>
          )}

          <div className='space-y-2 mb-4'>
            <div className='flex items-center justify-between'>
              <span className='text-sm opacity-75'>Price:</span>
              <span className='font-semibold'>{formatPrice(customService.basePrice)}</span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-sm opacity-75'>Duration:</span>
              <span className='font-semibold'>{formatDuration(customService.duration)}</span>
            </div>
            {hasPrefilledBooking && (
              <div className='flex items-center gap-2 mt-2'>
                <svg
                  className='h-4 w-4 text-green-400'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                  aria-hidden='true'
                >
                  <path
                    fillRule='evenodd'
                    d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                    clipRule='evenodd'
                  />
                </svg>
                <span className='text-xs text-green-400'>Pre-configured booking details</span>
              </div>
            )}
          </div>

          {/* Action button (only for recipients) */}
          {!isOwnMessage && (
            <button
              type='button'
              onClick={handleBookService}
              disabled={isNavigating}
              className={`w-full py-2 px-4 rounded-lg font-medium text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 ${
                isOwnMessage
                  ? 'bg-white/20 hover:bg-white/30 text-white focus:ring-white'
                  : 'bg-orange-500 hover:bg-orange-600 text-white focus:ring-orange-500'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isNavigating ? (
                <div className='flex items-center justify-center gap-2'>
                  <svg
                    className='h-4 w-4 animate-spin'
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
                  <span>Opening...</span>
                </div>
              ) : hasPrefilledBooking ? (
                'Book Now'
              ) : (
                'View Service'
              )}
            </button>
          )}
        </div>

        {/* Timestamp */}
        <div className={`px-4 pb-2 text-xs ${isOwnMessage ? 'text-orange-200' : 'text-gray-400'}`}>
          {formatMessageTime(message.sentAt)}
        </div>
      </div>
    </div>
  );
}

export default CustomServiceMessage;
