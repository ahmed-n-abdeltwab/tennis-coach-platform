import { useAuth } from '@contexts/AuthContext';
import { accountService } from '@services/account.service';
import { isAppError } from '@services/error-handler';
import { type Account, type AccountUpdateRequest } from '@services/types';
import { FormEvent, useCallback, useState } from 'react';

// ============================================================================
// Types
// ============================================================================

interface MissingInfoCollectorProps {
  /** Current account data */
  account: Account;
  /** Required fields that are missing */
  missingFields: string[];
  /** Callback when information is successfully collected */
  onInfoCollected?: (updatedAccount: Account) => void;
  /** Callback when collection fails */
  onError?: (error: string) => void;
  /** Callback when user cancels */
  onCancel?: () => void;
}

interface MissingFieldData {
  [key: string]: string;
}

// ============================================================================
// Field Configuration
// ============================================================================

const FIELD_CONFIG: Record<
  string,
  { label: string; type: string; placeholder?: string; required: boolean }
> = {
  name: { label: 'Full Name', type: 'text', placeholder: 'Enter your full name', required: true },
  address: {
    label: 'Street Address',
    type: 'text',
    placeholder: 'Enter your street address',
    required: false,
  },
  country: { label: 'Country', type: 'text', placeholder: 'Enter your country', required: false },
  gender: { label: 'Gender', type: 'select', required: false },
  age: { label: 'Age', type: 'number', placeholder: 'Enter your age', required: false },
  height: {
    label: 'Height (cm)',
    type: 'number',
    placeholder: 'Enter your height in cm',
    required: false,
  },
  weight: {
    label: 'Weight (kg)',
    type: 'number',
    placeholder: 'Enter your weight in kg',
    required: false,
  },
  disability: { label: 'Disability Status', type: 'select', required: false },
  disabilityCause: {
    label: 'Disability Cause',
    type: 'text',
    placeholder: 'Describe the cause if applicable',
    required: false,
  },
  notes: {
    label: 'Additional Notes',
    type: 'textarea',
    placeholder: 'Any additional information',
    required: false,
  },
  bio: {
    label: 'Biography',
    type: 'textarea',
    placeholder: 'Tell us about yourself',
    required: false,
  },
  credentials: {
    label: 'Credentials',
    type: 'textarea',
    placeholder: 'List your qualifications and certifications',
    required: false,
  },
  philosophy: {
    label: 'Coaching Philosophy',
    type: 'textarea',
    placeholder: 'Describe your coaching approach',
    required: false,
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Checks if a field value is considered complete
 */
function isFieldComplete(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

/**
 * Gets the current value for a field from the account
 */
function getFieldValue(account: Account, fieldKey: string): string {
  const value = account[fieldKey as keyof Account];
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  return String(value);
}

// ============================================================================
// MissingInfoCollector Component
// ============================================================================

function MissingInfoCollector({
  account,
  missingFields,
  onInfoCollected,
  onError,
  onCancel,
}: MissingInfoCollectorProps) {
  const { refreshAuth } = useAuth();
  const [formData, setFormData] = useState<MissingFieldData>(() => {
    const initialData: MissingFieldData = {};
    missingFields.forEach(field => {
      initialData[field] = getFieldValue(account, field);
    });
    return initialData;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Handles form field changes
   */
  const handleInputChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  /**
   * Validates the form data
   */
  const validateForm = useCallback((): string | null => {
    for (const field of missingFields) {
      const config = FIELD_CONFIG[field];
      const value = formData[field];

      if (config?.required && !isFieldComplete(value)) {
        return `${config.label} is required`;
      }
    }
    return null;
  }, [formData, missingFields]);

  /**
   * Handles form submission
   */
  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();

      // Validate form
      const validationError = validateForm();
      if (validationError) {
        onError?.(validationError);
        return;
      }

      setIsSubmitting(true);

      try {
        // Prepare update request with only the fields that have values
        const updateRequest: AccountUpdateRequest = {};
        Object.entries(formData).forEach(([key, value]) => {
          if (isFieldComplete(value)) {
            (updateRequest as Record<string, unknown>)[key] = value;
          }
        });

        // Update account
        const updatedAccount = await accountService.updateAccount(account.id, updateRequest);

        // Refresh auth context
        try {
          await refreshAuth();
        } catch (error) {
          // Ignore refresh errors - the profile was still updated successfully
          console.warn('Failed to refresh auth after profile update:', error);
        }

        onInfoCollected?.(updatedAccount);
      } catch (error) {
        const errorMessage = isAppError(error) ? error.message : 'Failed to update profile';
        onError?.(errorMessage);
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, validateForm, account.id, refreshAuth, onInfoCollected, onError]
  );

  /**
   * Renders a form field based on its configuration
   */
  const renderField = useCallback(
    (fieldKey: string) => {
      const config = FIELD_CONFIG[fieldKey];
      if (!config) return null;

      const value = formData[fieldKey] || '';

      if (config.type === 'select' && fieldKey === 'gender') {
        return (
          <div key={fieldKey}>
            <label htmlFor={fieldKey} className='block text-sm font-medium text-gray-700 mb-1'>
              {config.label} {config.required && <span className='text-red-500'>*</span>}
            </label>
            <select
              id={fieldKey}
              value={value}
              onChange={e => handleInputChange(fieldKey, e.target.value)}
              className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent'
              required={config.required}
            >
              <option value=''>Select Gender</option>
              <option value='male'>Male</option>
              <option value='female'>Female</option>
              <option value='other'>Other</option>
            </select>
          </div>
        );
      }

      if (config.type === 'select' && fieldKey === 'disability') {
        return (
          <div key={fieldKey}>
            <label htmlFor={fieldKey} className='block text-sm font-medium text-gray-700 mb-1'>
              {config.label} {config.required && <span className='text-red-500'>*</span>}
            </label>
            <select
              id={fieldKey}
              value={value}
              onChange={e => handleInputChange(fieldKey, e.target.value)}
              className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent'
              required={config.required}
            >
              <option value=''>Select Status</option>
              <option value='true'>Yes</option>
              <option value='false'>No</option>
            </select>
          </div>
        );
      }

      if (config.type === 'textarea') {
        return (
          <div key={fieldKey}>
            <label htmlFor={fieldKey} className='block text-sm font-medium text-gray-700 mb-1'>
              {config.label} {config.required && <span className='text-red-500'>*</span>}
            </label>
            <textarea
              id={fieldKey}
              value={value}
              onChange={e => handleInputChange(fieldKey, e.target.value)}
              placeholder={config.placeholder}
              rows={3}
              className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent'
              required={config.required}
            />
          </div>
        );
      }

      return (
        <div key={fieldKey}>
          <label htmlFor={fieldKey} className='block text-sm font-medium text-gray-700 mb-1'>
            {config.label} {config.required && <span className='text-red-500'>*</span>}
          </label>
          <input
            type={config.type}
            id={fieldKey}
            value={value}
            onChange={e => handleInputChange(fieldKey, e.target.value)}
            placeholder={config.placeholder}
            className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent'
            required={config.required}
          />
        </div>
      );
    },
    [formData, handleInputChange]
  );

  if (missingFields.length === 0) {
    return null;
  }

  return (
    <div className='bg-white rounded-lg shadow-md p-6'>
      <div className='mb-6'>
        <h2 className='text-2xl font-bold text-gray-900 mb-2'>Complete Your Profile</h2>
        <p className='text-gray-600'>
          Please provide the following information to continue with your booking.
        </p>
      </div>

      <form onSubmit={handleSubmit} className='space-y-4'>
        {missingFields.map(renderField)}

        <div className='flex justify-end space-x-4 pt-4'>
          {onCancel && (
            <button
              type='button'
              onClick={onCancel}
              disabled={isSubmitting}
              className='px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-colors'
            >
              Cancel
            </button>
          )}
          <button
            type='submit'
            disabled={isSubmitting}
            className='bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-semibold transition-colors'
          >
            {isSubmitting ? 'Updating...' : 'Continue'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default MissingInfoCollector;
