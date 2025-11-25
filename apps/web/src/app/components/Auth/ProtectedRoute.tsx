import { useAuth } from '@contexts/AuthContext';
import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: ReactNode;
  requireCoach?: boolean;
}

function ProtectedRoute({ children, requireCoach = false }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className='flex justify-center items-center min-h-96'>
        <div className='animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500'></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to='/login' replace />;
  }

  if (requireCoach && user.type !== 'coach') {
    return <Navigate to='/dashboard' replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
