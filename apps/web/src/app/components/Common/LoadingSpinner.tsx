interface LoadingSpinnerProps {
  /** Size of the spinner: 'sm' (24px), 'md' (48px), 'lg' (96px) */
  size?: 'sm' | 'md' | 'lg';
  /** Optional message to display below the spinner */
  message?: string;
  /** Whether to center the spinner in a full-height container */
  fullScreen?: boolean;
}

/**
 * Reusable loading spinner component with consistent styling.
 *
 * Provides visual feedback during API calls and loading states.
 * Supports multiple sizes and optional loading message.
 *
 * @example
 * // Basic usage
 * <LoadingSpinner />
 *
 * @example
 * // With message
 * <LoadingSpinner message="Loading sessions..." />
 *
 * @example
 * // Full screen centered
 * <LoadingSpinner fullScreen size="lg" message="Please wait..." />
 *
 * @example
 * // Small inline spinner
 * <LoadingSpinner size="sm" />
 */
function LoadingSpinner({ size = 'md', message, fullScreen = false }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-6 w-6 border-2',
    md: 'h-12 w-12 border-2',
    lg: 'h-24 w-24 border-4',
  };

  const containerClasses = fullScreen
    ? 'flex flex-col justify-center items-center min-h-96'
    : 'flex flex-col justify-center items-center';

  return (
    <div className={containerClasses} role='status' aria-label='Loading'>
      <div
        className={`animate-spin rounded-full border-orange-500 border-t-transparent ${sizeClasses[size]}`}
      />
      {message && <p className='mt-4 text-gray-600 text-sm'>{message}</p>}
      <span className='sr-only'>Loading...</span>
    </div>
  );
}

export default LoadingSpinner;
