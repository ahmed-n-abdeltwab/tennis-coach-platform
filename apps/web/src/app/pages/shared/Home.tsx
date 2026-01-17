import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { ErrorMessage, LoadingSpinner } from '../../components/Common';
import { useNotification } from '../../contexts/NotificationContext';
import { accountService } from '../../services/account.service';
import { isAppError } from '../../services/error-handler';
import type { Account } from '../../services/types';

function Home() {
  const [coaches, setCoaches] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addNotification } = useNotification();

  const fetchCoaches = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const coachList = await accountService.getCoaches();
      setCoaches(coachList);
    } catch (err) {
      const errorMessage = isAppError(err) ? err.message : 'Failed to load coaches';
      setError(errorMessage);
      addNotification('error', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    fetchCoaches();
  }, [fetchCoaches]);

  const handleRetry = () => {
    fetchCoaches();
  };

  return (
    <div className='bg-black text-white'>
      {/* Hero Section */}
      <section className='py-20 px-4'>
        <div className='max-w-6xl mx-auto text-center'>
          <h1 className='text-5xl md:text-7xl font-bold mb-6'>
            Master Your <span className='text-orange-500'>Tennis Game</span>
          </h1>
          <p className='text-xl md:text-2xl mb-8 text-gray-300'>
            Professional coaching, personalized training, and flexible booking
          </p>
          <div className='space-x-4'>
            <Link
              to='/services'
              className='bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-lg text-lg font-semibold transition-colors'
            >
              Book a Session
            </Link>
            <Link
              to='/register'
              className='border border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white px-8 py-3 rounded-lg text-lg font-semibold transition-colors'
            >
              Get Started
            </Link>
          </div>
        </div>
      </section>

      {/* Coach Section */}
      <section className='py-16 px-4 bg-gray-900'>
        <div className='max-w-6xl mx-auto'>
          <h2 className='text-4xl font-bold text-center mb-12'>
            {coaches.length > 1 ? 'Meet Our Coaches' : 'Meet Your Coach'}
          </h2>

          {/* Loading State */}
          {loading && (
            <div className='flex justify-center items-center min-h-64'>
              <LoadingSpinner size='lg' message='Loading coaches...' />
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className='max-w-md mx-auto'>
              <ErrorMessage
                variant='card'
                title='Unable to Load Coaches'
                message={error}
                onRetry={handleRetry}
                retryText='Try Again'
              />
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && coaches.length === 0 && (
            <div className='text-center py-12'>
              <p className='text-gray-400 text-lg'>No coaches available at the moment.</p>
              <p className='text-gray-500 mt-2'>Please check back later.</p>
            </div>
          )}

          {/* Coach Cards */}
          {!loading && !error && coaches.length > 0 && (
            <div className='space-y-16'>
              {coaches.map(coach => (
                <CoachCard key={coach.id} coach={coach} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className='py-16 px-4'>
        <div className='max-w-6xl mx-auto'>
          <h2 className='text-4xl font-bold text-center mb-12'>Why Choose Us?</h2>
          <div className='grid md:grid-cols-3 gap-8'>
            <div className='text-center'>
              <div className='w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4'>
                <span className='text-2xl'>🎾</span>
              </div>
              <h3 className='text-xl font-bold mb-2'>Professional Coaching</h3>
              <p className='text-gray-300'>ITF certified coaches with years of experience</p>
            </div>
            <div className='text-center'>
              <div className='w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4'>
                <span className='text-2xl'>📅</span>
              </div>
              <h3 className='text-xl font-bold mb-2'>Flexible Booking</h3>
              <p className='text-gray-300'>
                Book sessions that fit your schedule with real-time availability
              </p>
            </div>
            <div className='text-center'>
              <div className='w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4'>
                <span className='text-2xl'>💬</span>
              </div>
              <h3 className='text-xl font-bold mb-2'>Direct Communication</h3>
              <p className='text-gray-300'>Chat directly with your coach for tips and feedback</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

interface CoachCardProps {
  coach: Account;
}

function CoachCard({ coach }: CoachCardProps) {
  // Default placeholder image if no profile image is set
  const profileImage =
    coach.profileImage ??
    `https://ui-avatars.com/api/?name=${encodeURIComponent(coach.name)}&size=400&background=f97316&color=fff`;

  return (
    <div className='grid md:grid-cols-2 gap-12 items-center'>
      <div>
        <img
          src={profileImage}
          alt={`${coach.name} - Tennis Coach`}
          className='w-full rounded-lg shadow-lg object-cover aspect-square'
          loading='lazy'
        />
      </div>
      <div>
        <h3 className='text-3xl font-bold mb-4'>{coach.name}</h3>
        {coach.credentials && <p className='text-orange-500 text-lg mb-4'>{coach.credentials}</p>}
        {coach.bio && <p className='text-gray-300 mb-6'>{coach.bio}</p>}
        {coach.philosophy && (
          <blockquote className='italic text-lg mb-6 border-l-4 border-orange-500 pl-4'>
            &quot;{coach.philosophy}&quot;
          </blockquote>
        )}
        <Link
          to={`/coach/${coach.id}`}
          className='bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-semibold transition-colors inline-block'
        >
          View Full Profile
        </Link>
      </div>
    </div>
  );
}

export default Home;
