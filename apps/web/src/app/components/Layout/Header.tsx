import { useAuth } from '@contexts/AuthContext';
import { Link, useLocation } from 'react-router-dom';

// Role enum matching the backend
enum Role {
  USER = 'USER',
  PREMIUM_USER = 'PREMIUM_USER',
  ADMIN = 'ADMIN',
  COACH = 'COACH',
}

function Header() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path ? 'text-orange-500' : 'text-white hover:text-orange-500';
  };

  return (
    <header className='bg-black text-white shadow-lg'>
      <nav className='max-w-6xl mx-auto px-4 py-4 flex justify-between items-center'>
        <Link to='/' className='text-2xl font-bold'>
          Tennis<span className='text-orange-500'>Coach</span>
        </Link>

        <div className='hidden md:flex space-x-6'>
          <Link to='/' className={`transition-colors ${isActive('/')}`}>
            Home
          </Link>
          <Link to='/booking-types' className={`transition-colors ${isActive('/booking-types')}`}>
            Services
          </Link>
          {user && (
            <>
              <Link to='/book' className={`transition-colors ${isActive('/book')}`}>
                Book
              </Link>
              <Link to='/dashboard' className={`transition-colors ${isActive('/dashboard')}`}>
                Dashboard
              </Link>
              {user.type === Role.COACH && (
                <Link to='/admin' className={`transition-colors ${isActive('/admin')}`}>
                  Admin
                </Link>
              )}
              <Link to='/chat' className={`transition-colors ${isActive('/chat')}`}>
                Chat
              </Link>
            </>
          )}
        </div>

        <div className='flex items-center space-x-4'>
          {user ? (
            <div className='flex items-center space-x-4'>
              <span className='text-sm'>
                Hello, <span className='font-semibold'>{user.name}</span>
                {user.type === 'coach' && <span className='text-orange-500 ml-1'>(Coach)</span>}
              </span>
              <button
                onClick={logout}
                className='bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors'
              >
                Logout
              </button>
            </div>
          ) : (
            <div className='space-x-2'>
              <Link
                to='/login'
                className='text-white hover:text-orange-500 px-4 py-2 text-sm font-semibold transition-colors'
              >
                Login
              </Link>
              <Link
                to='/register'
                className='bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors'
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}

export default Header;
