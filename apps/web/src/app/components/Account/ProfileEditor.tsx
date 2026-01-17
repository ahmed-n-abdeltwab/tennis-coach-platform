import { FormEvent, useCallback, useState } from 'react';

import { useAuth } from '../../contexts/AuthContext';
import {
  ACCOUNT_ROLES,
  accountService,
  isAppError,
  type Account,
  type AccountUpdateRequest,
} from '../../services';

// ============================================================================
// Types
// ============================================================================

interface ProfileEditorProps {
  /** Current account data */
  account: Account;
  /** Callback when profile is successfully updated */
  onProfileUpdated?: (updatedAccount: Account) => void;
  /** Callback when update fails */
  onError?: (error: string) => void;
}

interface FormData {
  name: string;
  email: string;
  address: string;
  country: string;
  gender: 'male' | 'female' | 'other' | '';
  age: string;
  height: string;
  weight: string;
  // Coach-specific fields
  bio: string;
  credentials: string;
  philosophy: string;
  // Additional fields
  disability: boolean;
  disabilityCause: string;
  notes: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Converts Account to form data format
 */
function accountToFormData(account: Account): FormData {
  return {
    name: account.name || '',
    email: account.email || '',
    address: account.address || '',
    country: account.country || '',
    gender: account.gender || '',
    age: account.age?.toString() || '',
    height: account.height?.toString() || '',
    weight: account.weight?.toString() || '',
    bio: account.bio || '',
    credentials: account.credentials || '',
    philosophy: account.philosophy || '',
    disability: account.disability || false,
    disabilityCause: account.disabilityCause || '',
    notes: account.notes || '',
  };
}

/**
 * Converts form data to AccountUpdateRequest format
 */
function formDataToUpdateRequest(formData: FormData): AccountUpdateRequest {
  const updateData: AccountUpdateRequest = {
    name: formData.name || undefined,
    address: formData.address || undefined,
    country: formData.country || undefined,
    gender: formData.gender || undefined,
    age: formData.age ? parseInt(formData.age, 10) : undefined,
    height: formData.height ? parseInt(formData.height, 10) : undefined,
    weight: formData.weight ? parseInt(formData.weight, 10) : undefined,
    bio: formData.bio || undefined,
    credentials: formData.credentials || undefined,
    philosophy: formData.philosophy || undefined,
    disability: formData.disability,
    disabilityCause: formData.disabilityCause || undefined,
    notes: formData.notes || undefined,
  };

  // Remove undefined values
  return Object.fromEntries(
    Object.entries(updateData).filter(([, value]) => value !== undefined)
  ) as AccountUpdateRequest;
}

// ============================================================================
// ProfileEditor Component
// ============================================================================

function ProfileEditor({ account, onProfileUpdated, onError }: ProfileEditorProps) {
  const { account: currentAccount } = useAuth();
  const [formData, setFormData] = useState<FormData>(() => accountToFormData(account));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Determine if coach-specific fields should be shown
  const showCoachFields =
    currentAccount?.role === ACCOUNT_ROLES.COACH || currentAccount?.role === ACCOUNT_ROLES.ADMIN;

  /**
   * Handles form field changes
   */
  const handleInputChange = useCallback((field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setSuccessMessage(null); // Clear success message on edit
  }, []);

  /**
   * Handles form submission
   */
  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      setSuccessMessage(null);

      try {
        const updateRequest = formDataToUpdateRequest(formData);
        const updatedAccount = await accountService.updateAccount(account.id, updateRequest);

        setSuccessMessage('Profile updated successfully!');
        onProfileUpdated?.(updatedAccount);
      } catch (error: unknown) {
        const errorMessage = isAppError(error) ? error.message : 'Failed to update profile';
        onError?.(errorMessage);
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, account.id, onProfileUpdated, onError]
  );

  return (
    <div className='bg-white rounded-lg shadow-md p-6'>
      <h2 className='text-2xl font-bold text-gray-900 mb-6'>Edit Profile</h2>

      {successMessage && (
        <div className='mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded'>
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className='space-y-6'>
        {/* Basic Information Section */}
        <div>
          <h3 className='text-lg font-semibold text-gray-900 mb-4'>Basic Information</h3>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div>
              <label htmlFor='name' className='block text-sm font-medium text-gray-700 mb-1'>
                Full Name *
              </label>
              <input
                type='text'
                id='name'
                value={formData.name}
                onChange={e => handleInputChange('name', e.target.value)}
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent'
                required
              />
            </div>

            <div>
              <label htmlFor='email' className='block text-sm font-medium text-gray-700 mb-1'>
                Email Address
              </label>
              <input
                type='email'
                id='email'
                value={formData.email}
                className='w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed'
                disabled
                title='Email cannot be changed'
              />
            </div>

            <div>
              <label htmlFor='age' className='block text-sm font-medium text-gray-700 mb-1'>
                Age
              </label>
              <input
                type='number'
                id='age'
                value={formData.age}
                onChange={e => handleInputChange('age', e.target.value)}
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent'
                min='1'
                max='120'
              />
            </div>

            <div>
              <label htmlFor='gender' className='block text-sm font-medium text-gray-700 mb-1'>
                Gender
              </label>
              <select
                id='gender'
                value={formData.gender}
                onChange={e => handleInputChange('gender', e.target.value)}
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent'
              >
                <option value=''>Select Gender</option>
                <option value='male'>Male</option>
                <option value='female'>Female</option>
                <option value='other'>Other</option>
              </select>
            </div>

            <div>
              <label htmlFor='height' className='block text-sm font-mm text-gray-700 mb-1'>
                Height (cm)
              </label>
              <input
                type='number'
                id='height'
                value={formData.height}
                onChange={e => handleInputChange('height', e.target.value)}
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent'
                min='1'
                max='300'
              />
            </div>

            <div>
              <label htmlFor='weight' className='block text-sm font-medium text-gray-700 mb-1'>
                Weight (kg)
              </label>
              <input
                type='number'
                id='weight'
                value={formData.weight}
                onChange={e => handleInputChange('weight', e.target.value)}
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent'
                min='1'
                max='500'
              />
            </div>
          </div>
        </div>

        {/* Address Information Section */}
        <div>
          <h3 className='text-lg font-semibold text-gray-900 mb-4'>Address Information</h3>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='md:col-span-2'>
              <label htmlFor='address' className='block text-sm font-medium text-gray-700 mb-1'>
                Street Address
              </label>
              <input
                type='text'
                id='address'
                value={formData.address}
                onChange={e => handleInputChange('address', e.target.value)}
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent'
              />
            </div>

            <div>
              <label htmlFor='country' className='block text-sm font-medium text-gray-700 mb-1'>
                Country
              </label>
              <input
                type='text'
                id='country'
                value={formData.country}
                onChange={e => handleInputChange('country', e.target.value)}
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent'
              />
            </div>
          </div>
        </div>

        {/* Health Information Section */}
        <div>
          <h3 className='text-lg font-semibold text-gray-900 mb-4'>Health Information</h3>
          <div className='space-y-4'>
            <div className='flex items-center'>
              <input
                type='checkbox'
                id='disability'
                checked={formData.disability}
                onChange={e => handleInputChange('disability', e.target.checked)}
                className='h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded'
              />
              <label htmlFor='disability' className='ml-2 block text-sm text-gray-900'>
                I have a disability that may affect my training
              </label>
            </div>

            {formData.disability && (
              <div>
                <label
                  htmlFor='disabilityCause'
                  className='block text-sm font-medium text-gray-700 mb-1'
                >
                  Please describe your disability or condition
                </label>
                <textarea
                  id='disabilityCause'
                  value={formData.disabilityCause}
                  onChange={e => handleInputChange('disabilityCause', e.target.value)}
                  rows={3}
                  className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent'
                  placeholder='Please provide details about your condition so we can better assist you...'
                />
              </div>
            )}

            <div>
              <label htmlFor='notes' className='block text-sm font-medium text-gray-700 mb-1'>
                Additional Notes
              </label>
              <textarea
                id='notes'
                value={formData.notes}
                onChange={e => handleInputChange('notes', e.target.value)}
                rows={3}
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent'
                placeholder="Any additional information you'd like to share..."
              />
            </div>
          </div>
        </div>

        {/* Coach-Specific Fields */}
        {showCoachFields && (
          <div>
            <h3 className='text-lg font-semibold text-gray-900 mb-4'>Professional Information</h3>
            <div className='space-y-4'>
              <div>
                <label htmlFor='bio' className='block text-sm font-medium text-gray-700 mb-1'>
                  Biography
                </label>
                <textarea
                  id='bio'
                  value={formData.bio}
                  onChange={e => handleInputChange('bio', e.target.value)}
                  rows={4}
                  className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent'
                  placeholder='Tell us about yourself and your coaching background...'
                />
              </div>

              <div>
                <label
                  htmlFor='credentials'
                  className='block text-sm font-medium text-gray-700 mb-1'
                >
                  Credentials & Certifications
                </label>
                <textarea
                  id='credentials'
                  value={formData.credentials}
                  onChange={e => handleInputChange('credentials', e.target.value)}
                  rows={3}
                  className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent'
                  placeholder='List your certifications, qualifications, and achievements...'
                />
              </div>

              <div>
                <label
                  htmlFor='philosophy'
                  className='block text-sm font-medium text-gray-700 mb-1'
                >
                  Coaching Philosophy
                </label>
                <textarea
                  id='philosophy'
                  value={formData.philosophy}
                  onChange={e => handleInputChange('philosophy', e.target.value)}
                  rows={3}
                  className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent'
                  placeholder='Describe your coaching approach and philosophy...'
                />
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className='flex justify-end'>
          <button
            type='submit'
            disabled={isSubmitting}
            className='bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-semibold transition-colors'
          >
            {isSubmitting ? 'Updating...' : 'Update Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ProfileEditor;
