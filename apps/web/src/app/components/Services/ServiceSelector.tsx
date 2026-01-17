import { useEffect } from 'react';

import type { BookingType, CustomService } from '../../services/types';
import { ErrorMessage, LoadingSpinner } from '../Common';

interface ServiceSelectorProps {
  /** Available booking types */
  bookingTypes: BookingType[];
  /** Available custom services */
  customServices: CustomService[];
  /** Currently selected service */
  selectedService: BookingType | CustomService | null;
  /** Callback when a service is selected */
  onServiceSelect: (
    service: BookingType | CustomService,
    type: 'booking-type' | 'custom-service'
  ) => void;
  /** Whether services are loading */
  loading?: boolean;
  /** Error message to display */
  error?: string | null;
  /** Pre-selected custom service ID (from URL params) */
  preSelectedCustomServiceId?: string;
}

/**
 * ServiceSelector component for choosing between booking types and custom services.
 *
 * Displays available booking types and custom services in a unified interface,
 * allowing users to select their preferred service for booking.
 *
 * When a custom service has complete pre-filled booking details (bookingTypeId,
 * timeSlotId, and dateTime), it will be auto-selected and the user will proceed
 * directly to payment, skipping the time selection step.
 *
 *
 * @example
 * <ServiceSelector
 *   bookingTypes={bookingTypes}
 *   customServices={customServices}
 *   onServiceSelect={(service, type) => console.log('Selected:', service, type)}
 *   loading={false}
 * />
 */
export function ServiceSelector({
  bookingTypes,
  customServices,
  selectedService,
  onServiceSelect,
  loading = false,
  error = null,
  preSelectedCustomServiceId,
}: ServiceSelectorProps) {
  // Auto-select pre-selected custom service
  useEffect(() => {
    if (preSelectedCustomServiceId && customServices.length > 0 && !selectedService) {
      const preSelectedService = customServices.find(cs => cs.id === preSelectedCustomServiceId);
      if (preSelectedService) {
        // Auto-select the custom service
        // The Services page will handle checking if it has complete booking details
        // and skip directly to payment if all fields are present
        onServiceSelect(preSelectedService, 'custom-service');
      }
    }
  }, [preSelectedCustomServiceId, customServices, selectedService, onServiceSelect]);

  if (loading) {
    return (
      <div className='flex items-center justify-center py-12'>
        <LoadingSpinner size='lg' message='Loading services...' />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorMessage
        variant='card'
        title='Failed to Load Services'
        message={error}
        onRetry={() => window.location.reload()}
        retryText='Try Again'
      />
    );
  }

  const hasBookingTypes = bookingTypes.length > 0;
  const hasCustomServices = customServices.length > 0;

  if (!hasBookingTypes && !hasCustomServices) {
    return (
      <div className='text-center py-12'>
        <div className='text-gray-400 mb-4'>
          <svg
            className='w-16 h-16 mx-auto mb-4'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'
            />
          </svg>
        </div>
        <h3 className='text-lg font-medium text-white mb-2'>No Services Available</h3>
        <p className='text-gray-400'>Please check back later for available services.</p>
      </div>
    );
  }

  return (
    <div className='space-y-8'>
      <div>
        <h2 className='text-2xl font-bold text-white mb-2'>Select a Service</h2>
        <p className='text-gray-400'>
          Choose from available coaching services or custom offerings.
        </p>
      </div>

      {/* Standard Booking Types */}
      {hasBookingTypes && (
        <div>
          <h3 className='text-lg font-semibold text-white mb-4'>Standard Services</h3>
          <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
            {bookingTypes.map(bookingType => (
              <ServiceCard
                key={bookingType.id}
                service={bookingType}
                type='booking-type'
                isSelected={selectedService?.id === bookingType.id}
                onSelect={() => onServiceSelect(bookingType, 'booking-type')}
              />
            ))}
          </div>
        </div>
      )}

      {/* Custom Services */}
      {hasCustomServices && (
        <div>
          <h3 className='text-lg font-semibold text-white mb-4'>Custom Services</h3>
          <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
            {customServices.map(customService => (
              <ServiceCard
                key={customService.id}
                service={customService}
                type='custom-service'
                isSelected={selectedService?.id === customService.id}
                onSelect={() => onServiceSelect(customService, 'custom-service')}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface ServiceCardProps {
  service: BookingType | CustomService;
  type: 'booking-type' | 'custom-service';
  isSelected: boolean;
  onSelect: () => void;
}

/**
 * Individual service card component.
 */
function ServiceCard({ service, type, isSelected, onSelect }: ServiceCardProps) {
  const isCustomService = type === 'custom-service';
  const price = isCustomService
    ? (service as CustomService).basePrice
    : (service as BookingType).basePrice;
  const duration = isCustomService ? (service as CustomService).duration : 60; // Default 60 minutes for booking types

  // Check if custom service has complete booking details
  const hasCompleteBookingDetails =
    isCustomService &&
    (service as CustomService).prefilledBookingTypeId &&
    (service as CustomService).prefilledTimeSlotId &&
    (service as CustomService).prefilledDateTime;

  return (
    <button
      onClick={onSelect}
      className={`
        relative p-6 rounded-lg border-2 text-left transition-all duration-200 w-full
        ${
          isSelected
            ? 'border-orange-500 bg-orange-500/10 shadow-lg shadow-orange-500/20'
            : 'border-gray-700 bg-gray-800 hover:border-gray-600 hover:bg-gray-750'
        }
      `}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className='absolute top-3 right-3'>
          <div className='w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center'>
            <svg
              className='w-4 h-4 text-white'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M5 13l4 4L19 7'
              />
            </svg>
          </div>
        </div>
      )}

      {/* Service type badge */}
      <div className='mb-3 flex items-center gap-2'>
        <span
          className={`
          inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
          ${isCustomService ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}
        `}
        >
          {isCustomService ? 'Custom Service' : 'Standard Service'}
        </span>

        {/* Quick booking indicator for complete custom services */}
        {hasCompleteBookingDetails && (
          <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800'>
            <svg className='w-3 h-3 mr-1' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M13 10V3L4 14h7v7l9-11h-7z'
              />
            </svg>
            Quick Booking
          </span>
        )}
      </div>

      {/* Service details */}
      <div className='space-y-2'>
        <h4 className='text-lg font-semibold text-white'>{service.name}</h4>

        {service.description && (
          <p className='text-sm text-gray-400 line-clamp-2'>{service.description}</p>
        )}

        <div className='flex items-center justify-between pt-2'>
          <div className='text-sm text-gray-400'>{duration} minutes</div>
          <div className='text-lg font-bold text-orange-500'>${price}</div>
        </div>

        {/* Additional info for complete custom services */}
        {hasCompleteBookingDetails && (
          <div className='mt-2 pt-2 border-t border-gray-700'>
            <p className='text-xs text-green-400'>
              ⚡ All details pre-filled - proceed directly to payment
            </p>
          </div>
        )}
      </div>
    </button>
  );
}

export default ServiceSelector;
