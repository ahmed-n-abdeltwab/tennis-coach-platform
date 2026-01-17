import { SESSION_STATUSES, type Session, type SessionStatus } from '../../services/types';

interface SessionCardProps {
  /** The session to display */
  session: Session;
  /** Callback when cancel button is clicked */
  onCancel?: (session: Session) => void;
  /** Whether the cancel action is in progress */
  isCancelling?: boolean;
  /** Variant style: 'default' for full card, 'compact' for smaller display */
  variant?: 'default' | 'compact';
}

/**
 * Status color configuran for visual differentiation.
 */
const STATUS_COLORS: Record<SessionStatus, { bg: string; text: string; border: string }> = {
  SCHEDULED: {
    bg: 'bg-blue-500/20',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
  },
  CONFIRMED: {
    bg: 'bg-green-500/20',
    text: 'text-green-400',
    border: 'border-green-500/30',
  },
  COMPLETED: {
    bg: 'bg-gray-500/20',
    text: 'text-gray-400',
    border: 'border-gray-500/30',
  },
  CANCELLED: {
    bg: 'bg-red-500/20',
    text: 'text-red-400',
    border: 'border-red-500/30',
  },
  NO_SHOW: {
    bg: 'bg-yellow-500/20',
    text: 'text-yellow-400',
    border: 'border-yellow-500/30',
  },
};

/**
 * Reusable card component for displaying session information.
 *
 * Shows session date/time, duration, status, coach name, and booking type name.
 * Includes status color coding and cancel button for SCHEDULED sessions.
 *
 *
 * @example
 * // Basic usage
 * <SessionCard session={session} />
 *
 * @example
 * // With cancel functionality
 * <SessionCard
 *   session={session}
 *   onCancel={(s) => handleCancel(s.id)}
 *   isCancelling={cancellingId === session.id}
 * />
 *
 * @example
 * // Compact variant for lists
 * <SessionCard session={session} variant="compact" />
 */
function SessionCard({
  session,
  onCancel,
  isCancelling = false,
  variant = 'default',
}: SessionCardProps) {
  const status = session.status ?? SESSION_STATUSES.SCHEDULED;
  const statusColors = STATUS_COLORS[status];
  const canCancel = status === SESSION_STATUSES.SCHEDULED && onCancel;

  const handleCancel = () => {
    if (onCancel && !isCancelling) {
      onCancel(session);
    }
  };

  // Extract coach name from timeSlot.coach if available
  const coachName = session.timeSlot?.coach?.name ?? 'Unknown Coach';
  const bookingTypeName = session.bookingType?.name ?? 'Unknown Service';
  const durationMin = session.timeSlot?.durationMin ?? 60;

  if (variant === 'compact') {
    return (
      <div
        className={`bg-gray-700 rounded-lg p-4 border ${statusColors.border}`}
        role='article'
        aria-label={`Session with ${coachName} - ${bookingTypeName}`}
      >
        <div className='flex justify-between items-start'>
          <div className='flex-1 min-w-0'>
            <div className='flex items-center gap-2 mb-1'>
              <StatusBadge status={status} />
              <span className='text-white font-medium truncate'>{bookingTypeName}</span>
            </div>
            <p className='text-gray-400 text-sm'>with {coachName}</p>
            <p className='text-gray-500 text-sm mt-1'>
              {formatDateTime(session.dateTime)} · {durationMin} min
            </p>
          </div>
          {canCancel && <CancelButton onClick={handleCancel} isLoading={isCancelling} size='sm' />}
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div
      className={`bg-gray-700 rounded-lg p-5 border ${statusColors.border}`}
      role='article'
      aria-label={`Session with ${coachName} - ${bookingTypeName}`}
    >
      <div className='flex justify-between items-start mb-4'>
        <div>
          <h3 className='text-lg font-semibold text-white mb-1'>{bookingTypeName}</h3>
          <p className='text-gray-400'>with {coachName}</p>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className='grid grid-cols-2 gap-4 mb-4'>
        <div>
          <p className='text-gray-500 text-sm mb-1'>Date & Time</p>
          <p className='text-white'>{formatDateTime(session.dateTime)}</p>
        </div>
        <div>
          <p className='text-gray-500 text-sm mb-1'>Duration</p>
          <p className='text-white'>{durationMin} minutes</p>
        </div>
      </div>

      {session.notes && (
        <div className='mb-4'>
          <p className='text-gray-500 text-sm mb-1'>Notes</p>
          <p className='text-gray-300 text-sm'>{session.notes}</p>
        </div>
      )}

      {canCancel && (
        <div className='flex justify-end pt-2 border-t border-gray-600'>
          <CancelButton onClick={handleCancel} isLoading={isCancelling} />
        </div>
      )}
    </div>
  );
}

/**
 * Status badge component for displaying session status with color coding.
 */
interface StatusBadgeProps {
  status: SessionStatus;
}

function StatusBadge({ status }: StatusBadgeProps) {
  const colors = STATUS_COLORS[status];
  const displayText = formatStatusText(status);

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}
    >
      {displayText}
    </span>
  );
}

/**
 * Cancel button component with loading state.
 */
interface CancelButtonProps {
  onClick: () => void;
  isLoading: boolean;
  size?: 'sm' | 'md';
}

function CancelButton({ onClick, isLoading, size = 'md' }: CancelButtonProps) {
  const sizeClasses = size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2';

  return (
    <button
      type='button'
      onClick={onClick}
      disabled={isLoading}
      className={`${sizeClasses} bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
      aria-label='Cancel session'
    >
      {isLoading ? (
        <span className='flex items-center gap-2'>
          <svg className='animate-spin h-4 w-4' fill='none' viewBox='0 0 24 24' aria-hidden='true'>
            <circle
              className='opacity-25'
              cx='12'
              cy='12'
              r='10'
              stroke='currentColor'
              strokeWidth='4'
            />
            <path
              className='opacity-75'
              fill='currentColor'
              d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
            />
          </svg>
          Cancelling...
        </span>
      ) : (
        'Cancel'
      )}
    </button>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Formats a date/time string for display.
 */
function formatDateTime(dateTime: string | null | undefined): string {
  if (!dateTime) {
    return 'Date not set';
  }

  const date = new Date(dateTime);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Formats status enum to display text.
 */
function formatStatusText(status: SessionStatus): string {
  const statusTextMap: Record<SessionStatus, string> = {
    SCHEDULED: 'Scheduled',
    CONFIRMED: 'Confirmed',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    NO_SHOW: 'No Show',
  };

  return statusTextMap[status];
}

export default SessionCard;
