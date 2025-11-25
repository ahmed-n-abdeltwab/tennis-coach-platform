import api from '@services/api';
import { ReactNode, createContext, useContext, useEffect, useReducer } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  type: 'user' | 'coach';
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string, isCoach?: boolean) => Promise<void>;
  register: (email: string, password: string, name: string, isCoach?: boolean) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: { user: User; token: string } }
  | { type: 'CLEAR_USER' };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_USER':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        loading: false,
      };
    case 'CLEAR_USER':
      return { user: null, token: null, loading: false };
    default:
      return state;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    token: null,
    loading: true,
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        dispatch({ type: 'SET_USER', payload: { user, token } });
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      } catch  {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }

    dispatch({ type: 'SET_LOADING', payload: false });
  }, []);

  const login = async (email: string, password: string, isCoach = false) => {
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const endpoint = isCoach ? '/auth/coach/login' : '/auth/login';
      const response = await api.post(endpoint, { email, password });
      const { user, token } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      dispatch({ type: 'SET_USER', payload: { user, token } });
    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false });
      throw error;
    }
  };

  const register = async (email: string, password: string, name: string, isCoach = false) => {
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const endpoint = isCoach ? '/auth/coach/register' : '/auth/register';
      const response = await api.post(endpoint, { email, password, name });
      const { user, token } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      dispatch({ type: 'SET_USER', payload: { user, token } });
    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false });
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete api.defaults.headers.common['Authorization'];
    dispatch({ type: 'CLEAR_USER' });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
