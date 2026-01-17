import { useMemo, useState } from 'react';

import type {
  Account,
  BookingType,
  CustomService,
  DiscountValidation,
  TimeSlot,
} from '../../services/types';
import { DiscountInput } from '../Booking';
import { ErrorMessage, LoadingSpinner } from '../Common';

interface PaymentFlowProps {
  /** Selected service (booking type or custom service) */
  selectedService: BookingType | CustomService;
  /** Service type */
  serviceType: 'booking-type' | 'custom-service';
  /** Selected time slot */
  selectedTimeSlot: TimeSlot;
  /** Current user account */
  account: Account;
  /** Applied discount validation */
  discountValidation?: DiscountValidation | null;
  /** Callback when discount is applied */
  onDiscountApplied: (validation: DiscountValidation) => void;
  /** Callback when discount is cleared */
  onDiscountCleared: () => void;
  /** Booking notes */
  notes: string;
  /** Callback when notes change */
  onNotesChange: (notes: string) => void;
  /** Callback when payment is confirmed */
  onConfirmPayment: () => Promise<void>;
  /** Whether payment is processing */
  processing?: boolean;
  /** Error message */
  error?: string | null;
  /** Whether the flow is disabled */
  disabled?: boolean;
}

/**
 * PaymentFlow component for seamless booking-to-payment integration.
 *
 * Displays booking summary, discount input, notes, and payment confirmation.
 * Provides a streamlined experience from service selection to payment completion.
 *
 *
 * @example
 * <PaymentFlow
 *   selectedService={selectedService}
 *   serviceType="booking-type"
 *   selectedTimeSlot={selectedTimeSlot}
 *   account={account}
 *   discountValidation={discountValidation}
 *   onDiscountApplied={handleDiscountApplied}
 *   onDiscountCleared={handleDiscountCleared}
 *   notes={notes}
 *   onNotesChange={setNotes}
 *   onConfirmPayment={handleConfirmPayment}
 * />
 */
function PaymentFlow({
  selectedService,
  serviceType,
  selectedTimeSlot,
  account,
  discountValidation,
  onDiscountApplied,
  onDiscountCleared,
  notes,
  onNotesChange,
  onConfirmPayment,
  processing = false,
  error = null,
  disabled = false,
}: PaymentFlowProps) {
  const [showFullSummary, setShowFullSummary] = useState(false);

  /**
   * Calculates the final price after discount.
   */
  const priceCalculation = useMemo(() => {
    // Inline the price calculation to help React Compiler
    const basePrice =
      'basePrice' in selectedService && typeof selectedService.basePrice === 'number'
        ? selectedService.basePrice
        : 0;
    const discountPercent = discountValidation?.amount ?? 0;
    const discountAmount = (basePrice * discountPercent) / 100;
    const finalPrice = basePrice - discountAmount;

    return {
      basePrice,
      discountPercent,
      discountAmount,
      finalPrice,
    };
  }, [selectedService, discountValidation]);

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onNotesChange(e.target.value);
  };

  const handleConfirmPayment = async () => {
    if (!disabled && !processing) {
      await onConfirmPayment();
    }
  };

  /**
   * Formats price for display.
   */
  const formatPrice = (price: number): string => {
    return `$${price.toFixed(2)}`;
  };

  /**
   * Formats date/time for display.
   */
  const formatDateTime = (dateTime: string): string => {
    const date = new Date(dateTime);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  /**
   * Gets service duration based on type.
   */
  function getServiceDuration(service: BookingType | CustomService): number {
    if ('duration' in service) {
      return service.duration;
    }
    return selectedTimeSlot.durationMin;
  }

  return (
    <div className='space-y-6'>
      {/* Compact Service Summary */}
      <div className='bg-gray-800 rounded-lg p-4'>
        <div className='flex items-center justify-between'>
          <div className='flex-1'>
            <h3 className='font-semibold text-white'>{selectedService.name}</h3>
            <p className='text-sm text-gray-400'>
              {formatDateTime(selectedTimeSlot.dateTime)} • {getServiceDuration(selectedService)}{' '}
              min
            </p>
          </div>
          <div className='text-right'>
            <div className='text-lg font-bold text-orange-500'>
              {formatPrice(priceCalculation.finalPrice)}
            </div>
            {priceCalculation.discountPercent > 0 && (
              <div className='text-sm text-gray-400 line-through'>
                {formatPrice(priceCalculation.basePrice)}
              </div>
            )}
          </div>
          <button
            type='button'
            onClick={() => setShowFullSummary(!showFullSummary)}
            className='ml-4 text-orange-500 hover:text-orange-400 transition-colors'
            aria-label={showFullSummary ? 'Hide details' : 'Show details'}
          >
            <svg
              className={`w-5 h-5 transition-transform ${showFullSummary ? 'rotate-180' : ''}`}
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M19 9l-7 7-7-7'
              />
            </svg>
          </button>
        </div>

        {/* Expanded Summary */}
        {showFullSummary && (
          <div className='mt-4 pt-4 border-t border-gray-700 space-y-3'>
            {selectedService.description && (
              <div>
                <p className='text-sm text-gray-400'>Description</p>
                <p className='text-white'>{selectedService.description}</p>
              </div>
            )}

            <div className='grid grid-cols-2 gap-4 text-sm'>
              <div>
                <p className='text-gray-400'>Duration</p>
                <p className='text-white'>{getServiceDuration(selectedService)} minutes</p>
              </div>
              <div>
                <p className='text-gray-400'>Service Type</p>
                <p className='text-white'>
                  {serviceType === 'custom-service' ? 'Custom Service' : 'Standard Service'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && <ErrorMessage message={error} />}

      {/* Discount Section */}
      <div className='bg-gray-800 rounded-lg p-6'>
        <h4 className='text-lg font-semibold text-white mb-4'>Discount Code</h4>
        <DiscountInput
          onDiscountApplied={onDiscountApplied}
          onDiscountCleared={onDiscountCleared}
          basePrice={priceCalculation.basePrice}
          disabled={disabled || processing}
        />
      </div>

      {/* Notes Section */}
      <div className='bg-gray-800 rounded-lg p-6'>
        <h4 className='text-lg font-semibold text-white mb-4'>Additional Notes</h4>
        <textarea
          value={notes}
          onChange={handleNotesChange}
          placeholder='Any special requests or information for your coach...'
          disabled={disabled || processing}
          className='w-full px-4 py-3 rounded-lg bg-gray-700 text-white placeholder-gray-400 border-2 border-transparent focus:border-orange-500 focus:outline-none resize-none disabled:opacity-60 disabled:cursor-not-allowed'
          rows={3}
        />
      </div>

      {/* Payment Summary */}
      <div className='bg-gray-800 rounded-lg p-6'>
        <h4 className='text-lg font-semibold text-white mb-4'>Payment Summary</h4>

        <div className='space-y-2 mb-6'>
          <div className='flex justify-between text-gray-400'>
            <span>Subtotal</span>
            <span>{formatPrice(priceCalculation.basePrice)}</span>
          </div>

          {priceCalculation.discountPercent > 0 && (
            <div className='flex justify-between text-green-400'>
              <span>Discount ({priceCalculation.discountPercent}%)</span>
              <span>-{formatPrice(priceCalculation.discountAmount)}</span>
            </div>
          )}

          <div className='flex justify-between text-white text-lg font-bold pt-2 border-t border-gray-700'>
            <span>Total</span>
            <span className='text-orange-500'>{formatPrice(priceCalculation.finalPrice)}</span>
          </div>
        </div>

        {/* Payment Method Info */}
        <div className='bg-gray-700 rounded-lg p-4 mb-6'>
          <div className='flex items-center gap-3'>
            <svg
              className='w-6 h-6 text-orange-500'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z'
              />
            </svg>
            <div>
              <p className='text-white font-medium'>Secure Payment</p>
              <p className='text-gray-400 text-sm'>Powered by PayPal • SSL Encrypted</p>
            </div>
          </div>
        </div>

        {/* Confirm Button */}
        <button
          onClick={handleConfirmPayment}
          disabled={disabled || processing}
          className='w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-4 rounded-lg font-semibold text-lg transition-colors'
        >
          {processing ? (
            <span className='flex items-center justify-center gap-2'>
              <LoadingSpinner size='sm' />
              Processing Payment...
            </span>
          ) : (
            `Confirm & Pay ${formatPrice(priceCalculation.finalPrice)}`
          )}
        </button>

        {/* User Info */}
        <p className='text-gray-400 text-sm text-center mt-4'>Booking as {account.email}</p>

        {/* Terms Notice */}
        <p className='text-gray-500 text-xs text-center mt-2'>
          By confirming your booking, you agree to our terms of service and cancellation policy.
        </p>
      </div>
    </div>
  );
}

export default PaymentFlow;
