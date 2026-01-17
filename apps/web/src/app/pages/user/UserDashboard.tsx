import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { ErrorMessage, LoadingSpinner } from '../../components/Common';
import SessionList from '../../components/Session/SessionList';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { isAppError } from '../../services/error-handler';
import { sessionService } from '../../services/session.service';
import type { Session, SessionStatus } from '../../services/types';

/**
 * Dashboard page state interface.
 */
interface DashboardState {
  /** Array of user sessions */
  sessions: Session[];
  /** Whether sessions are being loaded */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Current status filter value */
  statusFilter: SessionStatus | 'ALL';
  /** ID of session currently being cancelled */
  cancellingSessionId: string | null;
}

/**
 * Initial state for the dashboard.
 */
const initialState: DashboardState = {
  sessions: [],
  loading: true,
  error: null,
  statusFilter: 'ALL',
  cancellingSessionId: null,
};

/**
 * User Dashboard page component.
 *
 * Fetches and displays the authenticated user's sessions with:
 * - Status filtering (SCHEDULED, CONFIRMED, COMPLETED, CANCELLED, NO_SHOW)
 * - Session cancellation for SCHEDULED sessions
 * - Loading and error states
 */
function UserDashboard() {
  const { account } = useAuth();
  const { addNotification } = useNotification();
  const [state, setState] = useState<DashboardState>(initialState);

  /**
   * Handles status filter change.
   */
  const handleStatusFilterChange = useCallback((status: SessionStatus | 'ALL') => {
    setState(prev => ({ ...prev, statusFilter: status }));
  }, []);

  /**
   * Fetches user sessions from the API.
   */
  const fetchSessions = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const sessions = await sessionService.getSessions();
      setState(prev => ({ ...prev, sessions, loading: false }));
    } catch (error) {
      const message = isAppError(error) ? error.message : 'Failed to load sessions';
      setState(prev => ({ ...prev, error: message, loading: false }));
    }
  }, []);

  /**
   * Handles session cancellation.
   */
  const handleCancelSession = useCallback(
    async (session: Session) => {
      if (!session.id) {
        addNotification('error', 'Cannot cancel session: Invalid session ID');
        return;
      }

      setState(prev => ({ ...prev, cancellingSessionId: session.id ?? null }));

      try {
        const cancelledSession = await sessionService.cancelSession(session.id);

        // Update the session in the list
        setState(prev => ({
          ...prev,
          sessions: prev.sessions.map(s => (s.id === cancelledSession.id ? cancelledSession : s)),
          cancellingSessionId: null,
        }));

        addNotification('success', 'Session cancelled successfully');
      } catch (error) {
        const message = isAppError(error) ? error.message : 'Failed to cancel session';
        addNotification('error', message);
        setState(prev => ({ ...prev, cancellingSessionId: null }));
      }
    },
    [addNotification]
  );

  // Fetch sessions on mount
  useEffect(() => {
    let isMounted = true;

    const loadSessions = async () => {
      try {
        const sessions = await sessionService.getSessions();
        if (isMounted) {
          setState(prev => ({ ...prev, sessions, loading: false }));
        }
      } catch (error) {
        if (isMounted) {
          const message = isAppError(error) ? error.message : 'Failed to load sessions';
          setState(prev => ({ ...prev, error: message, loading: false }));
          addNotification('error', message);
        }
      }
    };

    loadSessions();

    return () => {
      isMounted = false;
    };
  }, [addNotification]);

  // Loading state
  if (state.loading) {
    return (
      <div className='container mx-auto px-4 py-8'>
        <h1 className='text-3xl font-bold mb-6 text-white'>My Sessions</h1>
        <LoadingSpinner fullScreen message='Loading your sessions...' />
      </div>
    );
  }

  // Error state
  if (state.error) {
    return (
      <div className='container mx-auto px-4 py-8'>
        <h1 className='text-3xl font-bold mb-6 text-white'>My Sessions</h1>
        <ErrorMessage
          variant='card'
          title='Failed to Load Sessions'
          message={state.error}
          onRetry={fetchSessions}
          retryText='Try Again'
        />
      </div>
    );
  }

  return (
    <div className='container mx-auto px-4 py-8'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6'>
        <div>
          <h1 className='text-3xl font-bold text-white'>My Sessions</h1>
          {account && <p className='text-gray-400 mt-1'>Welcome back, {account.email}</p>}
        </div>
        <Link
          to='/book'
          className='bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-semibold transition-colors'
        >
          Book New Session
        </Link>
      </div>

      {/* Session List */}
      <SessionList
        sessions={state.sessions}
        showFilter
        statusFilter={state.statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
        onCancelSession={handleCancelSession}
        cancellingSessionId={state.cancellingSessionId}
        emptyMessage='You have no sessions yet. Book your first session to get started!'
      />

      {/* Quick Stats */}
      {state.sessions.length > 0 && <SessionStats sessions={state.sessions} />}
    </div>
  );
}

/**
 * Session statistics component.
 * Displays a summary of session counts by status.
 */
interface SessionStatsProps {
  sessions: Session[];
}

function SessionStats({ sessions }: SessionStatsProps) {
  const stats = {
    scheduled: sessions.filter(s => s.status === 'SCHEDULED').length,
    confirmed: sessions.filter(s => s.status === 'CONFIRMED').length,
    completed: sessions.filter(s => s.status === 'COMPLETED').length,
    cancelled: sessions.filter(s => s.status === 'CANCELLED').length,
  };

  const upcomingCount = stats.scheduled + stats.confirmed;

  return (
    <div className='mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4'>
      <StatCard label='Upcoming' value={upcomingCount} color='blue' />
      <StatCard label='Completed' value={stats.completed} color='green' />
      <StatCard label='Cancelled' value={stats.cancelled} color='red' />
      <StatCard label='Total' value={sessions.length} color='gray' />
    </div>
  );
}

/**
 * Individual stat card component.
 */
interface StatCardProps {
  label: string;
  value: number;
  color: 'blue' | 'green' | 'red' | 'gray';
}

function StatCard({ label, value, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    green: 'bg-green-500/20 text-green-400 border-green-500/30',
    red: 'bg-red-500/20 text-red-400 border-red-500/30',
    gray: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };

  return (
    <div className={`rounded-lg p-4 border ${colorClasses[color]}`}>
      <p className='text-2xl font-bold'>{value}</p>
      <p className='text-sm opacity-80'>{label}</p>
    </div>
  );
}

export default UserDashboard;
