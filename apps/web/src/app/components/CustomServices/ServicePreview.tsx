import React from 'react';

import type { CustomService } from '../../services/types';

interface ServicePreviewProps {
  /** The custom service to display */
  service: CustomService;
  /** Whether to show detailed information */
  detailed?: boolean;
  /** Whether to show action buttons */
  showActions?: boolean;
  /** Callback when service is selected/clicked */
  onSelect?: (service: CustomService) => void;
  /** Callback when edit is requested */
  onEdit?: (service: CustomService) => void;
  /** Callback when delete is requested */
  onDelete?: (serviceId: string) => void;
  /** Callback when send is requested */
  onSend?: (service: CustomService) => void;
  /** Whether actions are currently loading */
  actionLoading?: boolean;
  /** Whether the service is currently selected */
  isSelected?: boolean;
  /** Display variant */
  variant?: 'card' | 'list' | 'compact';
}

/**
 * Component for displaying custom service information.
 *
 * Provides a flexible preview of custom services with different display variants
 * and optional action buttons for management
 *
 *
 * @example
 * // Basic card display
 * <ServicePreview service={service} />
 *
 * // With actions
 * <ServicePreview
 *   service={service}
 *   showActions
 *   onEdit={handleEdit}
 *   onDelete={handleDelete}
 *   onSend={handleSend}
 * />
 *
 * // Compact list item
 * <ServicePreview
 *   service={service}
 *   variant="compact"
 *   onSelect={handleSelect}
 * />
 */
function ServicePreview({
  service,
  detailed = false,
  showActions = false,
  onSelect,
  onEdit,
  onDelete,
  onSend,
  actionLoading = false,
  isSelected = false,
  variant = 'card',
}: ServicePreviewProps) {
  /**
   * Formats the price for display.
   */
  const formatPrice = (price: number): string => {
    return `$${price.toFixed(2)}`;
  };

  /**
   * Formats duration for display.
   */
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${remainingMinutes}min`;
  };

  /**
   * Formats the creation date.
   */
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  /**
   * Handles service selection.
   */
  const handleClick = () => {
    if (onSelect) {
      onSelect(service);
    }
  };

  /**
   * Handles keyboard navigation.
   */
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if ((event.key === 'Enter' || event.key === ' ') && onSelect) {
      event.preventDefault();
      onSelect(service);
    }
  };

  // Base classes for all variants
  const baseClasses = `
    rounded-lg transition-all
    ${onSelect ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-900' : ''}
  `;

  // Selected state classes
  const selectedClasses = isSelected
    ? 'bg-orange-500/20 border-2 border-orange-500'
    : 'bg-gray-700 hover:bg-gray-600 border-2 border-transparent';

  // Compact variant
  if (variant === 'compact') {
    const compactClasses = `${baseClasses} ${selectedClasses} p-3`.trim();

    const CompactElement = onSelect ? 'button' : 'div';
    const compactProps = onSelect
      ? {
          type: 'button' as const,
          onClick: handleClick,
          onKeyDown: handleKeyDown,
          'aria-pressed': isSelected,
        }
      : {};

    return (
      <CompactElement className={compactClasses} {...compactProps}>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-3 min-w-0'>
            {isSelected && (
              <div className='w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center shrink-0'>
                <svg
                  className='w-2.5 h-2.5 text-white'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
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
            <div className='min-w-0'>
              <h3 className='font-medium text-white truncate'>{service.name}</h3>
              <div className='flex items-center gap-2 text-sm text-gray-400'>
                <span>{formatDuration(service.duration)}</span>
                {service.isTemplate && (
                  <span className='inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400'>
                    Template
                  </span>
                )}
                {service.isPublic && (
                  <span className='inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400'>
                    Public
                  </span>
                )}
              </div>
            </div>
          </div>
          <span className='text-orange-500 font-bold shrink-0 ml-4'>
            {formatPrice(service.basePrice)}
          </span>
        </div>
      </CompactElement>
    );
  }

  // List variant
  if (variant === 'list') {
    const listClasses = `${baseClasses} ${selectedClasses} p-4`.trim();

    const ListElement = onSelect ? 'button' : 'div';
    const listProps = onSelect
      ? {
          type: 'button' as const,
          onClick: handleClick,
          onKeyDown: handleKeyDown,
          'aria-pressed': isSelected,
        }
      : {};

    return (
      <ListElement className={listClasses} {...listProps}>
        <div className='flex items-start justify-between'>
          <div className='flex items-start gap-3 min-w-0'>
            {isSelected && (
              <div className='w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center shrink-0 mt-0.5'>
                <svg
                  className='w-3 h-3 text-white'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
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
            <div className='min-w-0'>
              <div className='flex items-center gap-2 mb-1'>
                <h3 className='font-semibold text-white'>{service.name}</h3>
                <div className='flex items-center gap-1'>
                  {service.isTemplate && (
                    <span className='inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-500/20 text-blue-400'>
                      Template
                    </span>
                  )}
                  {service.isPublic && (
                    <span className='inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-400'>
                      Public
                    </span>
                  )}
                </div>
              </div>

              {service.description && (
                <p className='text-sm text-gray-300 mb-2 line-clamp-2'>{service.description}</p>
              )}

              <div className='flex items-center gap-4 text-sm text-gray-400'>
                <span>{formatDuration(service.duration)}</span>
                <span>Used {service.usageCount} times</span>
                <span>Created {formatDate(service.createdAt)}</span>
              </div>
            </div>
          </div>
          <span className='text-orange-500 font-bold text-lg shrink-0 ml-4'>
            {formatPrice(service.basePrice)}
          </span>
        </div>
      </ListElement>
    );
  }

  // Card variant (default)
  const cardClasses = `${baseClasses} ${selectedClasses} p-5`.trim();

  const CardElement = onSelect ? 'button' : 'div';
  const cardProps = onSelect
    ? {
        type: 'button' as const,
        onClick: handleClick,
        onKeyDown: handleKeyDown,
        'aria-pressed': isSelected,
      }
    : {};

  return (
    <CardElement className={cardClasses} {...cardProps}>
      <div className='space-y-4'>
        {/* Header */}
        <div className='flex items-start justify-between'>
          <div className='flex items-start gap-3 min-w-0'>
            {isSelected && (
              <div className='w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center shrink-0 mt-0.5'>
                <svg
                  className='w-4 h-4 text-white'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
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
            <div className='min-w-0'>
              <h3 className='text-lg font-semibold text-white mb-1'>{service.name}</h3>
              <div className='flex items-center gap-2'>
                {service.isTemplate && (
                  <span className='inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-500/20 text-blue-400'>
                    Template
                  </span>
                )}
                {service.isPublic && (
                  <span className='inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-400'>
                    Public
                  </span>
                )}
              </div>
            </div>
          </div>
          <span className='text-orange-500 font-bold text-xl shrink-0 ml-4'>
            {formatPrice(service.basePrice)}
          </span>
        </div>

        {/* Description */}
        {service.description && <p className='text-gray-300 text-sm'>{service.description}</p>}

        {/* Details */}
        <div className='flex items-center gap-4 text-sm text-gray-400'>
          <span>Duration: {formatDuration(service.duration)}</span>
          <span>Used {service.usageCount} times</span>
          {detailed && <span>Created {formatDate(service.createdAt)}</span>}
        </div>

        {/* Pre-filled Details */}
        {detailed &&
          (service.prefilledBookingTypeId ||
            service.prefilledDateTime ||
            service.prefilledTimeSlotId) && (
            <div className='pt-3 border-t border-gray-600'>
              <h4 className='text-sm font-medium text-gray-300 mb-2'>Pre-filled Details</h4>
              <div className='text-sm text-gray-400 space-y-1'>
                {service.prefilledBookingTypeId && (
                  <div>Booking Type: {service.prefilledBookingTypeId}</div>
                )}
                {service.prefilledDateTime && (
                  <div>Date/Time: {new Date(service.prefilledDateTime).toLocaleString()}</div>
                )}
                {service.prefilledTimeSlotId && <div>Time Slot: {service.prefilledTimeSlotId}</div>}
              </div>
            </div>
          )}

        {/* Actions */}
        {showActions && (
          <div className='flex items-center justify-between pt-3 border-t border-gray-600'>
            <div className='flex items-center gap-2'>
              {onEdit && (
                <button
                  type='button'
                  onClick={e => {
                    e.stopPropagation();
                    onEdit(service);
                  }}
                  disabled={actionLoading}
                  className='px-3 py-1.5 bg-gray-600 text-white text-sm rounded hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                >
                  Edit
                </button>
              )}

              {onSend && (
                <button
                  type='button'
                  onClick={e => {
                    e.stopPropagation();
                    onSend(service);
                  }}
                  disabled={actionLoading}
                  className='px-3 py-1.5 bg-orange-500 text-white text-sm rounded hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                >
                  Send to User
                </button>
              )}
            </div>

            {onDelete && (
              <button
                type='button'
                onClick={e => {
                  e.stopPropagation();
                  onDelete(service.id);
                }}
                disabled={actionLoading}
                className='px-3 py-1.5 text-red-400 text-sm hover:text-red-300 transition-colors'
              >
                Delete
              </button>
            )}
          </div>
        )}

        {/* Selection indicator */}
        {onSelect && !showActions && (
          <div className='flex items-center text-orange-500 text-sm font-medium'>
            <span>{isSelected ? 'Selected' : 'Select'}</span>
            {!isSelected && (
              <svg
                className='w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M9 5l7 7-7 7'
                />
              </svg>
            )}
          </div>
        )}
      </div>
    </CardElement>
  );
}

export default ServicePreview;
