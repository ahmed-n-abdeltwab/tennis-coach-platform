import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { BookingTypeCard, DiscountInput, TimeSlotPicker } from '../../components/Booking';
import { ErrorMessage, LoadingSpinner } from '../../components/Common';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { bookingService } from '../../services/booking.service';
import { isAppError } from '../../services/error-handler';
import { sessionService } from '../../services/session.service';
import { timeSlotService } from '../../services/timeslot.service';
import type { BookingType, DiscountValidation, TimeSlot } from '../../services/types';

type BookingStep = 'select-type' | 'select-slot' | 'confirm';

interface BookingState {
  step: BookingStep;
  selectedBookingType: BookingType | null;
  selectedTimeSlot: TimeSlot | null;
  discountValidation: DiscountValidation | null;
  notes: string;
}

const Book: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { account } = useAuth();
  const { addNotification } = useNotification();

  // URL parameters
  const bookingTypeIdParam = searchParams.get('bookingTypeId');
  const coachIdParam = searchParams.get('coachId');

  // Booking state
  const [bookingState, setBookingState] = useState<BookingState>({
    step: 'select-type',
    selectedBookingType: null,
    selectedTimeSlot: null,
    discountValidation: null,
    notes: '',
  });

  // Data loading states
  const [bookingTypes, setBookingTypes] = useState<BookingType[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loadingBookingTypes, setLoadingBookingTypes] = useState(true);
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetches booking types on mount.
   * If coachId is provided, fetches only that coach's booking types.
   */
  useEffect(() => {
    const fetchBookingTypes = async () => {
      setLoadingBookingTypes(true);
      setError(null);

      try {
        let types: BookingType[];
        if (coachIdParam) {
          types = await bookingService.getBookingTypesByCoach(coachIdParam);
        } else {
          types = await bookingService.getBookingTypes();
        }
        setBookingTypes(types);

        // If bookingTypeId is provided in URL, pre-select it
        if (bookingTypeIdParam) {
          const preselectedType = types.find(t => t.id === bookingTypeIdParam);
          if (preselectedType) {
            setBookingState(prev => ({
              ...prev,
              selectedBookingType: preselectedType,
              step: 'select-slot',
            }));
          }
        }
      } catch (err) {
        const message = isAppError(err) ? err.message : 'Failed to load booking types';
        setError(message);
        addNotification('error', message);
      } finally {
        setLoadingBookingTypes(false);
      }
    };

    fetchBookingTypes();
  }, [bookingTypeIdParam, coachIdParam, addNotification]);

  /**
   * Fetches time slots when a booking type is selected.
   */
  useEffect(() => {
    const fetchTimeSlots = async () => {
      if (!bookingState.selectedBookingType) {
        setTimeSlots([]);
        return;
      }

      setLoadingTimeSlots(true);
      setError(null);

      try {
        const coachId = bookingState.selectedBookingType.coachId;
        const slots = await timeSlotService.getTimeSlotsByCoach(coachId);
        setTimeSlots(slots);
      } catch (err) {
        const message = isAppError(err) ? err.message : 'Failed to load available time slots';
        setError(message);
        addNotification('error', message);
      } finally {
        setLoadingTimeSlots(false);
      }
    };

    fetchTimeSlots();
  }, [bookingState.selectedBookingType, addNotification]);

  /**
   * Handles booking type selection.
   */
  const handleBookingTypeSelect = useCallback((bookingType: BookingType) => {
    setBookingState(prev => ({
      ...prev,
      selectedBookingType: bookingType,
      selectedTimeSlot: null, // Reset time slot when booking type changes
      step: 'select-slot',
    }));
  }, []);

  /**
   * Handles time slot selection.
   */
  const handleTimeSlotSelect = useCallback((timeSlot: TimeSlot) => {
    setBookingState(prev => ({
      ...prev,
      selectedTimeSlot: timeSlot,
      step: 'confirm',
    }));
  }, []);

  /**
   * Handles discount application.
   */
  const handleDiscountApplied = useCallback((validation: DiscountValidation) => {
    setBookingState(prev => ({
      ...prev,
      discountValidation: validation,
    }));
  }, []);

  /**
   * Handles discount clearing.
   */
  const handleDiscountCleared = useCallback(() => {
    setBookingState(prev => ({
      ...prev,
      discountValidation: null,
    }));
  }, []);

  /**
   * Handles notes change.
   */
  const handleNotesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBookingState(prev => ({
      ...prev,
      notes: e.target.value,
    }));
  }, []);

  /**
   * Navigates back to previous step.
   */
  const handleBack = useCallback(() => {
    setBookingState(prev => {
      if (prev.step === 'confirm') {
        return { ...prev, step: 'select-slot' };
      }
      if (prev.step === 'select-slot') {
        return {
          ...prev,
          step: 'select-type',
          selectedBookingType: null,
          selectedTimeSlot: null,
        };
      }
      return prev;
    });
  }, []);

  /**
   * Submits the booking.
   */
  const handleConfirmBooking = useCallback(async () => {
    if (!bookingState.selectedBookingType || !bookingState.selectedTimeSlot) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await sessionService.createSession({
        bookingTypeId: bookingState.selectedBookingType.id,
        timeSlotId: bookingState.selectedTimeSlot.id,
        discountCode: bookingState.discountValidation?.code,
        notes: bookingState.notes || undefined,
      });

      addNotification('success', 'Session booked successfully!');
      navigate('/dashboard');
    } catch (err) {
      const message = isAppError(err) ? err.message : 'Failed to book session';
      setError(message);
      addNotification('error', message);
    } finally {
      setSubmitting(false);
    }
  }, [bookingState, addNotification, navigate]);

  /**
   * Calculates the final price after discount.
   */
  const priceCalculation = useMemo(() => {
    const basePrice = bookingState.selectedBookingType?.basePrice ?? 0;
    const discountPercent = bookingState.discountValidation?.amount ?? 0;
    const discountAmount = (basePrice * discountPercent) / 100;
    const finalPrice = basePrice - discountAmount;

    return {
      basePrice,
      discountPercent,
      discountAmount,
      finalPrice,
    };
  }, [bookingState.selectedBookingType?.basePrice, bookingState.discountValidation?.amount]);

  /**
   * Formats price for display.
   */
  const formatPrice = (price: number): string => {
    return `${price.toFixed(2)}`;
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

  // Loading state
  if (loadingBookingTypes) {
    return (
      <div className='container mx-auto px-4 py-8'>
        <LoadingSpinner fullScreen message='Loading booking options...' />
      </div>
    );
  }

  // Error state with no data
  if (error && bookingTypes.length === 0) {
    return (
      <div className='container mx-auto px-4 py-8'>
        <h1 className='text-3xl font-bold mb-6 text-white'>Book a Session</h1>
        <ErrorMessage
          variant='card'
          title='Unable to Load Booking Options'
          message={error}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className='container mx-auto px-4 py-8'>
      <h1 className='text-3xl font-bold mb-6 text-white'>Book a Session</h1>

      {/* Progress Indicator */}
      <div className='mb-8'>
        <div className='flex items-center justify-center space-x-4'>
          <StepIndicator
            step={1}
            label='Select Service'
            isActive={bookingState.step === 'select-type'}
            isCompleted={bookingState.step !== 'select-type'}
          />
          <div className='w-12 h-0.5 bg-gray-600' />
          <StepIndicator
            step={2}
            label='Choose Time'
            isActive={bookingState.step === 'select-slot'}
            isCompleted={bookingState.step === 'confirm'}
          />
          <div className='w-12 h-0.5 bg-gray-600' />
          <StepIndicator
            step={3}
            label='Confirm'
            isActive={bookingState.step === 'confirm'}
            isCompleted={false}
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className='mb-6'>
          <ErrorMessage message={error} />
        </div>
      )}

      {/* Step 1: Select Booking Type */}
      {bookingState.step === 'select-type' && (
        <div>
          <h2 className='text-xl font-semibold mb-4 text-white'>
            {coachIdParam ? 'Select a Service' : 'Select a Service'}
          </h2>
          {bookingTypes.length === 0 ? (
            <div className='text-center py-8 bg-gray-800 rounded-lg'>
              <p className='text-gray-400'>No booking types available</p>
            </div>
          ) : (
            <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
              {bookingTypes.map(bookingType => (
                <BookingTypeCard
                  key={bookingType.id}
                  bookingType={bookingType}
                  isSelected={bookingState.selectedBookingType?.id === bookingType.id}
                  onSelect={handleBookingTypeSelect}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Select Time Slot */}
      {bookingState.step === 'select-slot' && (
        <div>
          <div className='flex items-center justify-between mb-4'>
            <h2 className='text-xl font-semibold text-white'>Choose a Time</h2>
            <button
              onClick={handleBack}
              className='text-orange-500 hover:text-orange-400 font-medium'
            >
              ← Change Service
            </button>
          </div>

          {/* Selected Booking Type Summary */}
          {bookingState.selectedBookingType && (
            <div className='bg-gray-800 rounded-lg p-4 mb-6'>
              <div className='flex justify-between items-center'>
                <div>
                  <h3 className='font-semibold text-white'>
                    {bookingState.selectedBookingType.name}
                  </h3>
                  {bookingState.selectedBookingType.description && (
                    <p className='text-gray-400 text-sm'>
                      {bookingState.selectedBookingType.description}
                    </p>
                  )}
                </div>
                <span className='text-orange-500 font-bold'>
                  {formatPrice(bookingState.selectedBookingType.basePrice ?? 0)}
                </span>
              </div>
            </div>
          )}

          {loadingTimeSlots ? (
            <LoadingSpinner message='Loading available times...' />
          ) : (
            <TimeSlotPicker
              timeSlots={timeSlots}
              selectedSlot={bookingState.selectedTimeSlot}
              onSelect={handleTimeSlotSelect}
            />
          )}
        </div>
      )}

      {/* Step 3: Confirm Booking */}
      {bookingState.step === 'confirm' && (
        <div>
          <div className='flex items-center justify-between mb-4'>
            <h2 className='text-xl font-semibold text-white'>Confirm Your Booking</h2>
            <button
              onClick={handleBack}
              className='text-orange-500 hover:text-orange-400 font-medium'
            >
              ← Change Time
            </button>
          </div>

          <div className='grid gap-6 lg:grid-cols-2'>
            {/* Booking Summary */}
            <div className='bg-gray-800 rounded-lg p-6'>
              <h3 className='text-lg font-semibold text-white mb-4'>Booking Summary</h3>

              <div className='space-y-4'>
                {/* Service */}
                <div>
                  <p className='text-gray-400 text-sm'>Service</p>
                  <p className='text-white font-medium'>{bookingState.selectedBookingType?.name}</p>
                </div>

                {/* Date & Time */}
                {bookingState.selectedTimeSlot && (
                  <div>
                    <p className='text-gray-400 text-sm'>Date & Time</p>
                    <p className='text-white font-medium'>
                      {formatDateTime(bookingState.selectedTimeSlot.dateTime)}
                    </p>
                    <p className='text-gray-400 text-sm'>
                      Duration: {bookingState.selectedTimeSlot.durationMin} minutes
                    </p>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label htmlFor='notes' className='text-gray-400 text-sm block mb-2'>
                    Notes (optional)
                  </label>
                  <textarea
                    id='notes'
                    value={bookingState.notes}
                    onChange={handleNotesChange}
                    placeholder='Any special requests or information for your coach...'
                    className='w-full px-4 py-3 rounded-lg bg-gray-700 text-white placeholder-gray-400 border-2 border-transparent focus:border-orange-500 focus:outline-none resize-none'
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Payment Summary */}
            <div className='bg-gray-800 rounded-lg p-6'>
              <h3 className='text-lg font-semibold text-white mb-4'>Payment Summary</h3>

              {/* Discount Code Input */}
              <div className='mb-6'>
                <p className='text-gray-400 text-sm mb-2'>Have a discount code?</p>
                <DiscountInput
                  onDiscountApplied={handleDiscountApplied}
                  onDiscountCleared={handleDiscountCleared}
                  basePrice={priceCalculation.basePrice}
                  disabled={submitting}
                />
              </div>

              {/* Price Breakdown */}
              <div className='border-t border-gray-700 pt-4 space-y-2'>
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
                  <span className='text-orange-500'>
                    {formatPrice(priceCalculation.finalPrice)}
                  </span>
                </div>
              </div>

              {/* Confirm Button */}
              <button
                onClick={handleConfirmBooking}
                disabled={submitting}
                className='w-full mt-6 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-4 rounded-lg font-semibold text-lg transition-colors'
              >
                {submitting ? (
                  <span className='flex items-center justify-center gap-2'>
                    <svg
                      className='animate-spin h-5 w-5'
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
                    Booking...
                  </span>
                ) : (
                  'Confirm Booking'
                )}
              </button>

              {/* User Info */}
              {account && (
                <p className='text-gray-400 text-sm text-center mt-4'>Booking as {account.email}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Step indicator component for the booking progress.
 */
interface StepIndicatorProps {
  step: number;
  label: string;
  isActive: boolean;
  isCompleted: boolean;
}

function StepIndicator({ step, label, isActive, isCompleted }: StepIndicatorProps) {
  const circleClasses = isCompleted
    ? 'bg-orange-500 text-white'
    : isActive
      ? 'bg-orange-500 text-white'
      : 'bg-gray-700 text-gray-400';

  const labelClasses = isActive || isCompleted ? 'text-white' : 'text-gray-400';

  return (
    <div className='flex flex-col items-center'>
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${circleClasses}`}
      >
        {isCompleted ? (
          <svg
            className='w-5 h-5'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
            aria-hidden='true'
          >
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
          </svg>
        ) : (
          step
        )}
      </div>
      <span className={`text-sm mt-2 ${labelClasses}`}>{label}</span>
    </div>
  );
}

export default Book;
