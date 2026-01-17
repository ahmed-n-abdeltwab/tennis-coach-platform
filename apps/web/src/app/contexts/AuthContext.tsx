/**
 * Authentication Context
 *
 * Provides authentication state and methods throughout the application.
 * Uses the backend API for authentication operations via authService.
 *
 * @example
 * import { useAuth } from './contexts/AuthContext';
 *
 * function MyComponent() {
 *   const { account, isUser, isCoach, isAdmin, hasCoachAccess, login, logout } = useAuth();
 *
 *   if (!account) {
 *     return <LoginPrompt />;
 *   }
 *
 *   return <Dashboard account={account} />;
 * }
 */

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react';

import { apiClient } from '../../config/api-client';
import { authService } from '../services/auth.service';
import { isAppError } from '../services/error-handler';
import { ACCOUNT_ROLES, type AuthAccount } from '../services/types';

// ============================================================================
// Storage Keys
// ============================================================================

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  ACCOUNT: 'account',
} as const;

// ============================================================================
// Types
// ============================================================================

/**
 * Feature access configuration for role-based permissions.
 * Defines which roles can access specific features.
 */
const FEATURE_ACCESS = {
  // User management features
  'manage-users': [ACCOUNT_ROLES.ADMIN],
  'change-user-roles': [ACCOUNT_ROLES.ADMIN],

  // Custom services features
  'create-custom-services': [ACCOUNT_ROLES.COACH, ACCOUNT_ROLES.ADMIN],
  'manage-custom-services': [ACCOUNT_ROLES.COACH, ACCOUNT_ROLES.ADMIN],
  'send-custom-services': [ACCOUNT_ROLES.COACH, ACCOUNT_ROLES.ADMIN],

  // Analytics and dashboard features
  'access-analytics': [ACCOUNT_ROLES.COACH, ACCOUNT_ROLES.ADMIN],
  'view-user-statistics': [ACCOUNT_ROLES.COACH, ACCOUNT_ROLES.ADMIN],
  'view-financial-analytics': [ACCOUNT_ROLES.COACH, ACCOUNT_ROLES.ADMIN],
  'export-reports': [ACCOUNT_ROLES.COACH, ACCOUNT_ROLES.ADMIN],

  // Content management features
  'edit-home-content': [ACCOUNT_ROLES.COACH, ACCOUNT_ROLES.ADMIN],
  'manage-booking-types': [ACCOUNT_ROLES.COACH, ACCOUNT_ROLES.ADMIN],
  'manage-time-slots': [ACCOUNT_ROLES.COACH, ACCOUNT_ROLES.ADMIN],

  // System features
  'access-system-logs': [ACCOUNT_ROLES.ADMIN],
  'system-monitoring': [ACCOUNT_ROLES.ADMIN],
  'system-configuration': [ACCOUNT_ROLES.ADMIN],

  // Chat features
  'pin-conversations': [ACCOUNT_ROLES.COACH, ACCOUNT_ROLES.ADMIN],
  'manage-conversations': [ACCOUNT_ROLES.COACH, ACCOUNT_ROLES.ADMIN],

  // Account features (available to all authenticated users)
  'edit-profile': [ACCOUNT_ROLES.USER, ACCOUNT_ROLES.COACH, ACCOUNT_ROLES.ADMIN],
  'change-password': [ACCOUNT_ROLES.USER, ACCOUNT_ROLES.COACH, ACCOUNT_ROLES.ADMIN],
  'upload-profile-image': [ACCOUNT_ROLES.USER, ACCOUNT_ROLES.COACH, ACCOUNT_ROLES.ADMIN],
} as const;

/**
 * Dashboard paths for each role.
 * Used for redirecting users to their appropriate dashboard.
 */
const ROLE_DASHBOARD_PATHS = {
  [ACCOUNT_ROLES.USER]: '/dashboard',
  [ACCOUNT_ROLES.COACH]: '/coach-dashboard',
  [ACCOUNT_ROLES.ADMIN]: '/admin',
} as const;

/**
 * Authentication state managed by the context.
 */
interface AuthState {
  /** Current authenticated account, null if not authenticated */
  account: AuthAccount | null;
  /** JWT access token for API authentication */
  accessToken: string | null;
  /** JWT refresh token for obtaining new access tokens */
  refreshToken: string | null;
  /** Whether authentication state is being loaded/verified */
  loading: boolean;
  /** Error message from the last failed operation */
  error: string | null;
}

/**
 * Authentication context type exposed to consumers.
 */
interface AuthContextType extends AuthState {
  /** Log in with email and password */
  login: (email: string, password: string) => Promise<void>;
  /** Register a new account (always assigns USER role) */
  register: (email: string, password: string, name: string) => Promise<void>;
  /** Log out the current user */
  logout: () => Promise<void>;
  /** Attempt to refresh the authentication tokens */
  refreshAuth: () => Promise<void>;
  /** Whether the current user has USER role */
  isUser: boolean;
  /** Whether the current user has COACH role */
  isCoach: boolean;
  /** Whether the current user has ADMIN role */
  isAdmin: boolean;
  /** Whether the current user has COACH or ADMIN role (coach-level access) */
  hasCoachAccess: boolean;
  /** Whether the current user has ADMIN role (admin-level access) */
  hasAdminAccess: boolean;

  // Enhanced role-based access utilities
  /** Whether the current user can manage other users (Admin only) */
  canManageUsers: boolean;
  /** Whether the current user can create custom services (Coach or Admin) */
  canCreateCustomServices: boolean;
  /** Whether the current user can access analytics (Coach or Admin) */
  canAccessAnalytics: boolean;
  /** Whether the current user can access system-wide features (Admin only) */
  canAccessSystemFeatures: boolean;
  /** Whether the current user can edit home page content (Coach or Admin) */
  canEditContent: boolean;
  /** Get the appropriate dashboard path for the current user's role */
  getDashboardPath: () => string;
  /** Check if user has access to a specific feature based on role */
  hasFeatureAccess: (feature: string) => boolean;
}

// ============================================================================
// Reducer
// ============================================================================

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | {
      type: 'SET_AUTH';
      payload: { account: AuthAccount; accessToken: string; refreshToken: string };
    }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_AUTH' }
  | { type: 'CLEAR_ERROR' };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_AUTH':
      return {
        ...state,
        account: action.payload.account,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken,
        loading: false,
        error: null,
      };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'CLEAR_AUTH':
      return {
        account: null,
        accessToken: null,
        refreshToken: null,
        loading: false,
        error: null,
      };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}

// ============================================================================
// Context
// ============================================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================================
// Storage Helpers
// ============================================================================

/**
 * Saves authentication data to localStorage.
 */
function saveAuthToStorage(accessToken: string, refreshToken: string, account: AuthAccount): void {
  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
  localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
  localStorage.setItem(STORAGE_KEYS.ACCOUNT, JSON.stringify(account));
}

/**
 * Clears authentication data from localStorage.
 */
function clearAuthFromStorage(): void {
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.ACCOUNT);
}

/**
 * Loads authentication data from localStorage.
 */
function loadAuthFromStorage(): {
  accessToken: string;
  refreshToken: string;
  account: AuthAccount;
} | null {
  const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  const accountJson = localStorage.getItem(STORAGE_KEYS.ACCOUNT);

  if (!accessToken || !refreshToken || !accountJson) {
    return null;
  }

  try {
    const account = JSON.parse(accountJson) as AuthAccount;
    return { accessToken, refreshToken, account };
  } catch {
    // Invalid JSON in storage, clear it
    clearAuthFromStorage();
    return null;
  }
}

/**
 * Extracts error message from various error types.
 */
function getErrorMessage(error: unknown): string {
  if (isAppError(error)) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}

// ============================================================================
// Provider Component
// ============================================================================

/**
 * Authentication provider component.
 *
 * Wraps the application to provide authentication state and methods.
 * Automatically restores authentication state from localStorage on mount.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, {
    account: null,
    accessToken: null,
    refreshToken: null,
    loading: true,
    error: null,
  });

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    const storedAuth = loadAuthFromStorage();

    if (storedAuth) {
      // Set the auth token on ApiClient
      apiClient.setAuthToken(storedAuth.accessToken);

      dispatch({
        type: 'SET_AUTH',
        payload: storedAuth,
      });
    } else {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  /**
   * Log in with email and password.
   */
  const login = useCallback(async (email: string, password: string): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });

    try {
      const response = await authService.login(email, password);
      const { accessToken, refreshToken, account } = response;

      // Save to localStorage
      saveAuthToStorage(accessToken, refreshToken, account);

      // Set auth token on ApiClient
      apiClient.setAuthToken(accessToken);

      dispatch({
        type: 'SET_AUTH',
        payload: { account, accessToken, refreshToken },
      });
    } catch (error) {
      const message = getErrorMessage(error);
      dispatch({ type: 'SET_ERROR', payload: message });
      throw error;
    }
  }, []);

  /**
   * Register a new account.
   * Always assigns USER role - role selection is not allowed during registration.
   */
  const register = useCallback(
    async (email: string, password: string, name: string): Promise<void> => {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      try {
        // Always register with USER role - do not pass role parameter
        const response = await authService.signup(email, password, name);
        const { accessToken, refreshToken, account } = response;

        // Save to localStorage
        saveAuthToStorage(accessToken, refreshToken, account);

        // Set auth token on ApiClient
        apiClient.setAuthToken(accessToken);

        dispatch({
          type: 'SET_AUTH',
          payload: { account, accessToken, refreshToken },
        });
      } catch (error) {
        const message = getErrorMessage(error);
        dispatch({ type: 'SET_ERROR', payload: message });
        throw error;
      }
    },
    []
  );

  /**
   * Log out the current user.
   */
  const logout = useCallback(async (): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      await authService.logout();
    } catch {
      // Even if server logout fails, we still clear local state
      // This handles cases where the token is already invalid
    } finally {
      // Clear localStorage
      clearAuthFromStorage();

      // Clear auth token from ApiClient
      apiClient.clearAuthToken();

      dispatch({ type: 'CLEAR_AUTH' });
    }
  }, []);

  /**
   * Attempt to refresh the authentication tokens.
   */
  const refreshAuth = useCallback(async (): Promise<void> => {
    try {
      const response = await authService.refreshToken();
      const { accessToken, refreshToken, account } = response;

      // Save to localStorage
      saveAuthToStorage(accessToken, refreshToken, account);

      // Set auth token on ApiClient
      apiClient.setAuthToken(accessToken);

      dispatch({
        type: 'SET_AUTH',
        payload: { account, accessToken, refreshToken },
      });
    } catch (error) {
      // Refresh failed, clear auth state
      clearAuthFromStorage();
      apiClient.clearAuthToken();
      dispatch({ type: 'CLEAR_AUTH' });
      throw error;
    }
  }, []);

  // Computed properties for role checking
  const isUser = useMemo(() => {
    return state.account?.role === ACCOUNT_ROLES.USER;
  }, [state.account?.role]);

  const isCoach = useMemo(() => {
    return state.account?.role === ACCOUNT_ROLES.COACH;
  }, [state.account?.role]);

  const isAdmin = useMemo(() => {
    return state.account?.role === ACCOUNT_ROLES.ADMIN;
  }, [state.account?.role]);

  const hasCoachAccess = useMemo(() => {
    return (
      state.account?.role === ACCOUNT_ROLES.COACH || state.account?.role === ACCOUNT_ROLES.ADMIN
    );
  }, [state.account?.role]);

  const hasAdminAccess = useMemo(() => {
    return state.account?.role === ACCOUNT_ROLES.ADMIN;
  }, [state.account?.role]);

  // Enhanced role-based access utilities
  const canManageUsers = useMemo(() => {
    return state.account?.role === ACCOUNT_ROLES.ADMIN;
  }, [state.account?.role]);

  const canCreateCustomServices = useMemo(() => {
    return hasCoachAccess;
  }, [hasCoachAccess]);

  const canAccessAnalytics = useMemo(() => {
    return hasCoachAccess;
  }, [hasCoachAccess]);

  const canAccessSystemFeatures = useMemo(() => {
    return hasAdminAccess;
  }, [hasAdminAccess]);

  const canEditContent = useMemo(() => {
    return hasCoachAccess;
  }, [hasCoachAccess]);

  /**
   * Get the appropriate dashboard path for the current user's role.
   * Returns the default user dashboard if no account is available.
   */
  const getDashboardPath = useCallback((): string => {
    if (!state.account?.role) {
      return ROLE_DASHBOARD_PATHS[ACCOUNT_ROLES.USER];
    }
    return ROLE_DASHBOARD_PATHS[state.account.role] || ROLE_DASHBOARD_PATHS[ACCOUNT_ROLES.USER];
  }, [state.account?.role]);

  /**
   * Check if user has access to a specific feature based on role.
   * @param feature - The feature key to check access for
   * @returns true if the user has access to the feature, false otherwise
   */
  const hasFeatureAccess = useCallback(
    (feature: string): boolean => {
      if (!state.account?.role) {
        return false;
      }

      const allowedRoles = FEATURE_ACCESS[feature as keyof typeof FEATURE_ACCESS];
      if (!allowedRoles) {
        // Feature not defined in access control, deny by default
        return false;
      }

      return (allowedRoles as readonly string[]).includes(state.account.role);
    },
    [state.account?.role]
  );

  const contextValue = useMemo<AuthContextType>(
    () => ({
      ...state,
      login,
      register,
      logout,
      refreshAuth,
      isUser,
      isCoach,
      isAdmin,
      hasCoachAccess,
      hasAdminAccess,
      canManageUsers,
      canCreateCustomServices,
      canAccessAnalytics,
      canAccessSystemFeatures,
      canEditContent,
      getDashboardPath,
      hasFeatureAccess,
    }),
    [
      state,
      login,
      register,
      logout,
      refreshAuth,
      isUser,
      isCoach,
      isAdmin,
      hasCoachAccess,
      hasAdminAccess,
      canManageUsers,
      canCreateCustomServices,
      canAccessAnalytics,
      canAccessSystemFeatures,
      canEditContent,
      getDashboardPath,
      hasFeatureAccess,
    ]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to access authentication context.
 *
 * @throws Error if used outside of AuthProvider
 *
 * @example
 * const {
 *   account,
 *   isUser,
 *   isCoach,
 *   isAdmin,
 *   hasCoachAccess,
 *   hasAdminAccess,
 *   canManageUsers,
 *   canCreateCustomServices,
 *   canAccessAnalytics,
 *   getDashboardPath,
 *   hasFeatureAccess,
 *   login,
 *   logout
 * } = useAuth();
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
