import { isAppError } from '@services/error-handler';
import { FormEvent, useCallback, useState } from 'react';

import { accountService } from '../../services';

// ============================================================================
// Types
// ============================================================================

interface PasswordChangerProps {
  /** Callback when password is successfully changed */
  onPasswordChanged?: () => void;
  /** Callback when password change fails */
  onError?: (error: string) => void;
}

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface PasswordValidation {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
  passwordsMatch: boolean;
}

// ============================================================================
// Password Validation
// ============================================================================

/**
 * Validates password strength requirements
 */
function validatePassword(password: string, confirmPassword: string): PasswordValidation {
  return {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    passwordsMatch: password === confirmPassword && password.length > 0,
  };
}

/**
 * Checks if password meets all requirements
 */
function isPasswordValid(validation: PasswordValidation): boolean {
  return Object.values(validation).every(Boolean);
}

// ============================================================================
// PasswordChanger Component
// ============================================================================

function PasswordChanger({ onPasswordChanged, onError }: PasswordChangerProps) {
  const [formData, setFormData] = useState<PasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // Calculate password validation
  const validation = validatePassword(formData.newPassword, formData.confirmPassword);
  const isFormValid = formData.currentPassword.length > 0 && isPasswordValid(validation);

  /**
   * Handles form field changes
   */
  const handleInputChange = useCallback((field: keyof PasswordFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setSuccessMessage(null); // Clear success message on edit
  }, []);

  /**
   * Toggles password visibility
   */
  const togglePasswordVisibility = useCallback((field: keyof typeof showPasswords) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  }, []);

  /**
   * Handles form submission
   */
  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();

      if (!isFormValid) {
        onError?.('Please ensure all password requirements are met');
        return;
      }

      setIsSubmitting(true);
      setSuccessMessage(null);

      try {
        // Call the password change API
        await accountService.changePassword({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        });

        setSuccessMessage('Password changed successfully!');
        setFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        onPasswordChanged?.();
      } catch (error: unknown) {
        const errorMessage = isAppError(error) ? error.message : 'Failed to change password';
        onError?.(errorMessage);
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, isFormValid, onPasswordChanged, onError]
  );

  return (
    <div className='bg-white rounded-lg shadow-md p-6'>
      <h2 className='text-2xl font-bold text-gray-900 mb-6'>Change Password</h2>

      {successMessage && (
        <div className='mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded'>
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className='space-y-6'>
        {/* Current Password */}
        <div>
          <label htmlFor='currentPassword' className='block text-sm font-medium text-gray-700 mb-1'>
            Current Password *
          </label>
          <div className='relative'>
            <input
              type={showPasswords.current ? 'text' : 'password'}
              id='currentPassword'
              value={formData.currentPassword}
              onChange={e => handleInputChange('currentPassword', e.target.value)}
              className='w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent'
              required
            />
            <button
              type='button'
              onClick={() => togglePasswordVisibility('current')}
              className='absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600'
            >
              {showPasswords.current ? (
                <svg className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21'
                  />
                </svg>
              ) : (
                <svg className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M15 12a3 3 0 11-6 0 3 3 0 016 0z'
                  />
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* New Password */}
        <div>
          <label htmlFor='newPassword' className='block text-sm font-medium text-gray-700 mb-1'>
            New Password *
          </label>
          <div className='relative'>
            <input
              type={showPasswords.new ? 'text' : 'password'}
              id='newPassword'
              value={formData.newPassword}
              onChange={e => handleInputChange('newPassword', e.target.value)}
              className='w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent'
              required
            />
            <button
              type='button'
              onClick={() => togglePasswordVisibility('new')}
              className='absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600'
            >
              {showPasswords.new ? (
                <svg className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21'
                  />
                </svg>
              ) : (
                <svg className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M15 12a3 3 0 11-6 0 3 3 0 016 0z'
                  />
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor='confirmPassword' className='block text-sm font-medium text-gray-700 mb-1'>
            Confirm New Password *
          </label>
          <div className='relative'>
            <input
              type={showPasswords.confirm ? 'text' : 'password'}
              id='confirmPassword'
              value={formData.confirmPassword}
              onChange={e => handleInputChange('confirmPassword', e.target.value)}
              className='w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent'
              required
            />
            <button
              type='button'
              onClick={() => togglePasswordVisibility('confirm')}
              className='absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600'
            >
              {showPasswords.confirm ? (
                <svg className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21'
                  />
                </svg>
              ) : (
                <svg className='h-5 w-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M15 12a3 3 0 11-6 0 3 3 0 016 0z'
                  />
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Password Requirements */}
        {formData.newPassword && (
          <div className='bg-gray-50 p-4 rounded-md'>
            <h4 className='text-sm font-medium text-gray-900 mb-2'>Password Requirements:</h4>
            <ul className='space-y-1 text-sm'>
              <li
                className={`flex items-center ${validation.minLength ? 'text-green-600' : 'text-red-600'}`}
              >
                <span className='mr-2'>{validation.minLength ? '✓' : '✗'}</span>
                At least 8 characters long
              </li>
              <li
                className={`flex items-center ${validation.hasUppercase ? 'text-green-600' : 'text-red-600'}`}
              >
                <span className='mr-2'>{validation.hasUppercase ? '✓' : '✗'}</span>
                Contains uppercase letter
              </li>
              <li
                className={`flex items-center ${validation.hasLowercase ? 'text-green-600' : 'text-red-600'}`}
              >
                <span className='mr-2'>{validation.hasLowercase ? '✓' : '✗'}</span>
                Contains lowercase letter
              </li>
              <li
                className={`flex items-center ${validation.hasNumber ? 'text-green-600' : 'text-red-600'}`}
              >
                <span className='mr-2'>{validation.hasNumber ? '✓' : '✗'}</span>
                Contains number
              </li>
              <li
                className={`flex items-center ${validation.hasSpecialChar ? 'text-green-600' : 'text-red-600'}`}
              >
                <span className='mr-2'>{validation.hasSpecialChar ? '✓' : '✗'}</span>
                Contains special character
              </li>
              {formData.confirmPassword && (
                <li
                  className={`flex items-center ${validation.passwordsMatch ? 'text-green-600' : 'text-red-600'}`}
                >
                  <span className='mr-2'>{validation.passwordsMatch ? '✓' : '✗'}</span>
                  Passwords match
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Submit Button */}
        <div className='flex justify-end'>
          <button
            type='submit'
            disabled={isSubmitting || !isFormValid}
            className='bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-semibold transition-colors'
          >
            {isSubmitting ? 'Changing Password...' : 'Change Password'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default PasswordChanger;
