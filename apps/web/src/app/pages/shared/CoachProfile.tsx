import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { ErrorMessage, LoadingSpinner } from '../../components/Common';
import { useNotification } from '../../contexts/NotificationContext';
import { accountService } from '../../services/account.service';
import { bookingService } from '../../services/booking.service';
import { isAppError } from '../../services/error-handler';
import type { Account, BookingType } from '../../services/types';

function CoachProfile() {
  const { id } = useParams<{ id: string }>();
  const { addNotification } = useNotification();
  const [coach, setCoach] = useState<Account | null>(null);
  const [bookingTypes, setBookingTypes] = useState<BookingType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCoachData = useCallback(async () => {
    if (!id) {
      setError('Coach ID is required');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch coach details and booking types in parallel
      const [coachData, bookingTypesData] = await Promise.all([
        accountService.getCoach(id),
        bookingService.getBookingTypesByCoach(id),
      ]);

      setCoach(coachData);
      setBookingTypes(bookingTypesData);
    } catch (err) {
      const errorMessage = isAppError(err) ? err.message : 'Failed to load coach profile';
      setError(errorMessage);
      addNotification('error', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [id, addNotification]);

  useEffect(() => {
    fetchCoachData();
  }, [fetchCoachData]);

  const handleRetry = () => {
    fetchCoachData();
  };

  // Loading State
  if (loading) {
    return (
      <div className='bg-black text-white min-h-screen'>
        <div className='max-w-6xl mx-auto px-4 py-16'>
          <div className='fjustify-center items-center min-h-96'>
            <LoadingSpinner size='lg' message='Loading coach profile...' />
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className='bg-black text-white min-h-screen'>
        <div className='max-w-6xl mx-auto px-4 py-16'>
          <div className='max-w-md mx-auto'>
            <ErrorMessage
              variant='card'
              title='Unable to Load Coach Profile'
              message={error}
              onRetry={handleRetry}
              retryText='Try Again'
            />
          </div>
          <div className='text-center mt-8'>
            <Link
              to='/'
              className='text-orange-500 hover:text-orange-400 font-medium transition-colors'
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Not Found State
  if (!coach) {
    return (
      <div className='bg-black text-white min-h-screen'>
        <div className='max-w-6xl mx-auto px-4 py-16'>
          <div className='text-center'>
            <h1 className='text-3xl font-bold mb-4'>Coach Not Found</h1>
            <p className='text-gray-400 mb-8'>
              The coach you&apos;re looking for doesn&apos;t exist or has been removed.
            </p>
            <Link
              to='/'
              className='bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-semibold transition-colors inline-block'
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Default placeholder image if no profile image is set
  const profileImage =
    coach.profileImage ??
    `https://ui-avatars.com/api/?name=${encodeURIComponent(coach.name)}&size=400&background=f97316&color=fff`;

  return (
    <div className='bg-black text-white min-h-screen'>
      {/* Coach Profile Header */}
      <section className='py-16 px-4'>
        <div className='max-w-6xl mx-auto'>
          <div className='grid md:grid-cols-2 gap-12 items-start'>
            {/* Profile Image */}
            <div>
              <img
                src={profileImage}
                alt={`${coach.name} - Tennis Coach`}
                className='w-full rounded-lg shadow-lg object-cover aspect-square'
                loading='lazy'
              />
            </div>

            {/* Coach Information */}
            <div>
              <h1 className='text-4xl md:text-5xl font-bold mb-4'>{coach.name}</h1>

              {coach.credentials && (
                <p className='text-orange-500 text-xl mb-6'>{coach.credentials}</p>
              )}

              {coach.bio && (
                <div className='mb-6'>
                  <h2 className='text-xl font-semibold mb-2 text-gray-300'>About</h2>
                  <p className='text-gray-300 leading-relaxed'>{coach.bio}</p>
                </div>
              )}

              {coach.philosophy && (
                <div className='mb-8'>
                  <h2 className='text-xl font-semibold mb-2 text-gray-300'>Coaching Philosophy</h2>
                  <blockquote className='italic text-lg border-l-4 border-orange-500 pl-4 text-gray-300'>
                    &quot;{coach.philosophy}&quot;
                  </blockquote>
                </div>
              )}

              {/* Book Session Button */}
              <Link
                to={`/book?coachId=${coach.id}`}
                className='bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-lg text-lg font-semibold transition-colors inline-block'
              >
                Book a Session
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Booking Types Section */}
      <section className='py-16 px-4 bg-gray-900'>
        <div className='max-w-6xl mx-auto'>
          <h2 className='text-3xl font-bold mb-8'>Available Services</h2>

          {bookingTypes.length === 0 ? (
            <div className='text-center py-12'>
              <p className='text-gray-400 text-lg'>No services available at the moment.</p>
              <p className='text-gray-500 mt-2'>Please check back later.</p>
            </div>
          ) : (
            <div className='grid md:grid-cols-2 lg:grid-cols-3 gap-6'>
              {bookingTypes.map(bookingType => (
                <BookingTypeCard
                  key={bookingType.id}
                  bookingType={bookingType}
                  coachId={coach.id}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Back Navigation */}
      <section className='py-8 px-4'>
        <div className='max-w-6xl mx-auto'>
          <Link
            to='/'
            className='text-orange-500 hover:text-orange-400 font-medium transition-colors'
          >
            ← Back to Home
          </Link>
        </div>
      </section>
    </div>
  );
}

/**
 * Booking type card component for displaying individual booking type information.
 *
 * Shows booking type name, description, and base price with a link to book.
 */
interface BookingTypeCardProps {
  bookingType: BookingType;
  coachId: string;
}

function BookingTypeCard({ bookingType, coachId }: BookingTypeCardProps) {
  // Format price for display
  const formattedPrice =
    typeof bookingType.basePrice === 'number'
      ? `${bookingType.basePrice.toFixed(2)}`
      : bookingType.basePrice;

  return (
    <div className='bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors'>
      <h3 className='text-xl font-bold mb-2'>{bookingType.name}</h3>

      {bookingType.description && (
        <p className='text-gray-400 mb-4 line-clamp-3'>{bookingType.description}</p>
      )}

      <div className='flex items-center justify-between mt-auto'>
        <span className='text-orange-500 text-2xl font-bold'>{formattedPrice}</span>
        <Link
          to={`/book?bookingTypeId=${bookingType.id}&coachId=${coachId}`}
          className='bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors text-sm'
        >
          Book Now
        </Link>
      </div>
    </div>
  );
}

export default CoachProfile;
