import { useEffect, useState } from 'react';

import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { customServiceService, isAppError, type CustomService } from '../../services';
import { ErrorMessage, LoadingSpinner } from '../Common';

interface CustomServiceSelectorProps {
  /** The user ID to send the service to */
  receiverId: string;
  /** Callback when service is sent */
  onServiceSent: (serviceId: string, receiverId: string, message?: string) => Promise<void>;
  /** Callback to close the modal */
  onClose: () => void;
}

/**
 * CustomServiceSelector component allows coaches to select and send custom services to users.
 *
 * Features:
 * - Lists coach's custom services (templates and public services)
 * - Allows selection of a service
 * - Optional message to accompany the service
 * - Sends the service through chat
 *
 * @example
 * <CustomServiceSelector
 *   receiverId="user-123"
 *   onServiceSent={handleSendCustomService}
 *   onClose={() => setShowSelector(false)}
 * />
 */
function CustomServiceSelector({ receiverId, onServiceSent, onClose }: CustomServiceSelectorProps) {
  const { account } = useAuth();
  const { addNotification } = useNotification();
  const [customServices, setCustomServices] = useState<CustomService[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'templates' | 'public'>('all');

  // Load custom services for the coach
  useEffect(() => {
    const loadCustomServices = async () => {
      if (!account) {
        setError('You must be logged in to send custom services');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch all custom services for the coach
        const services = await customServiceService.getCustomServices({
          coachId: account.id,
        });

        setCustomServices(services);

        // Auto-select first service if available
        if (services.length > 0 && services[0]) {
          setSelectedServiceId(services[0].id);
        }
      } catch (err) {
        const errorMessage = isAppError(err) ? err.message : 'Failed to load custom services';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadCustomServices();
  }, [account]);

  // Filter services based on selected filter type
  const filteredServices = customServices.filter(service => {
    if (filterType === 'templates') {
      return service.isTemplate;
    }
    if (filterType === 'public') {
      return service.isPublic;
    }
    return true; // 'all'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedServiceId) {
      addNotification('error', 'Please select a custom service');
      return;
    }

    if (!account) {
      addNotification('error', 'You must be logged in to send custom services');
      return;
    }

    setSending(true);

    try {
      const selectedService = customServices.find(s => s.id === selectedServiceId);
      const serviceMessage =
        message.trim() ||
        `Hi! I've created a custom service for you: ${selectedService?.name}. Check it out!`;

      await onServiceSent(selectedServiceId, receiverId, serviceMessage);

      addNotification('success', 'Custom service sent successfully');
      onClose();
    } catch (err) {
      const errorMessage = isAppError(err) ? err.message : 'Failed to send custom service';
      addNotification('error', errorMessage);
    } finally {
      setSending(false);
    }
  };

  // Format price for display
  const formatPrice = (price: number): string => {
    return `$${price.toFixed(2)}`;
  };

  // Format duration for display
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${remainingMinutes}m`;
  };

  if (loading) {
    return (
      <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
        <div className='bg-gray-800 rounded-lg p-6 w-full max-w-2xl'>
          <LoadingSpinner size='lg' message='Loading custom services...' />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
        <div className='bg-gray-800 rounded-lg p-6 w-full max-w-2xl'>
          <ErrorMessage
            variant='card'
            title='Failed to Load Custom Services'
            message={error || 'An error occurred'}
            onRetry={() => window.location.reload()}
            retryText='Try Again'
          />
          <button
            onClick={onClose}
            className='mt-4 w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors'
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  if (customServices.length === 0) {
    return (
      <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
        <div className='bg-gray-800 rounded-lg p-6 w-full max-w-2xl'>
          <h3 className='text-lg font-semibold text-white mb-4'>No Custom Services Available</h3>
          <p className='text-gray-300 mb-4'>
            You haven`t created any custom services yet. Create a custom service first to send it to
            your clients.
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

  const selectedService = customServices.find(s => s.id === selectedServiceId);

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
      <div className='bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto'>
        <div className='flex items-center justify-between mb-4'>
          <h3 className='text-lg font-semibold text-white'>Send Custom Service</h3>
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
          {/* Filter Tabs */}
          <div className='flex gap-2 border-b border-gray-700 pb-2'>
            <button
              type='button'
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                filterType === 'all'
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              All ({customServices.length})
            </button>
            <button
              type='button'
              onClick={() => setFilterType('templates')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                filterType === 'templates'
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              Templates ({customServices.filter(s => s.isTemplate).length})
            </button>
            <button
              type='button'
              onClick={() => setFilterType('public')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                filterType === 'public'
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              Public ({customServices.filter(s => s.isPublic).length})
            </button>
          </div>

          {/* Service Selection */}
          <div>
            <label htmlFor='service' className='block text-sm font-medium text-gray-300 mb-2'>
              Select Service
            </label>
            <div className='space-y-2 max-h-64 overflow-y-auto'>
              {filteredServices.length === 0 ? (
                <p className='text-gray-400 text-sm py-4 text-center'>
                  No services match the selected filter
                </p>
              ) : (
                filteredServices.map(service => (
                  <label
                    key={service.id}
                    className={`block p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      selectedServiceId === service.id
                        ? 'border-orange-500 bg-orange-500/10'
                        : 'border-gray-700 bg-gray-700/50 hover:border-gray-600'
                    }`}
                  >
                    <input
                      type='radio'
                      name='service'
                      value={service.id}
                      checked={selectedServiceId === service.id}
                      onChange={e => setSelectedServiceId(e.target.value)}
                      className='sr-only'
                    />
                    <div className='flex items-start justify-between'>
                      <div className='flex-1'>
                        <div className='flex items-center gap-2 mb-1'>
                          <h4 className='font-medium text-white'>{service.name}</h4>
                          {service.isTemplate && (
                            <span className='px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded'>
                              Template
                            </span>
                          )}
                          {service.isPublic && (
                            <span className='px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded'>
                              Public
                            </span>
                          )}
                        </div>
                        {service.description && (
                          <p className='text-sm text-gray-400 mb-2'>{service.description}</p>
                        )}
                        <div className='flex items-center gap-4 text-sm text-gray-400'>
                          <span>{formatPrice(service.basePrice)}</span>
                          <span>•</span>
                          <span>{formatDuration(service.duration)}</span>
                          {service.usageCount > 0 && (
                            <>
                              <span>•</span>
                              <span>Used {service.usageCount}x</span>
                            </>
                          )}
                        </div>
                      </div>
                      {selectedServiceId === service.id && (
                        <svg
                          className='h-5 w-5 text-orange-500 shrink-0'
                          fill='currentColor'
                          viewBox='0 0 20 20'
                        >
                          <path
                            fillRule='evenodd'
                            d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                            clipRule='evenodd'
                          />
                        </svg>
                      )}
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Selected Service Details */}
          {selectedService && (
            <div className='p-3 bg-gray-700/50 rounded-lg border border-gray-600'>
              <h4 className='text-sm font-medium text-white mb-2'>Selected Service Details</h4>
              <div className='space-y-1 text-sm text-gray-300'>
                <p>
                  <span className='text-gray-400'>Price:</span>{' '}
                  {formatPrice(selectedService.basePrice)}
                </p>
                <p>
                  <span className='text-gray-400'>Duration:</span>{' '}
                  {formatDuration(selectedService.duration)}
                </p>
                {selectedService.prefilledBookingTypeId && (
                  <p className='text-orange-400 text-xs mt-2'>
                    ✓ This service has pre-filled booking details
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Custom Message */}
          <div>
            <label htmlFor='message' className='block text-sm font-medium text-gray-300 mb-2'>
              Message (Optional)
            </label>
            <textarea
              id='message'
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder={`Add a personal message about ${selectedService?.name ?? 'this service'}...`}
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
              disabled={sending || !selectedServiceId || filteredServices.length === 0}
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
                'Send Service'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CustomServiceSelector;
