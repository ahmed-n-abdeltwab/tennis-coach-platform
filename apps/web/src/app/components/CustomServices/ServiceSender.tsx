import React, { useState } from 'react';

import type { Account, CustomService, SendCustomServiceRequest } from '../../services/types';
import { LoadingSpinner } from '../Common';

interface ServiceSenderProps {
  /** The custom service to send */
  service: CustomService;
  /** Available users to send the service to */
  availableUsers?: Account[];
  /** Callback when service is successfully sent */
  onServiceSent?: (userId: string, service: CustomService) => void;
  /** Callback when sending is cancelled */
  onCancel?: () => void;
  /** Whether the component is in loading state */
  loading?: boolean;
  /** Error message to display */
  error?: string | null;
  /** Function to handle service sending */
  onSendService: (serviceId: string, data: SendCustomServiceRequest) => Promise<void>;
}

/**
 * Component for sending custom services to users through chat.
 *
 * Allows coaches to select a user and send a custom service with an optional message.
 * The service will appear in the chat and direct the user to the booking page.
 *
 * Res: 2.7, 4.6, 4.7
 *
 * @example
 * <ServiceSender
 *   service={customService}
 *   availableUsers={users}
 *   onSendService={handleSend}
 *   onServiceSent={(userId, service) => console.log('Sent to:', userId)}
 * />
 */
function ServiceSender({
  service,
  availableUsers = [],
  onServiceSent,
  onCancel,
  loading = false,
  error = null,
  onSendService,
}: ServiceSenderProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  /**
   * Validates the form data.
   */
  const validateForm = (): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!selectedUserId) {
      errors.userId = 'Please select a user to send the service to';
    }

    return errors;
  };

  /**
   * Handles form submission.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors = validateForm();
    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      const sendData: SendCustomServiceRequest = {
        userId: selectedUserId,
        message: message.trim() || undefined,
      };

      await onSendService(service.id, sendData);
      onServiceSent?.(selectedUserId, service);
    } catch (err) {
      // Error handling is done by parent component
      console.error('Failed to send custom service:', err);
    }
  };

  /**
   * Handles input changes and clears validation errors.
   */
  const handleUserChange = (userId: string) => {
    setSelectedUserId(userId);

    // Clear validation error
    if (validationErrors.userId) {
      setValidationErrors(prev => {
        const { userId: _, ...rest } = prev;
        return rest;
      });
    }
  };

  /**
   * Formats the price for display.
   */
  const formatPrice = (price: number): string => {
    return `$${price.toFixed(2)}`;
  };

  /**
   * Formats duration for display.
   */
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} minutes`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    }
    return `${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes} minutes`;
  };

  /**
   * Gets the selected user's name.
   */
  const getSelectedUserName = (): string => {
    const user = availableUsers.find(u => u.id === selectedUserId);
    return user?.name || 'Unknown User';
  };

  return (
    <div className='bg-gray-800 rounded-lg p-6'>
      <div className='flex items-center justify-between mb-6'>
        <h2 className='text-xl font-semibold text-white'>Send Custom Service</h2>
        {onCancel && (
          <button
            type='button'
            onClick={onCancel}
            className='text-gray-400 hover:text-white transition-colors'
            aria-label='Close'
          >
            <svg className='w-6 h-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M6 18L18 6M6 6l12 12'
              />
            </svg>
          </button>
        )}
      </div>

      {error && (
        <div className='mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm'>
          {error}
        </div>
      )}

      {/* Service Preview */}
      <div className='mb-6 p-4 bg-gray-700 rounded-lg border border-gray-600'>
        <h3 className='text-lg font-medium text-white mb-2'>Service to Send</h3>
        <div className='space-y-2'>
          <div className='flex items-center justify-between'>
            <span className='font-semibold text-white'>{service.name}</span>
            <span className='text-orange-500 font-bold'>{formatPrice(service.basePrice)}</span>
          </div>

          <div className='text-sm text-gray-400'>Duration: {formatDuration(service.duration)}</div>

          {service.description && <p className='text-sm text-gray-300'>{service.description}</p>}

          {/* Pre-filled Details */}
          {(service.prefilledBookingTypeId ||
            service.prefilledDateTime ||
            service.prefilledTimeSlotId) && (
            <div className='mt-3 pt-3 border-t border-gray-600'>
              <div className='text-sm text-gray-400'>
                <div className='font-medium mb-1'>Pre-filled booking details:</div>
                {service.prefilledBookingTypeId && (
                  <div>• Booking Type: {service.prefilledBookingTypeId}</div>
                )}
                {service.prefilledDateTime && (
                  <div>• Date/Time: {new Date(service.prefilledDateTime).toLocaleString()}</div>
                )}
                {service.prefilledTimeSlotId && (
                  <div>• Time Slot: {service.prefilledTimeSlotId}</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className='space-y-6'>
        {/* User Selection */}
        <div>
          <label htmlFor='userId' className='block text-sm font-medium text-gray-300 mb-2'>
            Send to User *
          </label>
          {availableUsers.length > 0 ? (
            <select
              id='userId'
              value={selectedUserId}
              onChange={e => handleUserChange(e.target.value)}
              className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                validationErrors.userId ? 'border-red-500' : 'border-gray-600'
              }`}
              disabled={loading}
            >
              <option value=''>Select a user...</option>
              {availableUsers.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
          ) : (
            <div className='p-3 bg-gray-700 border border-gray-600 rounded-lg text-gray-400 text-sm'>
              No users available to send services to. Users will appear here after they send you a
              message.
            </div>
          )}
          {validationErrors.userId && (
            <p className='mt-1 text-sm text-red-400'>{validationErrors.userId}</p>
          )}
        </div>

        {/* Optional Message */}
        <div>
          <label htmlFor='message' className='block text-sm font-medium text-gray-300 mb-2'>
            Message (Optional)
          </label>
          <textarea
            id='message'
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={3}
            className='w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500'
            placeholder='Add a personal message to accompany the service...'
            disabled={loading}
          />
          <p className='mt-1 text-sm text-gray-400'>
            This message will be sent along with the service link in the chat.
          </p>
        </div>

        {/* Preview Message */}
        {selectedUserId && (
          <div className='p-4 bg-gray-700 rounded-lg border border-gray-600'>
            <h4 className='text-sm font-medium text-gray-300 mb-2'>Message Preview</h4>
            <div className='text-sm text-gray-400 space-y-2'>
              <div>
                <strong>To:</strong> {getSelectedUserName()}
              </div>
              <div className='bg-gray-800 p-3 rounded border-l-4 border-orange-500'>
                {message && <div className='mb-2 text-white'>{message}</div>}
                <div className='text-orange-400'>
                  🎾 Custom Service: {service.name} ({formatPrice(service.basePrice)})
                </div>
                <div className='text-xs text-gray-500 mt-1'>
                  Click to view and book this service
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className='flex justify-end space-x-3 pt-4 border-t border-gray-700'>
          {onCancel && (
            <button
              type='button'
              onClick={onCancel}
              className='px-4 py-2 text-gray-300 hover:text-white transition-colors'
              disabled={loading}
            >
              Cancel
            </button>
          )}
          <button
            type='submit'
            disabled={loading || availableUsers.length === 0}
            className='px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
          >
            {loading ? (
              <div className='flex items-center'>
                <LoadingSpinner size='sm' />
                <span className='ml-2'>Sending...</span>
              </div>
            ) : (
              'Send Service'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ServiceSender;
