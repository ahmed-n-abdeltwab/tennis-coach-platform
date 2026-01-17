import { useState } from 'react';

import { discountService } from '../../services/discount.service';
import type { DiscountValidation } from '../../services/types';

interface DiscountInputProps {
  /** Callback when a valid discount is applied */
  onDiscountApplied: (validation: DiscountValidation) => void;
  /** Callback when discount is cleared/removed */
  onDiscountCleared?: () => void;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Base price to show discount calculation (optional) */
  basePrice?: number;
}

type ValidationState = 'idle' | 'validating' | 'valid' | 'invalid';

/**
 * Component for entering and validating discount codes.
 *
 * Provides an input field with a validate button that calls the discount
 * validation API. Shows validation result with discount amount or error message.
 *
 *
 * @example
 * // Basic usage
 * <DiscountInput
 *   onDiscountApplied={(validation) => setAppliedDiscount(validation)}
 *   onDiscountCleared={() => setAppliedDiscount(null)}
 * />
 *
 * @example
 * // With base price to show savings
 * <DiscountInput
 *   onDiscountApplied={handleDiscountApplied}
 *   onDiscountCleared={handleDiscountCleared}
 *   basePrice={75.00}
 * />
 */
function DiscountInput({
  onDiscountApplied,
  onDiscountCleared,
  disabled = false,
  basePrice,
}: DiscountInputProps) {
  const [code, setCode] = useState('');
  const [validationState, setValidationState] = useState<ValidationState>('idle');
  const [validation, setValidation] = useState<DiscountValidation | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /**
   * Handles discount code validation.
   */
  const handleValidate = async () => {
    const trimmedCode = code.trim().toUpperCase();

    if (!trimmedCode) {
      setErrorMessage('Please enter a discount code');
      return;
    }

    setValidationState('validating');
    setErrorMessage(null);

    try {
      const result = await discountService.validateDiscount(trimmedCode);

      if (result.isValid) {
        setValidationState('valid');
        setValidation(result);
        onDiscountApplied(result);
      } else {
        setValidationState('invalid');
        setErrorMessage('Invalid or expired discount code');
        setValidation(null);
      }
    } catch (error) {
      setValidationState('invalid');
      const message = error instanceof Error ? error.message : 'Failed to validate discount code';
      setErrorMessage(message);
      setValidation(null);
    }
  };

  /**
   * Handles clearing the applied discount.
   */
  const handleClear = () => {
    setCode('');
    setValidationState('idle');
    setValidation(null);
    setErrorMessage(null);
    onDiscountCleared?.();
  };

  /**
   * Handles input change.
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newCode = e.target.value.toUpperCase();
    setCode(newCode);

    // Reset validation state when code changes
    if (validationState !== 'idle' && validationState !== 'validating') {
      setValidationState('idle');
      setValidation(null);
      setErrorMessage(null);
    }
  };

  /**
   * Handles form submission (Enter key).
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!disabled && validationState !== 'validating') {
      handleValidate();
    }
  };

  /**
   * Calculates the discount amount based on base price.
   */
  const calculateSavings = (): string | null => {
    if (!basePrice || !validation?.amount) {
      return null;
    }
    const savings = (basePrice * validation.amount) / 100;
    return `$${savings.toFixed(2)}`;
  };

  const isValidating = validationState === 'validating';
  const isValid = validationState === 'valid';
  const isInvalid = validationState === 'invalid';

  return (
    <div className='space-y-3'>
      <form onSubmit={handleSubmit} className='flex gap-2'>
        <div className='relative flex-1'>
          <input
            type='text'
            value={code}
            onChange={handleInputChange}
            placeholder='Enter discount code'
            disabled={disabled || isValidating || isValid}
            className={`
              w-full px-4 py-3 rounded-lg bg-gray-700 text-white placeholder-gray-400
              border-2 transition-colors
              focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-900
              ${isValid ? 'border-green-500 bg-green-500/10' : ''}
              ${isInvalid ? 'border-red-500' : 'border-transparent'}
              ${disabled || isValidating || isValid ? 'opacity-60 cursor-not-allowed' : ''}
            `}
            aria-label='Discount code'
            aria-describedby={errorMessage ? 'discount-error' : undefined}
            aria-invalid={isInvalid}
          />
          {isValid && (
            <div className='absolute right-3 top-1/2 -translate-y-1/2'>
              <svg
                className='w-5 h-5 text-green-500'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
                aria-hidden='true'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M5 13l4 4L19 7'
                />
              </svg>
            </div>
          )}
        </div>

        {isValid ? (
          <button
            type='button'
            onClick={handleClear}
            disabled={disabled}
            className='px-4 py-3 rounded-lg bg-gray-600 hover:bg-gray-500 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
          >
            Clear
          </button>
        ) : (
          <button
            type='submit'
            disabled={disabled || isValidating || !code.trim()}
            className={`
              px-6 py-3 rounded-lg font-medium transition-colors
              ${
                disabled || isValidating || !code.trim()
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-orange-500 hover:bg-orange-600 text-white'
              }
            `}
          >
            {isValidating ? (
              <span className='flex items-center gap-2'>
                <svg
                  className='animate-spin h-4 w-4'
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
                Validating
              </span>
            ) : (
              'Apply'
            )}
          </button>
        )}
      </form>

      {/* Error Message */}
      {errorMessage && (
        <div
          id='discount-error'
          className='flex items-center gap-2 text-red-400 text-sm'
          role='alert'
        >
          <svg
            className='w-4 h-4 shrink-0'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
            aria-hidden='true'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
            />
          </svg>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Success Message */}
      {isValid && validation && (
        <div className='bg-green-500/10 border border-green-500/30 rounded-lg p-4' role='status'>
          <div className='flex items-center gap-2 text-green-400'>
            <svg
              className='w-5 h-5 shrink-0'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
              aria-hidden='true'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
              />
            </svg>
            <span className='font-medium'>Discount applied!</span>
          </div>
          <div className='mt-2 text-sm text-gray-300'>
            <div className='flex justify-between'>
              <span>Code:</span>
              <span className='font-mono text-orange-400'>{validation.code}</span>
            </div>
            <div className='flex justify-between mt-1'>
              <span>Discount:</span>
              <span className='text-green-400 font-semibold'>{validation.amount}% off</span>
            </div>
            {calculateSavings() && (
              <div className='flex justify-between mt-1'>
                <span>You save:</span>
                <span className='text-green-400 font-semibold'>{calculateSavings()}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default DiscountInput;
