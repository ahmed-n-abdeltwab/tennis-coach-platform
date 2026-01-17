import { useAuth } from '@contexts/AuthContext';
import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { ACCOUNT_ROLES } from '../../services/types';
import LoadingSpinner from '../Common/LoadingSpinner';

/**
 * Access level types for protected routes.
 * - 'authenticated': Any logged-in user (USER, COACH, ADMIN)
 * - 'coach': COACH or ADMIN only
 * - 'admin': ADMIN only
 */
export type AccessLevel = 'authenticated' | 'coach' | 'admin';

interface ProtectedRouteProps {
  children: ReactNode;
  /**
   * Access level required for this route.
   * - 'authenticated': Any logged-in user (USER, COACH, ADMIN)
   * - 'coach': COACH or ADMIN only
   * - 'admin': ADMIN only
   * @default 'authenticated'
   */
  accessLevel?: AccessLevel;
  /** Custom redirect path (defaults to role-appropriate dashboard) */
  redirectTo?: string;
}

/**
 * Gets the appropriate dashboard path based on user role.
 * Used for redirecting users who don't have access to a route.
 *
 * @param role - The user's role
 * @returns The dashboard path for the user's role
 */
function getRoleDashboard(role: string): string {
  switch (role) {
    case ACCOUNT_ROLES.ADMIN:
      return '/admin';
    case ACCOUNT_ROLES.COACH:
      return '/coach-dashboard';
    case ACCOUNT_ROLES.USER:
    default:
      return '/dashboard';
  }
}

/**
 * Checks if a user has access to a route based on their role and the required access level.
 *
 * @param role - The user's role
 * @param accessLevel - The required access level for the route
 * @returns true if the user has access, false otherwise
 */
function hasAccess(role: string, accessLevel: AccessLevel): boolean {
  switch (accessLevel) {
    case 'authenticated':
      // Any authenticated user can access
      return true;
    case 'coach':
      // COACH or ADMIN can access
      return role === ACCOUNT_ROLES.COACH || role === ACCOUNT_ROLES.ADMIN;
    case 'admin':
      // Only ADMIN can access
      return role === ACCOUNT_ROLES.ADMIN;
    default:
      return false;
  }
}

/**
 * Protected route component that handles role-based access control.
 *
 * - Redirects unauthenticated users to login with redirect URL preservation
 * - Redirects users without required role to their role-appropriate dashboard
 * - Shows loading spinner while auth state is being determined
 * - Implements comprehensive unauthorized access redirection
 *
 * @example
 * // Basic protected route (any authenticated user)
 * <ProtectedRoute>
 *   <Dashboard />
 * </ProtectedRoute>
 *
 * @example
 * // Coach-only route (COACH or ADMIN role required)
 * <ProtectedRoute accessLevel="coach">
 *   <CoachDashboard />
 * </ProtectedRoute>
 *
 * @example
 * // Admin-only route (ADMIN role required)
 * <ProtectedRoute accessLevel="admin">
 *   <AdminDashboard />
 * </ProtectedRoute>
 *
 * @example
 * // Custom redirect for unauthorized access
 * <ProtectedRoute accessLevel="coach" redirectTo="/services">
 *   <CoachOnlyFeature />
 * </ProtectedRoute>
 */
function ProtectedRoute({
  children,
  accessLevel = 'authenticated',
  redirectTo,
}: ProtectedRouteProps) {
  const { account, loading } = useAuth();
  const location = useLocation();

  // Show loading spinner while auth state is being determined
  if (loading) {
    return <LoadingSpinner fullScreen size='lg' message='Verifying authentication...' />;
  }

  // Redirect unauthenticated users to login with redirect URL preservation
  if (!account) {
    // Store the intended destination in location state for post-login redirect
    return <Navigate to='/login' state={{ from: location.pathname }} replace />;
  }

  // Check if user has access based on their role and the required access level
  if (!hasAccess(account.role, accessLevel)) {
    // Redirect to custom path or role-appropriate dashboard
    const redirectPath = redirectTo ?? getRoleDashboard(account.role);

    // Log unauthorized access attempt for security monitoring
    console.warn(
      `Unauthorized access attempt: User with role ${account.role} tried to access ${accessLevel}-level route ${location.pathname}`
    );

    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
