interface ErrorMessageProps {
  /** The error message to display */
  message: string;
  /** Optional title for the error (defaults to "Error") */
  title?: string;
  /** Optional callback function for retry action */
  onRetry?: () => void;
  /** Text for the retry button (defaults to "Try Again") */
  retryText?: string;
  /** Variant style: 'inline' for compact, 'card' for full card display */
  variant?: 'inline' | 'card';
}

/**
 * Reusable error message component with optional retry functionality.
 *
 * Displays user-friendly error messages with consistent styling.
 * Supports retry option for network errors and recoverable failures.
 *
 * @example
 * // Basic error message
 * <ErrorMessage message="Failed to load data" />
 *
 * @example
 * // With retry option
 * <ErrorMessage
 *   message="Network error occurred"
 *   onRetry={() => refetchData()}
 * />
 *
 * @example
 * // Card variant with custom title
 * <ErrorMessage
 *   variant="card"
 *   title="Connection Failed"
 *   message="Unable to connect to the server. Please check your internet connection."
 *   onRetry={handleRetry}
 *   retryText="Reconnect"
 * />
 */
function ErrorMessage({
  message,
  title = 'Error',
  onRetry,
  retryText = 'Try Again',
  variant = 'inline',
}: ErrorMessageProps) {
  if (variant === 'card') {
    return (
      <div
        className='bg-red-50 border border-red-200 rounded-lg p-6 text-center'
        role='alert'
        aria-live='polite'
      >
        <div className='flex justify-center mb-4'>
          <svg
            className='h-12 w-12 text-red-500'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
            aria-hidden='true'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
            />
          </svg>
        </div>
        <h3 className='text-lg font-semibold text-red-800 mb-2'>{title}</h3>
        <p className='text-red-600 mb-4'>{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className='bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-semibold transition-colors'
          >
            {retryText}
          </button>
        )}
      </div>
    );
  }

  // Inline variant (default)
  return (
    <div
      className='flex items-center justify-between bg-red-50 border border-red-200 rounded-lg px-4 py-3'
      role='alert'
      aria-live='polite'
    >
      <div className='flex items-center'>
        <svg
          className='h-5 w-5 text-red-500 mr-3 shrink-0'
          fill='none'
          viewBox='0 0 24 24'
          stroke='currentColor'
          aria-hidden='true'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
          />
        </svg>
        <span className='text-red-700'>{message}</span>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className='ml-4 text-red-600 hover:text-red-800 font-medium text-sm underline transition-colors'
        >
          {retryText}
        </button>
      )}
    </div>
  );
}

export default ErrorMessage;
