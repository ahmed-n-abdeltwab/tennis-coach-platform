import type { BookingType } from '../../services/types';

interface BookingTypeCardProps {
  /** The booking type to display */
  bookingType: BookingType;
  /** Whether this booking type is currently selected */
  isSelected?: boolean;
  /** Callback when the booking type is clicked/selected */
  onSelect?: (bookingType: BookingType) => void;
  /** Whether the card is disabled (not selectable) */
  disabled?: boolean;
  /** Variant style: 'default' for standard card, 'compact' for smaller display */
  variant?: 'default' | 'compact';
}

/**
 * Reusable card component for displaying booking type information.
 *
 * Shows booking type name, description, and base price with selection capability.
 * Supports selected state highlighting and disabled state.
 *
 *
 * @example
 * // Basic usage with selection
 * <BookingTypeCard
 *   bookingType={bookingType}
 *   onSelect={(bt) => setSelectedType(bt)}
 * />
 *
 * @example
 * // With selected state
 * <BookingTypeCard
 *   bookingType={bookingType}
 *   isSelected={selectedType?.id === bookingType.id}
 *   onSelect={handleSelect}
 * />
 *
 * @example
 * // Compact variant for lists
 * <BookingTypeCard
 *   bookingType={bookingType}
 *   variant="compact"
 *   onSelect={handleSelect}
 * />
 */
function BookingTypeCard({
  bookingType,
  isSelected = false,
  onSelect,
  disabled = false,
  variant = 'default',
}: BookingTypeCardProps) {
  /**
   * Formats the price for display.
   * Returns "Price on request" if price is null/undefined.
   */
  const formatPrice = (price: number | null | undefined): string => {
    if (price === null || price === undefined) {
      return 'Price on request';
    }
    return `$${price.toFixed(2)}`;
  };

  const handleClick = () => {
    if (!disabled && onSelect) {
      onSelect(bookingType);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if ((event.key === 'Enter' || event.key === ' ') && !disabled && onSelect) {
      event.preventDefault();
      onSelect(bookingType);
    }
  };

  // Base classes for both variants
  const baseClasses = `
    rounded-lg text-left transition-all w-full
    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    ${onSelect ? 'focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-900' : ''}
  `;

  // Selected state classes
  const selectedClasses = isSelected
    ? 'bg-orange-500/20 border-2 border-orange-500'
    : 'bg-gray-700 hover:bg-gray-600 border-2 border-transparent';

  // Variant-specific classes
  const variantClasses = variant === 'compact' ? 'p-4' : 'p-5';

  const cardClasses = `${baseClasses} ${selectedClasses} ${variantClasses}`.trim();

  // Render as button if selectable, otherwise as div
  const CardElement = onSelect ? 'button' : 'div';
  const cardProps = onSelect
    ? {
        type: 'button' as const,
        onClick: handleClick,
        onKeyDown: handleKeyDown,
        disabled,
        'aria-pressed': isSelected,
        'aria-label': `Select ${bookingType.name} - ${formatPrice(bookingType.basePrice)}`,
      }
    : {};

  if (variant === 'compact') {
    return (
      <CardElement className={cardClasses} {...cardProps}>
        <div className='flex justify-between items-center'>
          <div className='flex items-center gap-3'>
            {isSelected && (
              <div className='w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center shrink-0'>
                <svg
                  className='w-3 h-3 text-white'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                  aria-hidden='true'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={3}
                    d='M5 13l4 4L19 7'
                  />
                </svg>
              </div>
            )}
            <div>
              <h3 className='font-semibold text-white'>{bookingType.name}</h3>
              {bookingType.description && (
                <p className='text-gray-400 text-sm line-clamp-1'>{bookingType.description}</p>
              )}
            </div>
          </div>
          <span className='text-orange-500 font-bold shrink-0 ml-4'>
            {formatPrice(bookingType.basePrice)}
          </span>
        </div>
      </CardElement>
    );
  }

  // Default variant
  return (
    <CardElement className={cardClasses} {...cardProps}>
      <div className='flex justify-between items-start mb-3'>
        <div className='flex items-start gap-3'>
          {isSelected && (
            <div className='w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center shrink-0 mt-0.5'>
              <svg
                className='w-4 h-4 text-white'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
                aria-hidden='true'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={3}
                  d='M5 13l4 4L19 7'
                />
              </svg>
            </div>
          )}
          <h3
            className={`text-lg font-semibold transition-colors ${
              isSelected ? 'text-orange-500' : 'text-white group-hover:text-orange-500'
            }`}
          >
            {bookingType.name}
          </h3>
        </div>
        <span className='text-orange-500 font-bold text-lg shrink-0 ml-4'>
          {formatPrice(bookingType.basePrice)}
        </span>
      </div>
      {bookingType.description && (
        <p className='text-gray-400 text-sm line-clamp-3'>{bookingType.description}</p>
      )}
      {onSelect && !disabled && (
        <div className='mt-4 flex items-center text-orange-500 text-sm font-medium'>
          <span>{isSelected ? 'Selected' : 'Select'}</span>
          {!isSelected && (
            <svg
              className='w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
              aria-hidden='true'
            >
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
            </svg>
          )}
        </div>
      )}
    </CardElement>
  );
}

export default BookingTypeCard;
