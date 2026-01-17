import { AccessLevel } from '@components/Auth/ProtectedRoute';
import { AdminDashboard } from '@pages/admin';
import { CoachDashboard, CustomServicesPage } from '@pages/coach';
import { BookingTypes, CoachProfile, Home, Login, Register, Services } from '@pages/shared';
import Account from '@pages/shared/Account';
import { Book, Chat, UserDashboard } from '@pages/user';
import { ReactNode } from 'react';

/**
 * Route configuration interface defining the structure for each route.
 * Used to centralize route definitions with their access requirements.
 */
export interface RouteConfig {
  /** The URL path for the route */
  path: string;
  /** The React element to render for this route */
  element: ReactNode;
  /**
   * Access level required for this route:
   * - 'public': No authentication required
   * - 'authenticated': Any logged-in user (USER, COACH, ADMIN)
   * - 'coach': COACH or ADMIN only
   * - 'admin': ADMIN only
   */
  accessLevel: 'public' | AccessLevel;
  /** Optional custom redirect path when access is denied */
  redirectTo?: string;
}

/**
 * Public routes accessible to all users (authenticated or not).
 */
const publicRoutes: RouteConfig[] = [
  { path: '/', element: <Home />, accessLevel: 'public' },
  { path: '/coach/:id', element: <CoachProfile />, accessLevel: 'public' },
  { path: '/services', element: <Services />, accessLevel: 'public' },
  { path: '/booking-types', element: <BookingTypes />, accessLevel: 'public' }, // Legacy route
  { path: '/login', element: <Login />, accessLevel: 'public' },
  { path: '/register', element: <Register />, accessLevel: 'public' },
];

/**
 * User routes requiring authentication (any role).
 */
const userRoutes: RouteConfig[] = [
  { path: '/dashboard', element: <UserDashboard />, accessLevel: 'authenticated' },
  { path: '/book', element: <Book />, accessLevel: 'authenticated' },
  { path: '/chat', element: <Chat />, accessLevel: 'authenticated' },
  { path: '/account', element: <Account />, accessLevel: 'authenticated' },
];

/**
 * Coach routes requiring COACH or ADMIN role.
 */
const coachRoutes: RouteConfig[] = [
  { path: '/coach-dashboard', element: <CoachDashboard />, accessLevel: 'coach' },
  { path: '/custom-services', element: <CustomServicesPage />, accessLevel: 'coach' },
];

/**
 * Admin routes requiring ADMIN role only.
 */
const adminRoutes: RouteConfig[] = [
  { path: '/admin', element: <AdminDashboard />, accessLevel: 'admin' },
];

/**
 * All application routes combined.
 * This centralized configuration maps routes to their role requirements.
 * Implements comprehensive role-based access control with route filtering.
 */
export const routes: RouteConfig[] = [
  ...publicRoutes,
  ...userRoutes,
  ...coachRoutes,
  ...adminRoutes,
];

/**
 * Helper function to check if a route is public.
 * @param route - The route configuration to check
 * @returns true if the route is public, false otherwise
 */
export function isPublicRoute(route: RouteConfig): boolean {
  return route.accessLevel === 'public';
}

/**
 * Helper function to check if a route requires authentication.
 * @param route - The route configuration to check
 * @returns true if the route requires authentication, false otherwise
 */
export function isProtectedRoute(route: RouteConfig): boolean {
  return route.accessLevel !== 'public';
}

/**
 * Helper function to filter routes based on user role.
 * Implements role-based route filtering
 *
 * @param userRole - The user's role (USER, COACH, ADMIN) or null if not authenticated
 * @returns Array of routes accessible to the user
 */
export function getAccessibleRoutes(userRole: string | null): RouteConfig[] {
  return routes.filter(route => {
    // Public routes are always accessible
    if (route.accessLevel === 'public') {
      return true;
    }

    // If user is not authenticated, they can't access protected routes
    if (!userRole) {
      return false;
    }

    // Check access based on route access level and user role
    switch (route.accessLevel) {
      case 'authenticated':
        // Any authenticated user can access
        return true;
      case 'coach':
        // COACH or ADMIN can access
        return userRole === 'COACH' || userRole === 'ADMIN';
      case 'admin':
        // Only ADMIN can access
        return userRole === 'ADMIN';
      default:
        return false;
    }
  });
}

/**
 * Helper function to check if a user can access a specific route.
 *
 * @param route - The route to check access for
 * @param userRole - The user's role or null if not authenticated
 * @returns true if the user can access the route, false otherwise
 */
export function canAccessRoute(route: RouteConfig, userRole: string | null): boolean {
  // Public routes are always accessible
  if (route.accessLevel === 'public') {
    return true;
  }

  // If user is not authenticated, they can't access protected routes
  if (!userRole) {
    return false;
  }

  // Check access based on route access level and user role
  switch (route.accessLevel) {
    case 'authenticated':
      return true;
    case 'coach':
      return userRole === 'COACH' || userRole === 'ADMIN';
    case 'admin':
      return userRole === 'ADMIN';
    default:
      return false;
  }
}
