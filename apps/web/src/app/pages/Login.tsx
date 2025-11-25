import { useAuth } from '@contexts/AuthContext';
import { useNotification } from '@contexts/NotificationContext';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isCoach, setIsCoach] = useState(false);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const { addNotification } = useNotification();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password, isCoach);
      addNotification('success', 'Successfully logged in');
      navigate(isCoach ? '/admin' : '/dashboard');
    } catch (error: any) {
      addNotification('error', error.response?.data?.message ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4'>
      <div className='max-w-md w-full space-y-8'>
        <div>
          <h2 className='mt-6 text-center text-3xl font-extrabold text-gray-900'>
            Sign in to your account
          </h2>
          <p className='mt-2 text-center text-sm text-gray-600'>
            Or{' '}
            <Link to='/register' className='font-medium text-orange-500 hover:text-orange-600'>
              create a new account
            </Link>
          </p>
        </div>
        <form className='mt-8 space-y-6' onSubmit={handleSubmit}>
          <div className='rounded-md shadow-sm -space-y-px'>
            <div>
              <label htmlFor='email' className='sr-only'>
                Email address
              </label>
              <input
                id='email'
                name='email'
                type='email'
                autoComplete='email'
                required
                className='appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm'
                placeholder='Email address'
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor='password' className='sr-only'>
                Password
              </label>
              <input
                id='password'
                name='password'
                type='password'
                autoComplete='current-password'
                required
                className='appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm'
                placeholder='Password'
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className='flex items-center'>
            <input
              id='is-coach'
              name='is-coach'
              type='checkbox'
              className='h-4 w-4 text-orange-500 focus:ring-orange-500 border-gray-300 rounded'
              checked={isCoach}
              onChange={e => setIsCoach(e.target.checked)}
            />
            <label htmlFor='is-coach' className='ml-2 block text-sm text-gray-900'>
              I am a coach
            </label>
          </div>

          <div>
            <button
              type='submit'
              disabled={loading}
              className='group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50'
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>

        {/* Demo credentials */}
        <div className='mt-8 p-4 bg-gray-100 rounded-lg'>
          <h3 className='text-sm font-semibold text-gray-700 mb-2'>Demo Accounts:</h3>
          <div className='text-xs text-gray-600 space-y-1'>
            <p>
              <strong>User:</strong> elena@example.com / userpass123
            </p>
            <p>
              <strong>Coach:</strong> jane@tennis.pro / coachpass123
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
