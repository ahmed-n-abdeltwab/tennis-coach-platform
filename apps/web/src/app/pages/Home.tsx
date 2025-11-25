import api from '@services/api';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface Coach {
  id: string;
  name: string;
  bio: string;
  credentials: string;
  philosophy: string;
  profileImage: string;
  bookingTypes: Array<{
    id: string;
    name: string;
    basePrice: number;
  }>;
}

function Home() {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCoaches = async () => {
      try {
        const response = await api.get('/coaches');
        setCoaches(response.data);
      } catch (error) {
        console.error('Failed to fetch coaches:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCoaches();
  }, []);

  if (loading) {
    return (
      <div className='flex justify-center items-center min-h-96'>
        <div className='animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500'></div>
      </div>
    );
  }

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
              to='/booking-types'
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
          <h2 className='text-4xl font-bold text-center mb-12'>Meet Your Coach</h2>
          {coaches.map(coach => (
            <div key={coach.id} className='grid md:grid-cols-2 gap-12 items-center'>
              <div>
                <img
                  src={coach.profileImage}
                  alt={coach.name}
                  className='w-full rounded-lg shadow-lg'
                />
              </div>
              <div>
                <h3 className='text-3xl font-bold mb-4'>{coach.name}</h3>
                <p className='text-orange-500 text-lg mb-4'>{coach.credentials}</p>
                <p className='text-gray-300 mb-6'>{coach.bio}</p>
                <blockquote className='italic text-lg mb-6 border-l-4 border-orange-500 pl-4'>
                  &quot;{coach.philosophy}&quot;
                </blockquote>
                <Link
                  to={`/coach/${coach.id}`}
                  className='bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-semibold transition-colors'
                >
                  View Full Profile
                </Link>
              </div>
            </div>
          ))}
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

export default Home;
