import { AccessLevel } from '@components/Auth/ProtectedRoute';
import { lazy, ReactNode, Suspense } from 'react';

// Lazy load components for better performance
const Home = lazy(() => import('@pages/shared/Home'));
const Login = lazy(() => import('@pages/shared/Login'));
const Register = lazy(() => import('@pages/shared/Register'));
const Services = lazy(() => import('@pages/shared/Services'));
const BookingTypes = lazy(() => import('@pages/shared/BookingTypes'));
const CoachProfile = lazy(() => import('@pages/shared/CoachProfile'));
const Account = lazy(() => import('@pages/shared/Account'));

// User-specific components (lazy loaded)
const UserDashboard = lazy(() => import('@pages/user/UserDashboard'));
const Book = lazy(() => import('@pages/user/Book'));
const Chat = lazy(() => import('@pages/user/Chat'));

// Coach-specific components (lazy loaded)
const CoachDashboard = lazy(() => import('@pages/coach/CoachDashboard'));
const CustomServicesPage = lazy(() => import('@pages/coach/CustomServicesPage'));

// Admin-specific components (lazy loaded)
const AdminDashboard = lazy(() => import('@pages/admin/AdminDashboard'));

/**
 * Loading component for lazy-loaded routes
 */
const RouteLoading = () => (
  <div className='flex items-center justify-center min-h-screen'>
    <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600'></div>
    <span className='ml-3 text-gray-600'>Loading...</span>
  </div>
);

/**
 * Wrapper component for lazy-loaded routes with suspense
 */
const LazyRoute = ({ children }: { children: ReactNode }) => (
  <Suspense fallback={<RouteLoading />}>{children}</Suspense>
);

/**
 * Route configuration interface defining the structure for each route.
 * Used to centralize route definitions with their access requirements.
 */
export interface LazyRouteConfig {
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
  /** Indicates if this route uses lazy loading */
  isLazy: boolean;
}

/**
 * Public routes accessible to all users (authenticated or not).
 */
const publicRoutes: LazyRouteConfig[] = [
  {
    path: '/',
    element: (
      <LazyRoute>
        <Home />
      </LazyRoute>
    ),
    accessLevel: 'public',
    isLazy: true,
  },
  {
    path: '/coach/:id',
    element: (
      <LazyRoute>
        <CoachProfile />
      </LazyRoute>
    ),
    accessLevel: 'public',
    isLazy: true,
  },
  {
    path: '/services',
    element: (
      <LazyRoute>
        <Services />
      </LazyRoute>
    ),
    accessLevel: 'public',
    isLazy: true,
  },
  {
    path: '/booking-types',
    element: (
      <LazyRoute>
        <BookingTypes />
      </LazyRoute>
    ),
    accessLevel: 'public',
    isLazy: true,
  },
  {
    path: '/login',
    element: (
      <LazyRoute>
        <Login />
      </LazyRoute>
    ),
    accessLevel: 'public',
    isLazy: true,
  },
  {
    path: '/register',
    element: (
      <LazyRoute>
        <Register />
      </LazyRoute>
    ),
    accessLevel: 'public',
    isLazy: true,
  },
];

/**
 * User routes requiring authentication (any role).
 */
const userRoutes: LazyRouteConfig[] = [
  {
    path: '/dashboard',
    element: (
      <LazyRoute>
        <UserDashboard />
      </LazyRoute>
    ),
    accessLevel: 'authenticated',
    isLazy: true,
  },
  {
    path: '/book',
    element: (
      <LazyRoute>
        <Book />
      </LazyRoute>
    ),
    accessLevel: 'authenticated',
    isLazy: true,
  },
  {
    path: '/chat',
    element: (
      <LazyRoute>
        <Chat />
      </LazyRoute>
    ),
    accessLevel: 'authenticated',
    isLazy: true,
  },
  {
    path: '/account',
    element: (
      <LazyRoute>
        <Account />
      </LazyRoute>
    ),
    accessLevel: 'authenticated',
    isLazy: true,
  },
];

/**
 * Coach routes requiring COACH or ADMIN role.
 */
const coachRoutes: LazyRouteConfig[] = [
  {
    path: '/coach-dashboard',
    element: (
      <LazyRoute>
        <CoachDashboard />
      </LazyRoute>
    ),
    accessLevel: 'coach',
    isLazy: true,
  },
  {
    path: '/custom-services',
    element: (
      <LazyRoute>
        <CustomServicesPage />
      </LazyRoute>
    ),
    accessLevel: 'coach',
    isLazy: true,
  },
];

/**
 * Admin routes requiring ADMIN role only.
 */
const adminRoutes: LazyRouteConfig[] = [
  {
    path: '/admin',
    element: (
      <LazyRoute>
        <AdminDashboard />
      </LazyRoute>
    ),
    accessLevel: 'admin',
    isLazy: true,
  },
];

/**
 * All application routes combined with lazy loading.
 * This centralized configuration maps routes to their role requirements.
 * Implements comprehensive role-based access control with route filtering and performance optimization.
 */
export const lazyRoutes: LazyRouteConfig[] = [
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
export function isPublicRoute(route: LazyRouteConfig): boolean {
  return route.accessLevel === 'public';
}

/**
 * Helper function to check if a route requires authentication.
 * @param route - The route configuration to check
 * @returns true if the route requires authentication, false otherwise
 */
export function isProtectedRoute(route: LazyRouteConfig): boolean {
  return route.accessLevel !== 'public';
}

/**
 * Helper function to filter routes based on user role.
 * Implements role-based route filtering
 *
 * @param userRole - The user's role (USER, COACH, ADMIN) or null if not authenticated
 * @returns Array of routes accessible to the user
 */
export function getAccessibleLazyRoutes(userRole: string | null): LazyRouteConfig[] {
  return lazyRoutes.filter(route => {
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
export function canAccessLazyRoute(route: LazyRouteConfig, userRole: string | null): boolean {
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

/**
 * Performance metrics for lazy loading
 */
export const lazyLoadingMetrics = {
  totalRoutes: lazyRoutes.length,
  lazyRoutes: lazyRoutes.filter(route => route.isLazy).length,
  eagerRoutes: lazyRoutes.filter(route => !route.isLazy).length,
  performanceGain: `${Math.round((lazyRoutes.filter(route => route.isLazy).length / lazyRoutes.length) * 100)}% of routes are lazy loaded`,
};
