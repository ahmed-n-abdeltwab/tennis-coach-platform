import { useEffect, useState } from 'react';

import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { bookingService, isAppError, type BookingType } from '../../services';
import { ErrorMessage, LoadingSpinner } from '../Common';

interface BookingRequestFormProps {
  /** The coach ID to request booking from */
  coachId: string;
  /** Callback when booking request is sent */
  onBookingRequestSent: (bookingTypeId: string, message: string) => void;
  /** Callback to close the form */
  onClose: () => void;
}

/**
 * BookingRequestForm component allows users to request booking services through chat.
 *
 * Features:
 * - Lists available booking types from the coach
 * - Allows user to add a custom message
 * - Sends a BOOKING_REQUEST message type
 *
 *
 * @example
 * <BookingRequestForm
 *   coachId="coach-123"
 *   onBookingRequestSent={(bookingTypeId, message) => handleRequest(bookingTypeId, message)}
 *   onClose={() => setShowForm(false)}
 * />
 */
function BookingRequestForm({ coachId, onBookingRequestSent, onClose }: BookingRequestFormProps) {
  const { account } = useAuth();
  const { addNotification } = useNotification();
  const [bookingTypes, setBookingTypes] = useState<BookingType[]>([]);
  const [selectedBookingTypeId, setSelectedBookingTypeId] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load booking types for the coach
  useEffect(() => {
    const loadBookingTypes = async () => {
      try {
        setLoading(true);
        setError(null);
        const types = await bookingService.getBookingTypesByCoach(coachId);
        setBookingTypes(types);

        // Auto-select first booking type if available
        if (types.length > 0) {
          setSelectedBookingTypeId(types[0]!.id);
        }
      } catch (err) {
        const errorMessage = isAppError(err) ? err.message : 'Failed to load booking types';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadBookingTypes();
  }, [coachId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedBookingTypeId) {
      addNotification('error', 'Please select a booking type');
      return;
    }

    if (!account) {
      addNotification('error', 'You must be logged in to request bookings');
      return;
    }

    setSending(true);

    try {
      const selectedType = bookingTypes.find(bt => bt.id === selectedBookingTypeId);
      const requestMessage =
        message.trim() ||
        `Hi! I'd like to book a ${selectedType?.name} session. Please let me know your available times.`;

      await onBookingRequestSent(selectedBookingTypeId, requestMessage);

      addNotification('success', 'Booking request sent successfully');
      onClose();
    } catch (err) {
      const errorMessage = isAppError(err) ? err.message : 'Failed to send booking request';
      addNotification('error', errorMessage);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
        <div className='bg-gray-800 rounded-lg p-6 w-full max-w-md'>
          <LoadingSpinner size='lg' message='Loading booking types...' />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
        <div className='bg-gray-800 rounded-lg p-6 w-full max-w-md'>
          <ErrorMessage
            variant='card'
            title='Failed to Load Booking Types'
            message={error}
            onRetry={() => window.location.reload()}
            retryText='Try Again'
          />
        </div>
      </div>
    );
  }

  if (bookingTypes.length === 0) {
    return (
      <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
        <div className='bg-gray-800 rounded-lg p-6 w-full max-w-md'>
          <h3 className='text-lg font-semibold text-white mb-4'>No Booking Types Available</h3>
          <p className='text-gray-300 mb-4'>
            This coach hasn&apos;t set up any booking types yet. You can still send them a regular
            message.
          </p>
          <button
            onClick={onClose}
            className='w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors'
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
      <div className='bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto'>
        <div className='flex items-center justify-between mb-4'>
          <h3 className='text-lg font-semibold text-white'>Request Booking</h3>
          <button
            onClick={onClose}
            className='text-gray-400 hover:text-white transition-colors'
            aria-label='Close'
          >
            <svg className='h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M6 18L18 6M6 6l12 12'
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className='space-y-4'>
          {/* Booking Type Selection */}
          <div>
            <label htmlFor='bookingType' className='block text-sm font-medium text-gray-300 mb-2'>
              Select Service Type
            </label>
            <select
              id='bookingType'
              value={selectedBookingTypeId}
              onChange={e => setSelectedBookingTypeId(e.target.value)}
              className='w-full bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500'
              required
            >
              {bookingTypes.map(type => (
                <option key={type.id} value={type.id}>
                  {type.name} - ${type.basePrice}
                </option>
              ))}
            </select>

            {/* Show description of selected booking type */}
            {selectedBookingTypeId && (
              <div className='mt-2 p-3 bg-gray-700 rounded-lg'>
                <p className='text-sm text-gray-300'>
                  {bookingTypes.find(bt => bt.id === selectedBookingTypeId)?.description ||
                    'No description available'}
                </p>
              </div>
            )}
          </div>

          {/* Custom Message */}
          <div>
            <label htmlFor='message' className='block text-sm font-medium text-gray-300 mb-2'>
              Message (Optional)
            </label>
            <textarea
              id='message'
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder='Add any specific requirements or preferred times...'
              rows={3}
              className='w-full bg-gray-700 text-white rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder-gray-400'
            />
          </div>

          {/* Action Buttons */}
          <div className='flex gap-3 pt-2'>
            <button
              type='button'
              onClick={onClose}
              className='flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500'
            >
              Cancel
            </button>
            <button
              type='submit'
              disabled={sending || !selectedBookingTypeId}
              className='flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 flex items-center justify-center gap-2'
            >
              {sending ? (
                <>
                  <svg className='h-4 w-4 animate-spin' fill='none' viewBox='0 0 24 24'>
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
                  Sending...
                </>
              ) : (
                'Send Request'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default BookingRequestForm;
