import { useMemo, useState } from 'react';

import type { TimeSlot } from '../../services/types';

interface TimeSlotPickerProps {
  /** Array of available time slots to display */
  timeSlots: TimeSlot[];
  /** Currently selected time slot */
  selectedSlot?: TimeSlot | null;
  /** Callback when a time slot is selected */
  onSelect: (slot: TimeSlot) => void;
  /** Whether the picker is disabled */
  disabled?: boolean;
  /** Display mode: 'list' for simple list, 'calendar' for grouped by date */
  displayMode?: 'list' | 'calendar';
  /** Enhanced UX features */
  enhanced?: boolean;
  /** Show timezone information */
  showTimezone?: boolean;
  /** Callback when user wants to request a different time */
  onRequestTime?: () => void;
}

/**
 * Component for displaying and selecting available time slots.
 *
 * Supports two display modes:
 * - 'list': Simple chronological list of time slots
 * - 'calendar': Time slots grouped by date with date headers
 *
 * Enhanced UX features include:
 * - Timezone display
 * - Request different time option
 * - Better visual feedback
 * - Improved accessibility
 *
 * Only shows available time slots (isAvailable === true).
 *
 *
 * @example
 * // Basic usage with list mode
 * <TimeSlotPicker
 *   timeSlots={availableSlots}
 *   selectedSlot={selectedSlot}
 *   onSelect={(slot) => setSelectedSlot(slot)}
 * />
 *
 * @example
 * // Enhanced calendar mode with timezone
 * <TimeSlotPicker
 *   timeSlots={availableSlots}
 *   selectedSlot={selectedSlot}
 *   onSelect={handleSlotSelect}
 *   displayMode="calendar"
 *   enhanced={true}
 *   showTimezone={true}
 *   onRequestTime={handleRequestTime}
 * />
 */
function TimeSlotPicker({
  timeSlots,
  selectedSlot,
  onSelect,
  disabled = false,
  displayMode = 'calendar',
  enhanced = false,
  showTimezone = false,
  onRequestTime,
}: TimeSlotPickerProps) {
  const [userSelectedDate, setUserSelectedDate] = useState<string | null>(null);

  /**
   * Filters to only available time slots and sorts by date/time.
   */
  const availableSlots = useMemo(() => {
    return timeSlots
      .filter(slot => slot.isAvailable)
      .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
  }, [timeSlots]);

  /**
   * Groups time slots by date for calendar view.
   */
  const slotsByDate = useMemo(() => {
    const groups = new Map<string, TimeSlot[]>();

    availableSlots.forEach(slot => {
      const date = formatDateKey(slot.dateTime);
      const existing = groups.get(date) ?? [];
      groups.set(date, [...existing, slot]);
    });

    return groups;
  }, [availableSlots]);

  /**
   * Gets unique dates for date selector.
   */
  const availableDates = useMemo(() => {
    return Array.from(slotsByDate.keys());
  }, [slotsByDate]);

  /**
   * Derives the active date - uses user selection if valid, otherwise defaults to first available date.
   */
  const activeDate = useMemo(() => {
    // If user has selected a date and it's still valid, use it
    if (userSelectedDate && availableDates.includes(userSelectedDate)) {
      return userSelectedDate;
    }
    // Otherwise default to first available date
    return availableDates.length > 0 ? availableDates[0] : null;
  }, [userSelectedDate, availableDates]);

  if (availableSlots.length === 0) {
    return (
      <div className='text-center py-8 bg-gray-800 rounded-lg'>
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
        <p className='text-gray-400 mb-2'>No available time slots</p>
        <p className='text-gray-500 text-sm mb-4'>Please check back later or contact the coach</p>

        {/* Enhanced UX: Request different time option */}
        {enhanced && onRequestTime && (
          <button
            type='button'
            onClick={onRequestTime}
            disabled={disabled}
            className='bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors'
          >
            Request Different Time
          </button>
        )}
      </div>
    );
  }

  if (displayMode === 'list') {
    return (
      <div className='space-y-2'>
        {availableSlots.map(slot => (
          <TimeSlotButton
            key={slot.id}
            slot={slot}
            isSelected={selectedSlot?.id === slot.id}
            onSelect={onSelect}
            disabled={disabled}
            showDate
          />
        ))}
      </div>
    );
  }

  // Calendar mode - grouped by date
  return (
    <div className='space-y-4'>
      {/* Enhanced UX: Header with timezone info */}
      {enhanced && (
        <div className='flex items-center justify-between'>
          <h4 className='text-lg font-semibold text-white'>Choose Your Time</h4>
          <div className='flex items-center gap-4'>
            {showTimezone && (
              <span className='text-sm text-gray-400'>
                Times shown in {Intl.DateTimeFormat().resolvedOptions().timeZone}
              </span>
            )}
            {onRequestTime && (
              <button
                type='button'
                onClick={onRequestTime}
                disabled={disabled}
                className='text-orange-500 hover:text-orange-400 text-sm font-medium transition-colors disabled:opacity-50'
              >
                Request Different Time
              </button>
            )}
          </div>
        </div>
      )}

      {/* Date Selector */}
      <div className='flex gap-2 overflow-x-auto pb-2'>
        {availableDates.map(date => (
          <DateButton
            key={date}
            date={date}
            isSelected={activeDate === date}
            slotCount={slotsByDate.get(date)?.length ?? 0}
            onClick={() => setUserSelectedDate(date)}
            disabled={disabled}
            enhanced={enhanced}
          />
        ))}
      </div>

      {/* Time Slots for Selected Date */}
      {activeDate && (
        <div className='bg-gray-800 rounded-lg p-4'>
          <h4 className='text-sm font-medium text-gray-400 mb-3'>
            Available times for {formatDisplayDate(activeDate)}
          </h4>
          <div
            className={`grid gap-2 ${enhanced ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'}`}
          >
            {slotsByDate.get(activeDate)?.map(slot => (
              <TimeSlotButton
                key={slot.id}
                slot={slot}
                isSelected={selectedSlot?.id === slot.id}
                onSelect={onSelect}
                disabled={disabled}
                enhanced={enhanced}
                showTimezone={showTimezone}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Individual time slot button component.
 */
interface TimeSlotButtonProps {
  slot: TimeSlot;
  isSelected: boolean;
  onSelect: (slot: TimeSlot) => void;
  disabled: boolean;
  showDate?: boolean;
  enhanced?: boolean;
  showTimezone?: boolean;
}

function TimeSlotButton({
  slot,
  isSelected,
  onSelect,
  disabled,
  showDate = false,
  enhanced = false,
  showTimezone = false,
}: TimeSlotButtonProps) {
  const handleClick = () => {
    if (!disabled) {
      onSelect(slot);
    }
  };

  const baseClasses = `
    px-4 py-3 rounded-lg text-center transition-all
    focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-900
    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    ${enhanced ? 'hover:scale-105 transform' : ''}
  `;

  const stateClasses = isSelected
    ? 'bg-orange-500 text-white shadow-lg'
    : 'bg-gray-700 hover:bg-gray-600 text-white';

  return (
    <button
      type='button'
      onClick={handleClick}
      disabled={disabled}
      className={`${baseClasses} ${stateClasses}`}
      aria-pressed={isSelected}
      aria-label={`${formatTime(slot.dateTime)} - ${slot.durationMin} minutes${isSelected ? ' (selected)' : ''}`}
    >
      <div className='font-semibold'>{formatTime(slot.dateTime)}</div>
      {showDate && (
        <div className='text-xs text-gray-400 mt-1'>{formatShortDate(slot.dateTime)}</div>
      )}
      <div className={`text-xs mt-1 ${isSelected ? 'text-orange-200' : 'text-gray-400'}`}>
        {slot.durationMin} min
      </div>
      {enhanced && showTimezone && (
        <div className={`text-xs mt-1 ${isSelected ? 'text-orange-200' : 'text-gray-500'}`}>
          {formatTimezone(slot.dateTime)}
        </div>
      )}
    </button>
  );
}

/**
 * Date selector button component.
 */
interface DateButtonProps {
  date: string;
  isSelected: boolean;
  slotCount: number;
  onClick: () => void;
  disabled: boolean;
  enhanced?: boolean;
}

function DateButton({
  date,
  isSelected,
  slotCount,
  onClick,
  disabled,
  enhanced = false,
}: DateButtonProps) {
  const dateObj = new Date(date);
  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
  const dayNumber = dateObj.getDate();
  const month = dateObj.toLocaleDateString('en-US', { month: 'short' });

  const baseClasses = `
    flex flex-col items-center px-4 py-3 rounded-lg min-w-[80px] transition-all
    focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-900
    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    ${enhanced ? 'hover:scale-105 transform' : ''}
  `;

  const stateClasses = isSelected
    ? 'bg-orange-500 text-white shadow-lg'
    : 'bg-gray-800 hover:bg-gray-700 text-white';

  return (
    <button
      type='button'
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${stateClasses}`}
      aria-pressed={isSelected}
      aria-label={`${formatDisplayDate(date)} - ${slotCount} available slots`}
    >
      <span className='text-xs uppercase'>{dayName}</span>
      <span className='text-2xl font-bold'>{dayNumber}</span>
      <span className='text-xs'>{month}</span>
      <span className={`text-xs mt-1 ${isSelected ? 'text-orange-200' : 'text-orange-500'}`}>
        {slotCount} slot{slotCount !== 1 ? 's' : ''}
      </span>
    </button>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Formats a date string to a key for grouping (YYYY-MM-DD).
 */
function formatDateKey(dateTime: string): string {
  const date = new Date(dateTime);
  const isoString = date.toISOString();
  const datePart = isoString.split('T')[0];
  return datePart ?? isoString.substring(0, 10);
}

/**
 * Formats a date for display (e.g., "Monday, January 15").
 */
function formatDisplayDate(dateKey: string): string {
  const date = new Date(dateKey);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Formats a short date (e.g., "Jan 15").
 */
function formatShortDate(dateTime: string): string {
  const date = new Date(dateTime);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Formats time for display (e.g., "10:00 AM").
 */
function formatTime(dateTime: string): string {
  const date = new Date(dateTime);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Formats timezone abbreviation for display (e.g., "PST").
 */
function formatTimezone(dateTime: string): string {
  const date = new Date(dateTime);
  return (
    date
      .toLocaleTimeString('en-US', {
        timeZoneName: 'short',
      })
      .split(' ')
      .pop() || ''
  );
}

export default TimeSlotPicker;
