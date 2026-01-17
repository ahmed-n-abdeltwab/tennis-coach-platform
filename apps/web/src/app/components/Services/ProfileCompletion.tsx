import { useState } from 'react';

import type { Account } from '../../services/types';
import { ErrorMessage, LoadingSpinner } from '../Common';

interface ProfileCompletionProps {
  /** Current user account */
  account: Account;
  /** Missing fields that need to be completed */
  missingFields: string[];
  /** Callback when profile is updated */
  onProfileUpdate: (updates: Partial<Account>) => Promise<void>;
  /** Whether the form is submitting */
  submitting?: boolean;
  /** Error message */
  error?: string | null;
  /** Callback when completion is skipped */
  onSkip?: () => void;
  /** Whether skip option is available */
  allowSkip?: boolean;
}

/**
 * Form data interface - only includes fields supported by the backend API.
 * These fields correspond to the Account model and PATCH /api/accounts/{id} endpoint.
 */
interface FormData {
  name?: string;
  address?: string;
  country?: string;
}

/**
 * ProfileCompletion component for collecting missing user information during booking.
 *
 * Displays a form to collect required profile information that's missing from the user's account.
 * Supports validation and updates the user's profile before proceeding with booking.
 * Only collects fields that are supported by the backend API.
 *
 * @example
 * <ProfileCompletion
 *   account={account}
 *   missingFields={['name', 'address', 'country']}
 *   onProfileUpdate={handleProfileUpdate}
 *   onSkip={handleSkip}
 *   allowSkip={false}
 * />
 */
function ProfileCompletion({
  account,
  missingFields,
  onProfileUpdate,
  submitting = false,
  error = null,
  onSkip,
  allowSkip = false,
}: ProfileCompletionProps) {
  const [formData, setFormData] = useState<FormData>(() => {
    // Initialize form with existing account data
    return {
      name: account.name || '',
      address: account.address || '',
      country: account.country || '',
    };
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const { [field]: _, ...rest } = prev;
        return rest;
      });
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Validate required missing fields
    missingFields.forEach(field => {
      const value = formData[field as keyof FormData];
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        errors[field] = `${getFieldLabel(field)} is required`;
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Filter out empty values and only include changed fields
    const updates: Partial<Account> = {};
    Object.entries(formData).forEach(([key, value]) => {
      if (value && value !== account[key as keyof Account]) {
        (updates as Record<string, unknown>)[key] = value;
      }
    });

    await onProfileUpdate(updates);
  };

  const getFieldLabel = (field: string): string => {
    const labels: Record<string, string> = {
      name: 'Full Name',
      address: 'Address',
      country: 'Country',
    };
    return labels[field] || field;
  };

  const isFieldRequired = (field: string): boolean => {
    return missingFields.includes(field);
  };

  const renderField = (field: keyof FormData, type = 'text') => {
    const isRequired = isFieldRequired(field);
    const hasError = !!validationErrors[field];
    const value = formData[field] || '';

    const baseInputClasses = `
      w-full px-4 py-3 rounded-lg bg-gray-700 text-white placeholder-gray-400
      border-2 transition-colors
      focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-900
      ${hasError ? 'border-red-500' : 'border-transparent'}
      ${submitting ? 'opacity-60 cursor-not-allowed' : ''}
    `;

    return (
      <div key={field}>
        <label htmlFor={field} className='block text-sm font-medium text-gray-300 mb-2'>
          {getFieldLabel(field)}
          {isRequired && <span className='text-red-400 ml-1'>*</span>}
        </label>

        <input
          type={type}
          id={field}
          value={value}
          onChange={e => handleInputChange(field, e.target.value)}
          disabled={submitting}
          className={baseInputClasses}
          placeholder={`Enter your ${getFieldLabel(field).toLowerCase()}`}
          required={isRequired}
        />

        {hasError && (
          <p className='mt-2 text-sm text-red-400' role='alert'>
            {validationErrors[field]}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className='bg-gray-800 rounded-lg p-6'>
      <div className='mb-6'>
        <h3 className='text-xl font-semibold text-white mb-2'>Complete Your Profile</h3>
        <p className='text-gray-400'>
          We need some additional information to complete your booking. This information will be
          saved to your profile for future bookings.
        </p>
      </div>

      {error && (
        <div className='mb-6'>
          <ErrorMessage message={error} />
        </div>
      )}

      <form onSubmit={handleSubmit} className='space-y-6'>
        <div className='grid gap-6 md:grid-cols-2'>
          {/* Only render fields that are supported by the backend API */}
          {missingFields.includes('name') && (
            <div className='md:col-span-2'>{renderField('name')}</div>
          )}
          {missingFields.includes('address') && (
            <div className='md:col-span-2'>{renderField('address')}</div>
          )}
          {missingFields.includes('country') && renderField('country')}
        </div>

        {/* Action Buttons */}
        <div className='flex gap-4 pt-6 border-t border-gray-700'>
          {allowSkip && onSkip && (
            <button
              type='button'
              onClick={onSkip}
              disabled={submitting}
              className='flex-1 px-6 py-3 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
            >
              Skip for Now
            </button>
          )}

          <button
            type='submit'
            disabled={submitting}
            className='flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 px-6 rounded-lg font-semibold transition-colors'
          >
            {submitting ? (
              <span className='flex items-center justify-center gap-2'>
                <LoadingSpinner size='sm' />
                Updating Profile...
              </span>
            ) : (
              'Continue to Payment'
            )}
          </button>
        </div>
      </form>

      {/* Required Fields Notice */}
      <div className='mt-4 text-xs text-gray-500'>
        <span className='text-red-400'>*</span> Required fields
      </div>
    </div>
  );
}

export default ProfileCompletion;
