import React, { useState } from 'react';

import type {
  BookingType,
  CreateCustomServiceRequest,
  CustomService,
  TimeSlot,
} from '../../services/types';
import { LoadingSpinner } from '../Common';

interface CustomServiceCreatorProps {
  /** Available booking types for pre-filling */
  bookingTypes?: BookingType[];
  /** Available time slots for pre-filling */
  timeSlots?: TimeSlot[];
  /** Callback when service is successfully created */
  onServiceCreated?: (service: CustomService) => void;
  /** Callback when creation is cancelled */
  onCancel?: () => void;
  /** Whether the form is in loading state */
  loading?: boolean;
  /** Error message to display */
  error?: string | null;
  /** Function to handle service creation */
  onCreateService: (data: CreateCustomServiceRequest) => Promise<void>;
}

/**
 * Form component for creating custom services.
 *
 * Allows coaches to create personalized service offerings with optional pre-filled
 * booking details. Supports template creation and public visibility settings.
 *
 *
 * @example
 * <CustomServiceCreator
 *   bookingTypes={bookingTypes}
 *   timeSlots={timeSlots}
 *   onCreateService={handleCreate}
 *   onServiceCreated={(service) => console.log('Created:', service)}
 * />
 */
function CustomServiceCreator({
  bookingTypes = [],
  timeSlots = [],
  onServiceCreated: _onServiceCreated,
  onCancel,
  loading = false,
  error = null,
  onCreateService,
}: CustomServiceCreatorProps) {
  const [formData, setFormData] = useState<CreateCustomServiceRequest>({
    name: '',
    description: '',
    basePrice: '',
    duration: 60,
    isTemplate: false,
    isPublic: false,
    prefilledBookingTypeId: '',
    prefilledDateTime: '',
    prefilledTimeSlotId: '',
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  /**
   * Validates the form data and returns validation errors.
   */
  const validateForm = (): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Service name is required';
    }

    if (!formData.basePrice.trim()) {
      errors.basePrice = 'Base price is required';
    } else {
      const price = parseFloat(formData.basePrice);
      if (isNaN(price) || price <= 0) {
        errors.basePrice = 'Base price must be a positive number';
      }
    }

    if (formData.duration <= 0) {
      errors.duration = 'Duration must be greater than 0';
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
      // Clean up empty optional fields
      const cleanedData: CreateCustomServiceRequest = {
        ...formData,
        description: formData.description?.trim() || undefined,
        prefilledBookingTypeId: formData.prefilledBookingTypeId || undefined,
        prefilledDateTime: formData.prefilledDateTime || undefined,
        prefilledTimeSlotId: formData.prefilledTimeSlotId || undefined,
      };

      await onCreateService(cleanedData);
    } catch (err) {
      // Error handling is done by parent component
      console.error('Failed to create custom service:', err);
    }
  };

  /**
   * Handles input changes and clears validation errors.
   */
  const handleInputChange = (
    field: keyof CreateCustomServiceRequest,
    value: string | number | boolean
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const { [field]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  /**
   * Formats duration for display (e.g., "60 minutes", "1 hour 30 minutes").
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

  return (
    <div className='bg-gray-800 rounded-lg p-6'>
      <div className='flex items-center justify-between mb-6'>
        <h2 className='text-xl font-semibold text-white'>Create Custom Service</h2>
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

      <form onSubmit={handleSubmit} className='space-y-6'>
        {/* Basic Information */}
        <div className='space-y-4'>
          <h3 className='text-lg font-medium text-white'>Basic Information</h3>

          {/* Service Name */}
          <div>
            <label htmlFor='name' className='block text-sm font-medium text-gray-300 mb-2'>
              Service Name *
            </label>
            <input
              type='text'
              id='name'
              value={formData.name}
              onChange={e => handleInputChange('name', e.target.value)}
              className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                validationErrors.name ? 'border-red-500' : 'border-gray-600'
              }`}
              placeholder='e.g., Personal Training Session'
              disabled={loading}
            />
            {validationErrors.name && (
              <p className='mt-1 text-sm text-red-400'>{validationErrors.name}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor='description' className='block text-sm font-medium text-gray-300 mb-2'>
              Description
            </label>
            <textarea
              id='description'
              value={formData.description}
              onChange={e => handleInputChange('description', e.target.value)}
              rows={3}
              className='w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500'
              placeholder='Describe what this service includes...'
              disabled={loading}
            />
          </div>

          {/* Price and Duration */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div>
              <label htmlFor='basePrice' className='block text-sm font-medium text-gray-300 mb-2'>
                Base Price * ($)
              </label>
              <input
                type='number'
                id='basePrice'
                step='0.01'
                min='0'
                value={formData.basePrice}
                onChange={e => handleInputChange('basePrice', e.target.value)}
                className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                  validationErrors.basePrice ? 'border-red-500' : 'border-gray-600'
                }`}
                placeholder='99.99'
                disabled={loading}
              />
              {validationErrors.basePrice && (
                <p className='mt-1 text-sm text-red-400'>{validationErrors.basePrice}</p>
              )}
            </div>

            <div>
              <label htmlFor='duration' className='block text-sm font-medium text-gray-300 mb-2'>
                Duration * (minutes)
              </label>
              <input
                type='number'
                id='duration'
                min='1'
                step='15'
                value={formData.duration}
                onChange={e => handleInputChange('duration', parseInt(e.target.value) || 0)}
                className={`w-full px-3 py-2 bg-gray-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                  validationErrors.duration ? 'border-red-500' : 'border-gray-600'
                }`}
                disabled={loading}
              />
              {formData.duration > 0 && (
                <p className='mt-1 text-sm text-gray-400'>{formatDuration(formData.duration)}</p>
              )}
              {validationErrors.duration && (
                <p className='mt-1 text-sm text-red-400'>{validationErrors.duration}</p>
              )}
            </div>
          </div>
        </div>

        {/* Pre-filled Booking Details */}
        <div className='space-y-4'>
          <h3 className='text-lg font-medium text-white'>Pre-filled Booking Details (Optional)</h3>
          <p className='text-sm text-gray-400'>
            Pre-fill booking information to make it easier for clients to book this service.
          </p>

          {/* Booking Type */}
          {bookingTypes.length > 0 && (
            <div>
              <label
                htmlFor='prefilledBookingTypeId'
                className='block text-sm font-medium text-gray-300 mb-2'
              >
                Booking Type
              </label>
              <select
                id='prefilledBookingTypeId'
                value={formData.prefilledBookingTypeId}
                onChange={e => handleInputChange('prefilledBookingTypeId', e.target.value)}
                className='w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500'
                disabled={loading}
              >
                <option value=''>Select a booking type...</option>
                {bookingTypes.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.name} - ${type.basePrice?.toFixed(2) || 'Price on request'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date and Time */}
          <div>
            <label
              htmlFor='prefilledDateTime'
              className='block text-sm font-medium text-gray-300 mb-2'
            >
              Date and Time
            </label>
            <input
              type='datetime-local'
              id='prefilledDateTime'
              value={formData.prefilledDateTime}
              onChange={e => handleInputChange('prefilledDateTime', e.target.value)}
              className='w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500'
              disabled={loading}
            />
          </div>

          {/* Time Slot */}
          {timeSlots.length > 0 && (
            <div>
              <label
                htmlFor='prefilledTimeSlotId'
                className='block text-sm font-medium text-gray-300 mb-2'
              >
                Time Slot
              </label>
              <select
                id='prefilledTimeSlotId'
                value={formData.prefilledTimeSlotId}
                onChange={e => handleInputChange('prefilledTimeSlotId', e.target.value)}
                className='w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500'
                disabled={loading}
              >
                <option value=''>Select a time slot...</option>
                {timeSlots.map(slot => (
                  <option key={slot.id} value={slot.id}>
                    {new Date(slot.dateTime).toLocaleString()} -{' '}
                    {new Date(
                      new Date(slot.dateTime).getTime() + slot.durationMin * 60000
                    ).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Service Options */}
        <div className='space-y-4'>
          <h3 className='text-lg font-medium text-white'>Service Options</h3>

          <div className='space-y-3'>
            {/* Template Option */}
            <label className='flex items-center'>
              <input
                type='checkbox'
                checked={formData.isTemplate}
                onChange={e => handleInputChange('isTemplate', e.target.checked)}
                className='w-4 h-4 text-orange-500 bg-gray-700 border-gray-600 rounded focus:ring-orange-500 focus:ring-2'
                disabled={loading}
              />
              <span className='ml-2 text-sm text-gray-300'>Save as template for future use</span>
            </label>

            {/* Public Option */}
            <label className='flex items-center'>
              <input
                type='checkbox'
                checked={formData.isPublic}
                onChange={e => handleInputChange('isPublic', e.target.checked)}
                className='w-4 h-4 text-orange-500 bg-gray-700 border-gray-600 rounded focus:ring-orange-500 focus:ring-2'
                disabled={loading}
              />
              <span className='ml-2 text-sm text-gray-300'>Make visible to all clients</span>
            </label>
          </div>
        </div>

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
            disabled={loading}
            className='px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
          >
            {loading ? (
              <div className='flex items-center'>
                <LoadingSpinner size='sm' />
                <span className='ml-2'>Creating...</span>
              </div>
            ) : (
              'Create Service'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CustomServiceCreator;
