import { useAuth } from '@contexts/AuthContext';
import { useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { ACCOUNT_ROLES, type AccountRole } from '../../services/types';
import { NotificationBell } from '../Notifications';

// ============================================================================
// Types
// ============================================================================

/**
 * Navigation link configuration with role requirements.
 * Used to define which links are visible to which user roles.
 */
interface NavigationLink {
  /** The URL path for the link */
  path: string;
  /** Display label for the link */
  label: string;
  /**
   * Roles that can see this link.
   * 'public' means visible to unauthenticated users.
   * Role values mean visible to authenticated users with that role.
   */
  roles: ('public' | AccountRole)[];
}

// ============================================================================
// Navigation Configuration
// ============================================================================

const navigationLinks: NavigationLink[] = [
  // Public links - visible to everyone
  { path: '/', label: 'Home', roles: ['public', 'USER', 'COACH', 'ADMIN'] },
  { path: '/services', label: 'Services', roles: ['public', 'USER', 'COACH', 'ADMIN'] },

  // User links - visible to authenticated users (USER, COACH, ADMIN)
  { path: '/dashboard', label: 'My Sessions', roles: ['USER', 'COACH', 'ADMIN'] },
  { path: '/chat', label: 'Chat', roles: ['USER', 'COACH', 'ADMIN'] },
  { path: '/account', label: 'Account', roles: ['USER', 'COACH', 'ADMIN'] },

  // Coach links - visible to COACH and ADMIN
  { path: '/coach-dashboard', label: 'Coach Dashboard', roles: ['COACH', 'ADMIN'] },
  { path: '/custom-services', label: 'Custom Services', roles: ['COACH', 'ADMIN'] },

  // Admin links - visible to ADMIN only
  { path: '/admin', label: 'Admin', roles: ['ADMIN'] },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Filters navigation links based on user's authentication status and role.
 * @param links - Array of navigation links to filter
 * @param isAuthenticated - Whether the user is authenticated
 * @param userRole - The user's role (if authenticated)
 * @returns Filtered array of navigation links visible to the user
 */
function filterNavigationLinks(
  links: NavigationLink[],
  isAuthenticated: boolean,
  userRole: AccountRole | undefined
): NavigationLink[] {
  return links.filter(link => {
    if (!isAuthenticated) {
      // Unauthenticated users only see public links
      return link.roles.includes('public');
    }
    // Authenticated users see links that include their role
    return userRole !== undefined && link.roles.includes(userRole);
  });
}

// ============================================================================
// Header Component
// ============================================================================

function Header() {
  const { account, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  /**
   * Determines if a navigation link is currently active.
   * @param path - The path to check
   * @returns CSS classes for active/inactive state
   */
  const isActive = (path: string): string => {
    return location.pathname === path ? 'text-orange-500' : 'text-white hover:text-orange-500';
  };

  /**
   * Handles navigation to account page when email is clicked
   */
  const handleAccountClick = () => {
    navigate('/account');
  };

  /**
   * Get the display label for the user's role badge.
   * Returns null for regular users (no badge shown).
   */
  const getRoleBadge = (): React.ReactNode => {
    if (!account) return null;

    switch (account.role) {
      case ACCOUNT_ROLES.ADMIN:
        return <span className='text-red-400 ml-1'>(Admin)</span>;
      case ACCOUNT_ROLES.COACH:
        return <span className='text-orange-500 ml-1'>(Coach)</span>;
      default:
        return null;
    }
  };

  /**
   * Filter navigation links based on user's authentication status and role.
   * Memoized to avoid recalculating on every render.
   */
  const visibleLinks = useMemo(() => {
    const isAuthenticated = account !== null;
    const userRole = account?.role as AccountRole | undefined;
    return filterNavigationLinks(navigationLinks, isAuthenticated, userRole);
  }, [account]);

  return (
    <header className='bg-black text-white shadow-lg'>
      <nav className='max-w-6xl mx-auto px-4 py-4 flex justify-between items-center'>
        <Link to='/' className='text-2xl font-bold'>
          Tennis<span className='text-orange-500'>Coach</span>
        </Link>

        {/* Desktop Navigation - Role-aware links */}
        <div className='hidden md:flex space-x-6'>
          {visibleLinks.map(link => (
            <Link
              key={link.path}
              to={link.path}
              className={`transition-colors ${isActive(link.path)}`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Authentication UI */}
        <div className='flex items-center space-x-4'>
          {account ? (
            // Authenticated user: show notifications, user info and logout button
            <div className='flex items-center space-x-4'>
              <NotificationBell />
              <button
                onClick={handleAccountClick}
                className='text-sm hover:text-orange-500 transition-colors cursor-pointer'
                title='Click to manage your account'
              >
                Hello, <span className='font-semibold'>{account.email}</span>
                {getRoleBadge()}
              </button>
              <button
                onClick={logout}
                className='bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors'
              >
                Logout
              </button>
            </div>
          ) : (
            // Unauthenticated user: show login/register links
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

// Export for testing purposes
export { filterNavigationLinks, navigationLinks };
export type { NavigationLink };
