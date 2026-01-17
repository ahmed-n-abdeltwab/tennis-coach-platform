import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { ErrorMessage, LoadingSpinner } from '../../components/Common';
import { useNotification } from '../../contexts/NotificationContext';
import { accountService } from '../../services/account.service';
import { bookingService } from '../../services/booking.service';
import { isAppError } from '../../services/error-handler';
import type { Account, BookingType } from '../../services/types';

function BookingTypes() {
  const navigate = useNavigate();
  const { addNotification } = useNotification();
  const [bookingTypes, setBookingTypes] = useState<BookingType[]>([]);
  const [coaches, setCoaches] = useState<Map<string, Account>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch booking types and coaches in parallel
      const [bookingTypeList, coachList] = await Promise.all([
        bookingService.getBookingTypes(),
        accountService.getCoaches(),
      ]);

      setBookingTypes(bookingTypeList);

      // Create a map of coach ID to coach for easy lookup
      const coachMap = new Map<string, Account>();
      coachList.forEach(coach => {
        coachMap.set(coach.id, coach);
      });
      setCoaches(coachMap);
    } catch (err) {
      const errorMessage = isAppError(err) ? err.message : 'Failed to load booking types';
      setError(errorMessage);
      addNotification('error', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRetry = () => {
    fetchData();
  };

  const handleBookingTypeClick = (bookingType: BookingType) => {
    // Navigate to /book with bookingTypeId as query parameter
    navigate(`/book?bookingTypeId=${bookingType.id}`);
  };

  /**
   * Groups booking types by coach ID.
   * Returns a Map where keys are coach IDs and values are arrays of booking types.
   */
  const groupByCoach = (types: BookingType[]): Map<string, BookingType[]> => {
    return types.reduce((groups, bt) => {
      const coachId = bt.coachId;
      const existing = groups.get(coachId) ?? [];
      groups.set(coachId, [...existing, bt]);
      return groups;
    }, new Map<string, BookingType[]>());
  };

  const groupedBookingTypes = groupByCoach(bookingTypes);

  return (
    <div className='bg-black text-white min-h-screen'>
      {/* Header Section */}
      <section className='py-16 px-4'>
        <div className='max-w-6xl mx-auto text-center'>
          <h1 className='text-4xl md:text-5xl font-bold mb-4'>
            Our <span className='text-orange-500'>Services</span>
          </h1>
          <p className='text-xl text-gray-300 max-w-2xl mx-auto'>
            Choose from a variety of coaching sessions tailored to your skill level and goals
          </p>
        </div>
      </section>

      {/* Booking Types Section */}
      <section className='py-8 px-4 bg-gray-900'>
        <div className='max-w-6xl mx-auto'>
          {/* Loading State */}
          {loading && (
            <div className='flex justify-center items-center min-h-64'>
              <LoadingSpinner size='lg' message='Loading services...' />
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className='max-w-md mx-auto'>
              <ErrorMessage
                variant='card'
                title='Unable to Load Services'
                message={error}
                onRetry={handleRetry}
                retryText='Try Again'
              />
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && bookingTypes.length === 0 && (
            <div className='text-center py-12'>
              <p className='text-gray-400 text-lg'>No services available at the moment.</p>
              <p className='text-gray-500 mt-2'>Please check back later.</p>
            </div>
          )}

          {/* Grouped Booking Types by Coach */}
          {!loading && !error && bookingTypes.length > 0 && (
            <div className='space-y-12'>
              {Array.from(groupedBookingTypes.entries()).map(([coachId, types]) => {
                const coach = coaches.get(coachId);
                return (
                  <CoachBookingTypesSection
                    key={coachId}
                    coach={coach}
                    bookingTypes={types}
                    onBookingTypeClick={handleBookingTypeClick}
                  />
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className='py-16 px-4'>
        <div className='max-w-4xl mx-auto text-center'>
          <h2 className='text-3xl font-bold mb-4'>Not sure which session is right for you?</h2>
          <p className='text-gray-300 mb-8'>
            Contact one of our coaches to discuss your goals and find the perfect training program.
          </p>
          <Link
            to='/'
            className='border border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white px-8 py-3 rounded-lg text-lg font-semibold transition-colors'
          >
            Meet Our Coaches
          </Link>
        </div>
      </section>
    </div>
  );
}

/**
 * Section component displaying booking types for a specific coach.
 */
interface CoachBookingTypesSectionProps {
  coach: Account | undefined;
  bookingTypes: BookingType[];
  onBookingTypeClick: (bookingType: BookingType) => void;
}

function CoachBookingTypesSection({
  coach,
  bookingTypes,
  onBookingTypeClick,
}: CoachBookingTypesSectionProps) {
  const coachName = coach?.name ?? 'Unknown Coach';
  const coachProfileImage =
    coach?.profileImage ??
    `https://ui-avatars.com/api/?name=${encodeURIComponent(coachName)}&size=100&background=f97316&color=fff`;

  return (
    <div className='bg-gray-800 rounded-lg p-6'>
      {/* Coach Header */}
      <div className='flex items-center mb-6'>
        <img
          src={coachProfileImage}
          alt={coachName}
          className='w-16 h-16 rounded-full object-cover mr-4'
          loading='lazy'
        />
        <div>
          <h2 className='text-2xl font-bold'>{coachName}</h2>
          {coach?.credentials && <p className='text-orange-500'>{coach.credentials}</p>}
        </div>
        {coach && (
          <Link
            to={`/coach/${coach.id}`}
            className='ml-auto text-orange-500 hover:text-orange-400 transition-colors text-sm'
          >
            View Profile →
          </Link>
        )}
      </div>

      {/* Booking Type Cards Grid */}
      <div className='grid md:grid-cols-2 lg:grid-cols-3 gap-4'>
        {bookingTypes.map(bookingType => (
          <BookingTypeCard
            key={bookingType.id}
            bookingType={bookingType}
            onClick={() => onBookingTypeClick(bookingType)}
          />
        ))}
      </div>
    </div>
  );
}

interface BookingTypeCardProps {
  bookingType: BookingType;
  onClick: () => void;
}

function BookingTypeCard({ bookingType, onClick }: BookingTypeCardProps) {
  const formatPrice = (price: number | null | undefined): string => {
    if (price === null || price === undefined) {
      return 'Price on request';
    }
    return `${price.toFixed(2)}`;
  };

  return (
    <button
      onClick={onClick}
      className='bg-gray-700 hover:bg-gray-600 rounded-lg p-5 text-left transition-colors w-full group'
      type='button'
    >
      <div className='flex justify-between items-start mb-3'>
        <h3 className='text-lg font-semibold group-hover:text-orange-500 transition-colors'>
          {bookingType.name}
        </h3>
        <span className='text-orange-500 font-bold text-lg'>
          {formatPrice(bookingType.basePrice)}
        </span>
      </div>
      {bookingType.description && (
        <p className='text-gray-400 text-sm line-clamp-3'>{bookingType.description}</p>
      )}
      <div className='mt-4 flex items-center text-orange-500 text-sm font-medium'>
        <span>Book Now</span>
        <svg
          className='w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform'
          fill='none'
          viewBox='0 0 24 24'
          stroke='currentColor'
        >
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
        </svg>
      </div>
    </button>
  );
}

export default BookingTypes;
