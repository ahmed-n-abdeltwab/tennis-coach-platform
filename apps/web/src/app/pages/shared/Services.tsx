import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { TimeSlotPicker } from '../../components/Booking';
import { ErrorMessage, LoadingSpinner } from '../../components/Common';
import { PaymentFlow, ProfileCompletion, ServiceSelector } from '../../components/Services';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { accountService } from '../../services/account.service';
import { bookingService } from '../../services/booking.service';
import { customServiceService } from '../../services/custom-service.service';
import { isAppError } from '../../services/error-handler';
import { sessionService } from '../../services/session.service';
import { timeSlotService } from '../../services/timeslot.service';
import type {
  Account,
  AuthAccount,
  BookingType,
  CustomService,
  DiscountValidation,
  TimeSlot,
} from '../../services/types';

type BookingStep = 'select-service' | 'select-time' | 'complete-profile' | 'payment';
type SelectedServiceType = 'booking-type' | 'custom-service';

/**
 * Profile fields required for booking completeness check.
 * These fields are supported by the backend API and needed for booking.
 * Note: Only includes fields that exist in the Account model and API endpoints.
 */
interface ProfileFields {
  name?: string;
  address?: string;
  country?: string;
}

/**
 * Checks which profile fields are missing for a complete booking profile.
 * Returns an array of field names that need to be completed.
 * Only checks fields that are supported by the backend API.
 */
function checkProfileCompleteness(account: Partial<ProfileFields>): string[] {
  const missingFields: string[] = [];

  if (!account.name) missingFields.push('name');
  if (!account.address) missingFields.push('address');
  if (!account.country) missingFields.push('country');

  return missingFields;
}

/**
 * Converts AuthAccount to Account format for components that need full Account interface.
 * This is a temporary workaround until we align the type interfaces.
 * AuthAccount only has id, email, and role, so we provide defaults for other fields.
 */
function authAccountToAccount(authAccount: AuthAccount): Account {
  return {
    ...authAccount,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    name: '',
    isActive: true,
    isOnline: false,
  } as Account;
}

interface BookingState {
  step: BookingStep;
  selectedService: BookingType | CustomService | null;
  selectedServiceType: SelectedServiceType | null;
  selectedTimeSlot: TimeSlot | null;
  discountValidation: DiscountValidation | null;
  notes: string;
  missingProfileFields: string[];
}

/**
 * Unified Services page component for seamless booking workflow.
 *
 * Combines service selection, time slot picking, profile completion, and payment
 * into a single streamlined experience. Supports both standard booking types
 * and custom services with pre-filled information from URL parameters.
 *
 *
 * @example
 * // Standard access
 * /services
 *
 * // With pre-selected booking type
 * /services?bookingTypeId=123
 *
 * // With pre-selected custom service
 * /services?customServiceId=456
 *
 * // With coach filter
 * /services?coachId=789
 */
function Services() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { account } = useAuth();
  const { addNotification } = useNotification();

  // URL parameters
  const bookingTypeIdParam = searchParams.get('bookingTypeId');
  const customServiceIdParam = searchParams.get('customServiceId');
  const coachIdParam = searchParams.get('coachId');

  // Booking state
  const [bookingState, setBookingState] = useState<BookingState>({
    step: 'select-service',
    selectedService: null,
    selectedServiceType: null,
    selectedTimeSlot: null,
    discountValidation: null,
    notes: '',
    missingProfileFields: [],
  });

  // Data loading states
  const [bookingTypes, setBookingTypes] = useState<BookingType[]>([]);
  const [customServices, setCustomServices] = useState<CustomService[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetches services (booking types and custom services) on mount.
   */
  useEffect(() => {
    const fetchServices = async () => {
      setLoadingServices(true);
      setError(null);

      try {
        const promises: Promise<any>[] = [];

        // Fetch booking types
        if (coachIdParam) {
          promises.push(bookingService.getBookingTypesByCoach(coachIdParam));
        } else {
          promises.push(bookingService.getBookingTypes());
        }

        // Fetch public custom services
        promises.push(customServiceService.getCustomServices({ isPublic: true }));

        const [bookingTypesData, customServicesData] = await Promise.all(promises);

        setBookingTypes(bookingTypesData);
        setCustomServices(customServicesData);

        // Handle pre-selection from URL parameters
        if (bookingTypeIdParam) {
          const preselectedBookingType = bookingTypesData.find(
            (bt: BookingType) => bt.id === bookingTypeIdParam
          );
          if (preselectedBookingType) {
            handleServiceSelect(preselectedBookingType, 'booking-type');
          }
        } else if (customServiceIdParam) {
          const preselectedCustomService = customServicesData.find(
            (cs: CustomService) => cs.id === customServiceIdParam
          );
          if (preselectedCustomService) {
            handleServiceSelect(preselectedCustomService, 'custom-service');
          }
        }
      } catch (err) {
        const message = isAppError(err) ? err.message : 'Failed to load services';
        setError(message);
        addNotification('error', message);
      } finally {
        setLoadingServices(false);
      }
    };

    fetchServices();
  }, [bookingTypeIdParam, customServiceIdParam, coachIdParam, addNotification]);

  /**
   * Fetches time slots when a service is selected.
   */
  useEffect(() => {
    const fetchTimeSlots = async () => {
      if (!bookingState.selectedService) {
        setTimeSlots([]);
        return;
      }

      setLoadingTimeSlots(true);
      setError(null);

      try {
        const coachId = getServiceCoachId(bookingState.selectedService);
        const slots = await timeSlotService.getTimeSlotsByCoach(coachId);
        setTimeSlots(slots);

        // Check if custom service has complete pre-filled booking details
        if (bookingState.selectedServiceType === 'custom-service') {
          const customService = bookingState.selectedService as CustomService;

          // If all required fields are pre-filled, skip directly to payment
          if (
            customService.prefilledBookingTypeId &&
            customService.prefilledTimeSlotId &&
            customService.prefilledDateTime
          ) {
            const prefilledSlot = slots.find(slot => slot.id === customService.prefilledTimeSlotId);
            if (prefilledSlot) {
              // Auto-select the time slot and proceed directly to payment
              await handleTimeSlotSelectWithDirectPayment(prefilledSlot);
              return;
            }
          } else if (customService.prefilledTimeSlotId) {
            // Partial pre-fill: only time slot is pre-filled
            const prefilledSlot = slots.find(slot => slot.id === customService.prefilledTimeSlotId);
            if (prefilledSlot) {
              handleTimeSlotSelect(prefilledSlot);
              return;
            }
          }
        }
      } catch (err) {
        const message = isAppError(err) ? err.message : 'Failed to load available time slots';
        setError(message);
        addNotification('error', message);
      } finally {
        setLoadingTimeSlots(false);
      }
    };

    fetchTimeSlots();
  }, [bookingState.selectedService, bookingState.selectedServiceType, addNotification]);

  /**
   * Handles service selection and moves to time slot selection.
   */
  const handleServiceSelect = useCallback(
    (service: BookingType | CustomService, type: SelectedServiceType) => {
      setBookingState(prev => ({
        ...prev,
        selectedService: service,
        selectedServiceType: type,
        selectedTimeSlot: null,
        step: 'select-time',
      }));
    },
    []
  );

  /**
   * Handles time slot selection and checks profile completeness.
   */
  const handleTimeSlotSelect = useCallback(
    async (timeSlot: TimeSlot) => {
      if (!account) return;

      setBookingState(prev => ({
        ...prev,
        selectedTimeSlot: timeSlot,
      }));

      // Check profile completeness - cast to ProfileFields since AuthAccount doesn't have all fields
      const missingFields = checkProfileCompleteness(account as Partial<ProfileFields>);

      if (missingFields.length > 0) {
        setBookingState(prev => ({
          ...prev,
          step: 'complete-profile',
          missingProfileFields: missingFields,
        }));
      } else {
        setBookingState(prev => ({
          ...prev,
          step: 'payment',
        }));
      }
    },
    [account]
  );

  /**
   * Handles time slot selection for complete custom services and skips directly to payment.
   * This is used when a custom service has all required booking details pre-filled.
   *
   */
  const handleTimeSlotSelectWithDirectPayment = useCallback(
    async (timeSlot: TimeSlot) => {
      if (!account) return;

      setBookingState(prev => ({
        ...prev,
        selectedTimeSlot: timeSlot,
      }));

      // Check profile completeness - cast to ProfileFields since AuthAccount doesn't have all fields
      const missingFields = checkProfileCompleteness(account as Partial<ProfileFields>);

      if (missingFields.length > 0) {
        // Even with complete booking details, we still need complete profile
        setBookingState(prev => ({
          ...prev,
          step: 'complete-profile',
          missingProfileFields: missingFields,
        }));
      } else {
        // Skip directly to payment since all booking details are pre-filled
        setBookingState(prev => ({
          ...prev,
          step: 'payment',
        }));
      }
    },
    [account]
  );

  /**
   * Handles profile update and proceeds to payment.
   */
  const handleProfileUpdate = useCallback(
    async (updates: Partial<Account>) => {
      if (!account) return;

      setUpdatingProfile(true);
      setError(null);

      try {
        await accountService.updateAccount(account.id, updates);
        addNotification('success', 'Profile updated successfully');

        setBookingState(prev => ({
          ...prev,
          step: 'payment',
          missingProfileFields: [],
        }));
      } catch (err) {
        const message = isAppError(err) ? err.message : 'Failed to update profile';
        setError(message);
        addNotification('error', message);
      } finally {
        setUpdatingProfile(false);
      }
    },
    [account, addNotification]
  );

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
  const handleNotesChange = useCallback((notes: string) => {
    setBookingState(prev => ({
      ...prev,
      notes,
    }));
  }, []);

  /**
   * Handles payment confirmation and booking creation.
   */
  const handleConfirmPayment = useCallback(async () => {
    if (
      !bookingState.selectedService ||
      !bookingState.selectedTimeSlot ||
      !bookingState.selectedServiceType
    ) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // For custom services, we need to get the associated booking type
      let bookingTypeId: string;

      if (bookingState.selectedServiceType === 'booking-type') {
        bookingTypeId = bookingState.selectedService.id;
      } else {
        // For custom services, use the prefilled booking type or create a temporary one
        const customService = bookingState.selectedService as CustomService;
        if (customService.prefilledBookingTypeId) {
          bookingTypeId = customService.prefilledBookingTypeId;
        } else {
          // This should be handled by the backend - for now, use the first available booking type
          bookingTypeId = bookingTypes[0]?.id || '';
        }
      }

      await sessionService.createSession({
        bookingTypeId,
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
  }, [bookingState, bookingTypes, addNotification, navigate]);

  /**
   * Navigates back to previous step.
   */
  const handleBack = useCallback(() => {
    setBookingState(prev => {
      switch (prev.step) {
        case 'select-time':
          return {
            ...prev,
            step: 'select-service',
            selectedService: null,
            selectedServiceType: null,
          };
        case 'complete-profile':
          return { ...prev, step: 'select-time' };
        case 'payment':
          return prev.missingProfileFields.length > 0
            ? { ...prev, step: 'complete-profile' }
            : { ...prev, step: 'select-time' };
        default:
          return prev;
      }
    });
  }, []);

  /**
   * Gets the coach ID from a service.
   */
  const getServiceCoachId = (service: BookingType | CustomService): string => {
    return service.coachId;
  };

  /**
   * Gets the current step title.
   */
  const getStepTitle = (): string => {
    switch (bookingState.step) {
      case 'select-service':
        return 'Choose Your Service';
      case 'select-time':
        return 'Select Time Slot';
      case 'complete-profile':
        return 'Complete Your Profile';
      case 'payment':
        return 'Confirm & Pay';
      default:
        return 'Book a Session';
    }
  };

  /**
   * Gets the current step number for progress indicator.
   */
  const getCurrentStepNumber = (): number => {
    switch (bookingState.step) {
      case 'select-service':
        return 1;
      case 'select-time':
        return 2;
      case 'complete-profile':
        return 3;
      case 'payment':
        return bookingState.missingProfileFields.length > 0 ? 4 : 3;
      default:
        return 1;
    }
  };

  /**
   * Gets the total number of steps.
   */
  const getTotalSteps = (): number => {
    return bookingState.missingProfileFields.length > 0 ? 4 : 3;
  };

  // Loading state
  if (loadingServices) {
    return (
      <div className='container mx-auto px-4 py-8'>
        <LoadingSpinner fullScreen message='Loading services...' />
      </div>
    );
  }

  // Error state with no data
  if (error && bookingTypes.length === 0 && customServices.length === 0) {
    return (
      <div className='container mx-auto px-4 py-8'>
        <h1 className='text-3xl font-bold mb-6 text-white'>Services</h1>
        <ErrorMessage
          variant='card'
          title='Unable to Load Services'
          message={error}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold mb-2 text-white'>{getStepTitle()}</h1>

        {/* Progress Indicator */}
        <div className='flex items-center justify-center space-x-4 mt-6'>
          <StepIndicator
            step={1}
            label='Service'
            isActive={bookingState.step === 'select-service'}
            isCompleted={getCurrentStepNumber() > 1}
          />
          <div className='w-12 h-0.5 bg-gray-600' />
          <StepIndicator
            step={2}
            label='Time'
            isActive={bookingState.step === 'select-time'}
            isCompleted={getCurrentStepNumber() > 2}
          />
          <div className='w-12 h-0.5 bg-gray-600' />
          {bookingState.missingProfileFields.length > 0 && (
            <>
              <StepIndicator
                step={3}
                label='Profile'
                isActive={bookingState.step === 'complete-profile'}
                isCompleted={getCurrentStepNumber() > 3}
              />
              <div className='w-12 h-0.5 bg-gray-600' />
            </>
          )}
          <StepIndicator
            step={getTotalSteps()}
            label='Payment'
            isActive={bookingState.step === 'payment'}
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

      {/* Step 1: Select Service */}
      {bookingState.step === 'select-service' && (
        <ServiceSelector
          bookingTypes={bookingTypes}
          customServices={customServices}
          selectedService={bookingState.selectedService}
          onServiceSelect={handleServiceSelect}
          loading={loadingServices}
          error={error}
          preSelectedCustomServiceId={customServiceIdParam || undefined}
        />
      )}

      {/* Step 2: Select Time Slot */}
      {bookingState.step === 'select-time' && bookingState.selectedService && (
        <div>
          <div className='flex items-center justify-between mb-6'>
            <div>
              <h2 className='text-xl font-semibold text-white mb-2'>Available Times</h2>
              <p className='text-gray-400'>Selected: {bookingState.selectedService.name}</p>
            </div>
            <button
              onClick={handleBack}
              className='text-orange-500 hover:text-orange-400 font-medium transition-colors'
            >
              ← Change Service
            </button>
          </div>

          {loadingTimeSlots ? (
            <LoadingSpinner message='Loading available times...' />
          ) : (
            <TimeSlotPicker
              timeSlots={timeSlots}
              selectedSlot={bookingState.selectedTimeSlot}
              onSelect={handleTimeSlotSelect}
              enhanced={true}
              showTimezone={true}
            />
          )}
        </div>
      )}

      {/* Step 3: Complete Profile (if needed) */}
      {bookingState.step === 'complete-profile' && account && (
        <div>
          <div className='flex items-center justify-between mb-6'>
            <h2 className='text-xl font-semibold text-white'>Complete Your Profile</h2>
            <button
              onClick={handleBack}
              className='text-orange-500 hover:text-orange-400 font-medium transition-colors'
            >
              ← Back to Time Selection
            </button>
          </div>

          <ProfileCompletion
            account={authAccountToAccount(account)}
            missingFields={bookingState.missingProfileFields}
            onProfileUpdate={handleProfileUpdate}
            submitting={updatingProfile}
            error={error}
          />
        </div>
      )}

      {/* Step 4: Payment */}
      {bookingState.step === 'payment' &&
        bookingState.selectedService &&
        bookingState.selectedTimeSlot &&
        account && (
          <div>
            <div className='flex items-center justify-between mb-6'>
              <h2 className='text-xl font-semibold text-white'>Confirm Your Booking</h2>
              <button
                onClick={handleBack}
                className='text-orange-500 hover:text-orange-400 font-medium transition-colors'
              >
                ← Back
              </button>
            </div>

            <PaymentFlow
              selectedService={bookingState.selectedService}
              serviceType={bookingState.selectedServiceType!}
              selectedTimeSlot={bookingState.selectedTimeSlot}
              account={authAccountToAccount(account)}
              discountValidation={bookingState.discountValidation}
              onDiscountApplied={handleDiscountApplied}
              onDiscountCleared={handleDiscountCleared}
              notes={bookingState.notes}
              onNotesChange={handleNotesChange}
              onConfirmPayment={handleConfirmPayment}
              processing={submitting}
              error={error}
            />
          </div>
        )}
    </div>
  );
}

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

export default Services;
