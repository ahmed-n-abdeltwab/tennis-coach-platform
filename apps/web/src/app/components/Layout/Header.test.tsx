import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';

import { ACCOUNT_ROLES } from '../../services/types';

import Header, { filterNavigationLinks, navigationLinks } from './Header';

// Mock the NotificationBell component
vi.mock('../Notifications', () => ({
  NotificationBell: () => <div data-testid='notification-bell'>Notifications</div>,
}));

// Mock the useAuth hook
const mockUseAuth = vi.fn();
vi.mock('@contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Helper to create auth context value
const createAuthContext = (account: any = null, loading = false) => ({
  account,
  accessToken: account ? 'mock-token' : null,
  refreshToken: account ? 'mock-refresh-token' : null,
  loading,
  error: null,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  refreshAuth: vi.fn(),
  isUser: account?.role === ACCOUNT_ROLES.USER,
  isCoach: account?.role === ACCOUNT_ROLES.COACH,
  isAdmin: account?.role === ACCOUNT_ROLES.ADMIN,
  hasCoachAccess: account?.role === ACCOUNT_ROLES.COACH || account?.role === ACCOUNT_ROLES.ADMIN,
  hasAdminAccess: account?.role === ACCOUNT_ROLES.ADMIN,
  canManageUsers: account?.role === ACCOUNT_ROLES.ADMIN,
  canCreateCustomServices:
    account?.role === ACCOUNT_ROLES.COACH || account?.role === ACCOUNT_ROLES.ADMIN,
  canAccessAnalytics:
    account?.role === ACCOUNT_ROLES.COACH || account?.role === ACCOUNT_ROLES.ADMIN,
});

// Helper to render Header with auth context
const renderHeaderWithAuth = (account: any) => {
  const authContext = createAuthContext(account);
  mockUseAuth.mockReturnValue(authContext);

  return render(
    <BrowserRouter>
      <Header />
    </BrowserRouter>
  );
};

describe('Header Navigation Role-Based Access Control', () => {
  describe('filterNavigationLinks function', () => {
    it('should show only public links for unauthenticated users', () => {
      const visibleLinks = filterNavigationLinks(navigationLinks, false, undefined);

      expect(visibleLinks).toHaveLength(2);
      expect(visibleLinks.map(link => link.path)).toEqual(['/', '/services']);
    });

    it('should show USER-accessible links for authenticated USER', () => {
      const visibleLinks = filterNavigationLinks(navigationLinks, true, ACCOUNT_ROLES.USER);

      const expectedPaths = ['/', '/services', '/dashboard', '/chat', '/account'];
      expect(visibleLinks).toHaveLength(5);
      expect(visibleLinks.map(link => link.path)).toEqual(expectedPaths);
    });

    it('should show COACH-accessible links for authenticated COACH', () => {
      const visibleLinks = filterNavigationLinks(navigationLinks, true, ACCOUNT_ROLES.COACH);

      const expectedPaths = [
        '/',
        '/services',
        '/dashboard',
        '/chat',
        '/account',
        '/coach-dashboard',
        '/custom-services',
      ];
      expect(visibleLinks).toHaveLength(7);
      expect(visibleLinks.map(link => link.path)).toEqual(expectedPaths);
    });

    it('should show all links for authenticated ADMIN', () => {
      const visibleLinks = filterNavigationLinks(navigationLinks, true, ACCOUNT_ROLES.ADMIN);

      const expectedPaths = [
        '/',
        '/services',
        '/dashboard',
        '/chat',
        '/account',
        '/coach-dashboard',
        '/custom-services',
        '/admin',
      ];
      expect(visibleLinks).toHaveLength(8);
      expect(visibleLinks.map(link => link.path)).toEqual(expectedPaths);
    });
  });

  describe('Header component rendering', () => {
    it('should render only public navigation for unauthenticated users', () => {
      renderHeaderWithAuth(null);

      // Should show public links
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Services')).toBeInTheDocument();

      // Should NOT show authenticated user links
      expect(screen.queryByText('My Sessions')).not.toBeInTheDocument();
      expect(screen.queryByText('Chat')).not.toBeInTheDocument();
      expect(screen.queryByText('Account')).not.toBeInTheDocument();
      expect(screen.queryByText('Coach Dashboard')).not.toBeInTheDocument();
      expect(screen.queryByText('Custom Services')).not.toBeInTheDocument();
      expect(screen.queryByText('Admin')).not.toBeInTheDocument();

      // Should show login/register buttons
      expect(screen.getByText('Login')).toBeInTheDocument();
      expect(screen.getByText('Sign Up')).toBeInTheDocument();
    });

    it('should render USER-accessible navigation for USER role', () => {
      const userAccount = {
        id: 'user123',
        email: 'user@example.com',
        role: ACCOUNT_ROLES.USER,
        name: 'Test User',
      };

      renderHeaderWithAuth(userAccount);

      // Should show user-accessible links
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Services')).toBeInTheDocument();
      expect(screen.getByText('My Sessions')).toBeInTheDocument();
      expect(screen.getByText('Chat')).toBeInTheDocument();
      expect(screen.getByText('Account')).toBeInTheDocument();

      // Should NOT show coach/admin links
      expect(screen.queryByText('Coach Dashboard')).not.toBeInTheDocument();
      expect(screen.queryByText('Custom Services')).not.toBeInTheDocument();
      expect(screen.queryByText('Admin')).not.toBeInTheDocument();

      // Should show user info and logout
      expect(screen.getByText('user@example.com')).toBeInTheDocument();
      expect(screen.getByText('Logout')).toBeInTheDocument();
      expect(screen.queryByText('(Coach)')).not.toBeInTheDocument();
      expect(screen.queryByText('(Admin)')).not.toBeInTheDocument();
    });

    it('should render COACH-accessible navigation for COACH role', () => {
      const coachAccount = {
        id: 'coach123',
        email: 'coach@example.com',
        role: ACCOUNT_ROLES.COACH,
        name: 'Test Coach',
      };

      renderHeaderWithAuth(coachAccount);

      // Should show coach-accessible links
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Services')).toBeInTheDocument();
      expect(screen.getByText('My Sessions')).toBeInTheDocument();
      expect(screen.getByText('Chat')).toBeInTheDocument();
      expect(screen.getByText('Account')).toBeInTheDocument();
      expect(screen.getByText('Coach Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Custom Services')).toBeInTheDocument();

      // Should NOT show admin links
      expect(screen.queryByText('Admin')).not.toBeInTheDocument();

      // Should show coach badge
      expect(screen.getByText('coach@example.com')).toBeInTheDocument();
      expect(screen.getByText('(Coach)')).toBeInTheDocument();
      expect(screen.queryByText('(Admin)')).not.toBeInTheDocument();
    });

    it('should render all navigation for ADMIN role', () => {
      const adminAccount = {
        id: 'admin123',
        email: 'admin@example.com',
        role: ACCOUNT_ROLES.ADMIN,
        name: 'Test Admin',
      };

      renderHeaderWithAuth(adminAccount);

      // Should show all links
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Services')).toBeInTheDocument();
      expect(screen.getByText('My Sessions')).toBeInTheDocument();
      expect(screen.getByText('Chat')).toBeInTheDocument();
      expect(screen.getByText('Account')).toBeInTheDocument();
      expect(screen.getByText('Coach Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Custom Services')).toBeInTheDocument();
      expect(screen.getByText('Admin')).toBeInTheDocument();

      // Should show admin badge
      expect(screen.getByText('admin@example.com')).toBeInTheDocument();
      expect(screen.getByText('(Admin)')).toBeInTheDocument();
    });
  });

  describe('Role badge display', () => {
    it('should not show role badge for USER', () => {
      const userAccount = {
        id: 'user123',
        email: 'user@example.com',
        role: ACCOUNT_ROLES.USER,
        name: 'Test User',
      };

      renderHeaderWithAuth(userAccount);
      expect(screen.queryByText('(Coach)')).not.toBeInTheDocument();
      expect(screen.queryByText('(Admin)')).not.toBeInTheDocument();
    });

    it('should show (Coach) badge for COACH role', () => {
      const coachAccount = {
        id: 'coach123',
        email: 'coach@example.com',
        role: ACCOUNT_ROLES.COACH,
        name: 'Test Coach',
      };

      renderHeaderWithAuth(coachAccount);
      expect(screen.getByText('(Coach)')).toBeInTheDocument();
    });

    it('should show (Admin) badge for ADMIN role', () => {
      const adminAccount = {
        id: 'admin123',
        email: 'admin@example.com',
        role: ACCOUNT_ROLES.ADMIN,
        name: 'Test Admin',
      };

      renderHeaderWithAuth(adminAccount);
      expect(screen.getByText('(Admin)')).toBeInTheDocument();
    });
  });
});
