import { ACCOUNT_ROLES } from '@services/types';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ProtectedRoute from './ProtectedRoute';

// Mock React Router Navigate component to prevent navigation issues in tests
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Navigate: ({ to }: { to: string }) => (
      <div data-testid='navigate' data-to={to}>
        Redirecting to {to}
      </div>
    ),
    useLocation: () => ({ pathname: '/test' }),
  };
});

// Mock the LoadingSpinner component
vi.mock('@components/Common/LoadingSpinner', () => ({
  default: ({ message }: { message: string }) => <div data-testid='loading-spinner'>{message}</div>,
}));

// Mock console.warn to avoid noise in tests
const mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

// Mock the useAuth hook
const mockUseAuth = vi.fn();
vi.mock('@contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Helper to create auth context value
const createAuthContext = (
  account: unknown = null,
  loading = false,
  error: string | null = null
) => ({
  account,
  accessToken: account ? 'mock-token' : null,
  refreshToken: account ? 'mock-refresh-token' : null,
  loading,
  error,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  refreshAuth: vi.fn(),
  isUser: (account as { role?: string })?.role === ACCOUNT_ROLES.USER,
  isCoach: (account as { role?: string })?.role === ACCOUNT_ROLES.COACH,
  isAdmin: (account as { role?: string })?.role === ACCOUNT_ROLES.ADMIN,
  hasCoachAccess:
    (account as { role?: string })?.role === ACCOUNT_ROLES.COACH ||
    (account as { role?: string })?.role === ACCOUNT_ROLES.ADMIN,
  hasAdminAccess: (account as { role?: string })?.role === ACCOUNT_ROLES.ADMIN,
  canManageUsers: (account as { role?: string })?.role === ACCOUNT_ROLES.ADMIN,
  canCreateCustomServices:
    (account as { role?: string })?.role === ACCOUNT_ROLES.COACH ||
    (account as { role?: string })?.role === ACCOUNT_ROLES.ADMIN,
  canAccessAnalytics:
    (account as { role?: string })?.role === ACCOUNT_ROLES.COACH ||
    (account as { role?: string })?.role === ACCOUNT_ROLES.ADMIN,
});

// Helper to render ProtectedRoute with context
const renderProtectedRoute = (
  authContext: unknown,
  accessLevel: 'authenticated' | 'coach' | 'admin' = 'authenticated',
  redirectTo?: string,
  initialPath = '/test'
) => {
  mockUseAuth.mockReturnValue(authContext);

  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <ProtectedRoute accessLevel={accessLevel} redirectTo={redirectTo}>
        <div data-testid='protected-content'>Protected Content</div>
      </ProtectedRoute>
    </MemoryRouter>
  );
};

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockConsoleWarn.mockClear();
    mockUseAuth.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading spinner when auth is loading', () => {
      const authContext = createAuthContext(null, true);
      renderProtectedRoute(authContext);

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByText('Verifying authentication...')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });
  });

  describe('Unauthenticated Access', () => {
    it('should redirect to login when user is not authenticated', () => {
      const authContext = createAuthContext(null, false);
      renderProtectedRoute(authContext);

      // Should show redirect component instead of protected content
      expect(screen.getByTestId('navigate')).toBeInTheDocument();
      expect(screen.getByText('Redirecting to /login')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });
  });

  describe('Authenticated Access - Any Role', () => {
    it('should allow USER role access to authenticated routes', () => {
      const userAccount = { id: 'user1', email: 'user@test.com', role: ACCOUNT_ROLES.USER };
      const authContext = createAuthContext(userAccount);
      renderProtectedRoute(authContext, 'authenticated');

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('should allow COACH role access to authenticated routes', () => {
      const coachAccount = { id: 'coach1', email: 'coach@test.com', role: ACCOUNT_ROLES.COACH };
      const authContext = createAuthContext(coachAccount);
      renderProtectedRoute(authContext, 'authenticated');

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('should allow ADMIN role access to authenticated routes', () => {
      const adminAccount = { id: 'admin1', email: 'admin@test.com', role: ACCOUNT_ROLES.ADMIN };
      const authContext = createAuthContext(adminAccount);
      renderProtectedRoute(authContext, 'authenticated');

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  describe('Coach Access Control', () => {
    it('should deny USER role access to coach routes', () => {
      const userAccount = { id: 'user1', email: 'user@test.com', role: ACCOUNT_ROLES.USER };
      const authContext = createAuthContext(userAccount);
      renderProtectedRoute(authContext, 'coach');

      // Should show redirect instead of protected content
      expect(screen.getByTestId('navigate')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
      // Should log unauthorized access attempt
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining(
          'Unauthorized access attempt: User with role USER tried to access coach-level route'
        )
      );
    });

    it('should allow COACH role access to coach routes', () => {
      const coachAccount = { id: 'coach1', email: 'coach@test.com', role: ACCOUNT_ROLES.COACH };
      const authContext = createAuthContext(coachAccount);
      renderProtectedRoute(authContext, 'coach');

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  describe('Admin Access Control', () => {
    it('should deny USER role access to admin routes', () => {
      const userAccount = { id: 'user1', email: 'user@test.com', role: ACCOUNT_ROLES.USER };
      const authContext = createAuthContext(userAccount);
      renderProtectedRoute(authContext, 'admin');

      // Should show redirect instead of protected content
      expect(screen.getByTestId('navigate')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
      // Should log unauthorized access attempt
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining(
          'Unauthorized access attempt: User with role USER tried to access admin-level route'
        )
      );
    });

    it('should deny COACH role access to admin routes', () => {
      const coachAccount = { id: 'coach1', email: 'coach@test.com', role: ACCOUNT_ROLES.COACH };
      const authContext = createAuthContext(coachAccount);
      renderProtectedRoute(authContext, 'admin');

      // Should show redirect instead of protected content
      expect(screen.getByTestId('navigate')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
      // Should log unauthorized access attempt
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining(
          'Unauthorized access attempt: User with role COACH tried to access admin-level route'
        )
      );
    });

    it('should allow ADMIN role access to admin routes', () => {
      const adminAccount = { id: 'admin1', email: 'admin@test.com', role: ACCOUNT_ROLES.ADMIN };
      const authContext = createAuthContext(adminAccount);
      renderProtectedRoute(authContext, 'admin');

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });
});
