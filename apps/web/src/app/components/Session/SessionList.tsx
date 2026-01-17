import { SESSION_STATUSES, type Session, type SessionStatus } from '../../services/types';

import SessionCard from './SessionCard';

interface SessionListProps {
  /** Array of sessions to display */
  sessions: Session[];
  /** Callback when a session cancel button is clicked */
  onCancelSession?: (session: Session) => void;
  /** ID of the session currently being cancelled (for loading state) */
  cancellingSessionId?: string | null;
  /** Current status filter value */
  statusFilter?: SessionStatus | 'ALL';
  /** Callback when status filter changes */
  onStatusFilterChange?: (status: SessionStatus | 'ALL') => void;
  /** Whether to show the status filter dropdown */
  showFilter?: boolean;
  /** Variant for session cards */
  cardVariant?: 'default' | 'compact';
  /** Empty state message */
  emptyMessage?: string;
}

/**
 * Status filter options for the dropdown.
 */
const STATUS_OPTIONS: Array<{ value: SessionStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All Sessions' },
  { value: SESSION_STATUSES.SCHEDULED, label: 'Scheduled' },
  { value: SESSION_STATUSES.CONFIRMED, label: 'Confirmed' },
  { value: SESSION_STATUSES.COMPLETED, label: 'Completed' },
  { value: SESSION_STATUSES.CANCELLED, label: 'Cancelled' },
  { value: SESSION_STATUSES.NO_SHOW, label: 'No Show' },
];

/**
 * Component for displaying a list of sessions with optional status filtering.
 *
 * Renders SessionCard components for each session and provides a status filter dropdown.
 * Supports cancel functionality and loading states.
 *
 *
 * @example
 * // Basic usage
 * <SessionList sessions={sessions} />
 *
 * @example
 * // With filtering and cancel functionality
 * <SessionList
 *   sessions={sessions}
 *   showFilter
 *   statusFilter={filter}
 *   onStatusFilterChange={setFilter}
 *   onCancelSession={handleCancel}
 *   cancellingSessionId={cancellingId}
 * />
 *
 * @example
 * // Compact variant
 * <SessionList
 *   sessions={sessions}
 *   cardVariant="compact"
 *   emptyMessage="No upcoming sessions"
 * />
 */
function SessionList({
  sessions,
  onCancelSession,
  cancellingSessionId,
  statusFilter = 'ALL',
  onStatusFilterChange,
  showFilter = false,
  cardVariant = 'default',
  emptyMessage = 'No sessions found',
}: SessionListProps) {
  /**
   * Filters sessions based on the current status filter.
   */
  const filteredSessions =
    statusFilter === 'ALL' ? sessions : sessions.filter(session => session.status === statusFilter);

  /**
   * Sorts sessions by date (most recent first for completed/cancelled, upcoming first for others).
   */
  const sortedSessions = [...filteredSessions].sort((a, b) => {
    const dateA = new Date(a.dateTime ?? 0).getTime();
    const dateB = new Date(b.dateTime ?? 0).getTime();

    // For completed/cancelled sessions, show most recent first
    if (
      statusFilter === SESSION_STATUSES.COMPLETED ||
      statusFilter === SESSION_STATUSES.CANCELLED
    ) {
      return dateB - dateA;
    }

    // For other statuses, show upcoming first
    return dateA - dateB;
  });

  const handleFilterChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (onStatusFilterChange) {
      onStatusFilterChange(event.target.value as SessionStatus | 'ALL');
    }
  };

  return (
    <div className='space-y-4'>
      {showFilter && (
        <div className='flex justify-between items-center'>
          <p className='text-gray-400 text-sm'>
            {filteredSessions.length} session{filteredSessions.length !== 1 ? 's' : ''}
            {statusFilter !== 'ALL' && ` (${formatFilterLabel(statusFilter)})`}
          </p>
          <StatusFilterDropdown value={statusFilter} onChange={handleFilterChange} />
        </div>
      )}

      {sortedSessions.length === 0 ? (
        <EmptyState message={emptyMessage} statusFilter={statusFilter} />
      ) : (
        <div className='space-y-4'>
          {sortedSessions.map(session => (
            <SessionCard
              key={session.id}
              session={session}
              variant={cardVariant}
              onCancel={onCancelSession}
              isCancelling={cancellingSessionId === session.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Status filter dropdown component.
 */
interface StatusFilterDropdownProps {
  value: SessionStatus | 'ALL';
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
}

function StatusFilterDropdown({ value, onChange }: StatusFilterDropdownProps) {
  return (
    <div className='relative'>
      <select
        value={value}
        onChange={onChange}
        className='appearance-none bg-gray-700 text-white px-4 py-2 pr-10 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent cursor-pointer'
        aria-label='Filter sessions by status'
      >
        {STATUS_OPTIONS.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <div className='absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none'>
        <svg
          className='h-5 w-5 text-gray-400'
          fill='none'
          viewBox='0 0 24 24'
          stroke='currentColor'
          aria-hidden='true'
        >
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' />
        </svg>
      </div>
    </div>
  );
}

/**
 * Empty state component when no sessions match the filter.
 */
interface EmptyStateProps {
  message: string;
  statusFilter: SessionStatus | 'ALL';
}

function EmptyState({ message, statusFilter }: EmptyStateProps) {
  const getEmptyIcon = () => {
    if (
      statusFilter === SESSION_STATUSES.SCHEDULED ||
      statusFilter === SESSION_STATUSES.CONFIRMED
    ) {
      return (
        <svg
          className='w-12 h-12 text-gray-500 mx-auto mb-4'
          fill='none'
          viewBox='0 0 24 24'
          stroke='currentColor'
          aria-hidden='true'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
          />
        </svg>
      );
    }

    return (
      <svg
        className='w-12 h-12 text-gray-500 mx-auto mb-4'
        fill='none'
        viewBox='0 0 24 24'
        stroke='currentColor'
        aria-hidden='true'
      >
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth={2}
          d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'
        />
      </svg>
    );
  };

  return (
    <div className='text-center py-12 bg-gray-800 rounded-lg'>
      {getEmptyIcon()}
      <p className='text-gray-400'>{message}</p>
      {statusFilter !== 'ALL' && (
        <p className='text-gray-500 text-sm mt-2'>
          Try selecting a different filter to see more sessions
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Formats the filter label for display in the count text.
 */
function formatFilterLabel(status: SessionStatus): string {
  const labelMap: Record<SessionStatus, string> = {
    SCHEDULED: 'scheduled',
    CONFIRMED: 'confirmed',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    NO_SHOW: 'no show',
  };

  return labelMap[status];
}

export default SessionList;
