import { useAuth } from '@contexts/AuthContext';
import { useNotification } from '@contexts/NotificationContext';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import ErrorMessage from '../../components/Common/ErrorMessage';

/**
 * Location state interface for redirect URL preservation.
 */
interface LocationState {
  from?: string;
}

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuth();
  const { addNotification } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();

  // Get the redirect URL from location state (set by ProtectedRoute)
  // Default to Home page to comply with Requirement 1.1
  const locationState = location.state as LocationState | null;
  const redirectTo = locationState?.from ?? '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await login(email, password);
      addNotification('success', 'Successfully logged in');
      // Redirect to the intended destination or Home page (Requirement 1.1)
      navigate(redirectTo, { replace: true });
    } catch (err: unknown) {
      // Extract error message from the error object
      let errorMessage = 'Login failed. Please try again.';

      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (
        typeof err === 'object' &&
        err !== null &&
        'message' in err &&
        typeof (err as { message: unknown }).message === 'string'
      ) {
        errorMessage = (err as { message: string }).message;
      }

      setError(errorMessage);
      addNotification('error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
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

        {error && (
          <ErrorMessage
            message={error}
            title='Login Failed'
            onRetry={clearError}
            retryText='Dismiss'
          />
        )}

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
                disabled={loading}
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
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <button
              type='submit'
              disabled={loading}
              className='group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>

        {/* Demo credentials - only shown in development */}
        {import.meta.env.DEV && (
          <div className='mt-8 p-4 bg-gray-100 rounded-lg'>
            <h3 className='text-sm font-semibold text-gray-700 mb-2'>Demo Accounts:</h3>
            <div className='text-xs text-gray-600 space-y-1'>
              <p>
                <strong>User:</strong> elena@example.com / userpass123
              </p>
              <p>
                <strong>Coach:</strong> jane@tennis.pro / accountpass123
              </p>
              <p>
                <strong>Admin:</strong> admin@tennis.pro / adminpass123
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Login;
