import { useCallback, useEffect, useState } from 'react';

import { HomeContentEditor } from '../../components/Coach';
import ErrorMessage from '../../components/Common/ErrorMessage';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import {
  CustomServiceCreator,
  ServicePreview,
  ServiceSender,
  ServiceTemplateManager,
} from '../../components/CustomServices';
import SessionCard from '../../components/Session/SessionCard';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import {
  customServiceService,
  type Account,
  type CreateCustomServiceRequest,
  type CustomService,
  type SendCustomServiceRequest,
  type UpdateCustomServiceRequest,
} from '../../services';
import { analyticsService, type DashboardAnalytics } from '../../services/analytics.service';
import { bookingService } from '../../services/booking.service';
import { discountService } from '../../services/discount.service';
import { isAppError } from '../../services/error-handler';
import { sessionService } from '../../services/session.service';
import { timeSlotService } from '../../services/timeslot.service';
import {
  SESSION_STATUSES,
  type BookingType,
  type BookingTypeCreateRequest,
  type Discount,
  type DiscountCreateRequest,
  type Session,
  type TimeSlot,
  type TimeSlotCreateRequest,
} from '../../services/types';

// ============================================================================
// Types
// ============================================================================

type TabType =
  | 'sessions'
  | 'timeslots'
  | 'bookingtypes'
  | 'discounts'
  | 'customservices'
  | 'analytics'
  | 'metadata';

interface TabConfig {
  id: TabType;
  label: string;
  icon: React.ReactNode;
}

// ============================================================================
// Tab Configuration
// ============================================================================

const TABS: TabConfig[] = [
  {
    id: 'sessions',
    label: 'Sessions',
    icon: (
      <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth={2}
          d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
        />
      </svg>
    ),
  },
  {
    id: 'timeslots',
    label: 'Time Slots',
    icon: (
      <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth={2}
          d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
        />
      </svg>
    ),
  },
  {
    id: 'bookingtypes',
    label: 'Booking Types',
    icon: (
      <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth={2}
          d='M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10'
        />
      </svg>
    ),
  },
  {
    id: 'customservices',
    label: 'Custom Services',
    icon: (
      <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth={2}
          d='M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4'
        />
      </svg>
    ),
  },
  {
    id: 'discounts',
    label: 'Discounts',
    icon: (
      <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth={2}
          d='M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z'
        />
      </svg>
    ),
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: (
      <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth={2}
          d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
        />
      </svg>
    ),
  },
  {
    id: 'metadata',
    label: 'Website Content',
    icon: (
      <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth={2}
          d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
        />
      </svg>
    ),
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

function getErrorMessage(error: unknown): string {
  if (isAppError(error)) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}

function formatDateTime(dateTime: string | null | undefined): string {
  if (!dateTime) return 'Not set';
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

function formatDateTimeForInput(dateTime: string | null | undefined): string {
  if (!dateTime) return '';
  const date = new Date(dateTime);
  return date.toISOString().slice(0, 16);
}

// ============================================================================
// Main Component
// ============================================================================

const CoachDashboard: React.FC = () => {
  const { account } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('sessions');

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold text-white mb-2'>Coach Dashboard</h1>
        <p className='text-gray-400'>
          Welcome back, {account?.email ?? 'Coach'}! Manage your coaching business here.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className='border-b border-gray-700 mb-6'>
        <nav className='flex space-x-8' aria-label='Tabs'>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-orange-500 text-orange-500'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
              }`}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className='mt-6'>
        {activeTab === 'sessions' && <SessionsTab />}
        {activeTab === 'timeslots' && <TimeSlotsTab />}
        {activeTab === 'bookingtypes' && <BookingTypesTab />}
        {activeTab === 'customservices' && <CustomServicesTab />}
        {activeTab === 'discounts' && <DiscountsTab />}
        {activeTab === 'analytics' && <AnalyticsTab />}
        {activeTab === 'metadata' && <MetadataTab />}
      </div>
    </div>
  );
};

function SessionsTab() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await sessionService.getSessions();
      // Filter to show upcoming sessions (SCHEDULED or CONFIRMED)
      const upcomingSessions = data.filter(
        s => s.status === SESSION_STATUSES.SCHEDULED || s.status === SESSION_STATUSES.CONFIRMED
      );
      setSessions(upcomingSessions);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  if (loading) {
    return <LoadingSpinner message='Loading sessions...' fullScreen />;
  }

  if (error) {
    return <ErrorMessage message={error} variant='card' onRetry={fetchSessions} />;
  }

  if (sessions.length === 0) {
    return (
      <div className='text-center py-12'>
        <svg
          className='mx-auto h-12 w-12 text-gray-500'
          fill='none'
          viewBox='0 0 24 24'
          stroke='currentColor'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
          />
        </svg>
        <h3 className='mt-4 text-lg font-medium text-white'>No upcoming sessions</h3>
        <p className='mt-2 text-gray-400'>
          You don&apos;t have any scheduled or confirmed sessions at the moment.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className='text-xl font-semibold text-white mb-4'>
        Upcoming Sessions ({sessions.length})
      </h2>
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
        {sessions.map(session => (
          <SessionCard key={session.id} session={session} variant='compact' />
        ))}
      </div>
    </div>
  );
}

function TimeSlotsTab() {
  const { addNotification } = useNotification();
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null);
  const [formData, setFormData] = useState<TimeSlotCreateRequest>({
    dateTime: '',
    durationMin: 60,
    isAvailable: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchTimeSlots = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await timeSlotService.getTimeSlots();
      setTimeSlots(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTimeSlots();
  }, [fetchTimeSlots]);

  const handleCreate = async () => {
    if (!formData.dateTime) {
      addNotification('error', 'Please select a date and time');
      return;
    }

    setSubmitting(true);
    try {
      const newSlot = await timeSlotService.createTimeSlot({
        ...formData,
        dateTime: new Date(formData.dateTime).toISOString(),
      });
      setTimeSlots(prev => [...prev, newSlot]);
      setShowForm(false);
      setFormData({ dateTime: '', durationMin: 60, isAvailable: true });
      addNotification('success', 'Time slot created successfully');
    } catch (err) {
      addNotification('error', getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingSlot || !formData.dateTime) return;

    setSubmitting(true);
    try {
      const updated = await timeSlotService.updateTimeSlot(editingSlot.id, {
        dateTime: new Date(formData.dateTime).toISOString(),
        durationMin: formData.durationMin,
        isAvailable: formData.isAvailable,
      });
      setTimeSlots(prev => prev.map(s => (s.id === updated.id ? updated : s)));
      setEditingSlot(null);
      setShowForm(false);
      setFormData({ dateTime: '', durationMin: 60, isAvailable: true });
      addNotification('success', 'Time slot updated successfully');
    } catch (err) {
      addNotification('error', getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await timeSlotService.deleteTimeSlot(id);
      setTimeSlots(prev => prev.filter(s => s.id !== id));
      addNotification('success', 'Time slot deleted successfully');
    } catch (err) {
      addNotification('error', getErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  };

  const openEditForm = (slot: TimeSlot) => {
    setEditingSlot(slot);
    setFormData({
      dateTime: formatDateTimeForInput(slot.dateTime),
      durationMin: slot.durationMin ?? 60,
      isAvailable: slot.isAvailable ?? true,
    });
    setShowForm(true);
  };

  const openCreateForm = () => {
    setEditingSlot(null);
    setFormData({ dateTime: '', durationMin: 60, isAvailable: true });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingSlot(null);
    setFormData({ dateTime: '', durationMin: 60, isAvailable: true });
  };

  if (loading) {
    return <LoadingSpinner message='Loading time slots...' fullScreen />;
  }

  if (error) {
    return <ErrorMessage message={error} variant='card' onRetry={fetchTimeSlots} />;
  }

  return (
    <div>
      <div className='flex justify-between items-center mb-6'>
        <h2 className='text-xl font-semibold text-white'>Time Slots ({timeSlots.length})</h2>
        <button
          onClick={openCreateForm}
          className='bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2'
        >
          <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4v16m8-8H4' />
          </svg>
          Add Time Slot
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
          <div className='bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4'>
            <h3 className='text-lg font-semibold text-white mb-4'>
              {editingSlot ? 'Edit Time Slot' : 'Create Time Slot'}
            </h3>
            <div className='space-y-4'>
              <div>
                <label
                  htmlFor='slot-datetime'
                  className='block text-sm font-medium text-gray-300 mb-1'
                >
                  Date & Time
                </label>
                <input
                  id='slot-datetime'
                  type='datetime-local'
                  value={formData.dateTime}
                  onChange={e => setFormData({ ...formData, dateTime: e.target.value })}
                  className='w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500'
                />
              </div>
              <div>
                <label
                  htmlFor='slot-duration'
                  className='block text-sm font-medium text-gray-300 mb-1'
                >
                  Duration (minutes)
                </label>
                <input
                  id='slot-duration'
                  type='number'
                  value={formData.durationMin}
                  onChange={e =>
                    setFormData({ ...formData, durationMin: parseInt(e.target.value, 10) || 60 })
                  }
                  min={15}
                  step={15}
                  className='w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500'
                />
              </div>
              <div className='flex items-center gap-2'>
                <input
                  type='checkbox'
                  id='isAvailable'
                  checked={formData.isAvailable}
                  onChange={e => setFormData({ ...formData, isAvailable: e.target.checked })}
                  className='w-4 h-4 rounded border-gray-600 bg-gray-700 text-orange-500 focus:ring-orange-500'
                />
                <label htmlFor='isAvailable' className='text-sm text-gray-300'>
                  Available for booking
                </label>
              </div>
            </div>
            <div className='flex justify-end gap-3 mt-6'>
              <button
                onClick={closeForm}
                className='px-4 py-2 text-gray-400 hover:text-white transition-colors'
              >
                Cancel
              </button>
              <button
                onClick={editingSlot ? handleUpdate : handleCreate}
                disabled={submitting}
                className='bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50'
              >
                {submitting ? 'Saving...' : editingSlot ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Time Slots List */}
      {timeSlots.length === 0 ? (
        <div className='text-center py-12'>
          <svg
            className='mx-auto h-12 w-12 text-gray-500'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
            />
          </svg>
          <h3 className='mt-4 text-lg font-medium text-white'>No time slots</h3>
          <p className='mt-2 text-gray-400'>
            Create your first time slot to start accepting bookings.
          </p>
        </div>
      ) : (
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {timeSlots.map(slot => (
            <div
              key={slot.id}
              className={`bg-gray-700 rounded-lg p-4 border ${
                slot.isAvailable ? 'border-green-500/30' : 'border-gray-600'
              }`}
            >
              <div className='flex justify-between items-start mb-3'>
                <div>
                  <p className='text-white font-medium'>{formatDateTime(slot.dateTime)}</p>
                  <p className='text-gray-400 text-sm'>{slot.durationMin} minutes</p>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    slot.isAvailable
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-gray-500/20 text-gray-400'
                  }`}
                >
                  {slot.isAvailable ? 'Available' : 'Unavailable'}
                </span>
              </div>
              <div className='flex justify-end gap-2'>
                <button
                  onClick={() => openEditForm(slot)}
                  className='text-gray-400 hover:text-white transition-colors p-2'
                  aria-label='Edit time slot'
                >
                  <svg className='w-4 h-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
                    />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(slot.id)}
                  disabled={deletingId === slot.id}
                  className='text-red-400 hover:text-red-300 transition-colors p-2 disabled:opacity-50'
                  aria-label='Delete time slot'
                >
                  {deletingId === slot.id ? (
                    <svg className='w-4 h-4 animate-spin' fill='none' viewBox='0 0 24 24'>
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
                  ) : (
                    <svg className='w-4 h-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BookingTypesTab() {
  const { addNotification } = useNotification();
  const [bookingTypes, setBookingTypes] = useState<BookingType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingType, setEditingType] = useState<BookingType | null>(null);
  const [formData, setFormData] = useState<BookingTypeCreateRequest>({
    name: '',
    description: '',
    basePrice: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchBookingTypes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await bookingService.getBookingTypes();
      setBookingTypes(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookingTypes();
  }, [fetchBookingTypes]);

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      addNotification('error', 'Please enter a name');
      return;
    }

    setSubmitting(true);
    try {
      const newType = await bookingService.createBookingType(formData);
      setBookingTypes(prev => [...prev, newType]);
      setShowForm(false);
      setFormData({ name: '', description: '', basePrice: '' });
      addNotification('success', 'Booking type created successfully');
    } catch (err) {
      addNotification('error', getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingType || !formData.name.trim()) return;

    setSubmitting(true);
    try {
      const updated = await bookingService.updateBookingType(editingType.id, {
        name: formData.name,
        description: formData.description,
        basePrice: formData.basePrice,
      });
      setBookingTypes(prev => prev.map(t => (t.id === updated.id ? updated : t)));
      setEditingType(null);
      setShowForm(false);
      setFormData({ name: '', description: '', basePrice: '' });
      addNotification('success', 'Booking type updated successfully');
    } catch (err) {
      addNotification('error', getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await bookingService.deleteBookingType(id);
      setBookingTypes(prev => prev.filter(t => t.id !== id));
      addNotification('success', 'Booking type deleted successfully');
    } catch (err) {
      addNotification('error', getErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  };

  const openEditForm = (type: BookingType) => {
    setEditingType(type);
    setFormData({
      name: type.name ?? '',
      description: type.description ?? '',
      basePrice: type.basePrice?.toString() ?? '',
    });
    setShowForm(true);
  };

  const openCreateForm = () => {
    setEditingType(null);
    setFormData({ name: '', description: '', basePrice: '' });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingType(null);
    setFormData({ name: '', description: '', basePrice: '' });
  };

  if (loading) {
    return <LoadingSpinner message='Loading booking types...' fullScreen />;
  }

  if (error) {
    return <ErrorMessage message={error} variant='card' onRetry={fetchBookingTypes} />;
  }

  return (
    <div>
      <div className='flex justify-between items-center mb-6'>
        <h2 className='text-xl font-semibold text-white'>Booking Types ({bookingTypes.length})</h2>
        <button
          onClick={openCreateForm}
          className='bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2'
        >
          <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4v16m8-8H4' />
          </svg>
          Add Booking Type
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
          <div className='bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4'>
            <h3 className='text-lg font-semibold text-white mb-4'>
              {editingType ? 'Edit Booking Type' : 'Create Booking Type'}
            </h3>
            <div className='space-y-4'>
              <div>
                <label
                  htmlFor='booking-name'
                  className='block text-sm font-medium text-gray-300 mb-1'
                >
                  Name
                </label>
                <input
                  id='booking-name'
                  type='text'
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder='e.g., Private Lesson'
                  className='w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500'
                />
              </div>
              <div>
                <label
                  htmlFor='booking-description'
                  className='block text-sm font-medium text-gray-300 mb-1'
                >
                  Description
                </label>
                <textarea
                  id='booking-description'
                  value={formData.description ?? ''}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder='Describe this booking type...'
                  rows={3}
                  className='w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500'
                />
              </div>
              <div>
                <label
                  htmlFor='booking-price'
                  className='block text-sm font-medium text-gray-300 mb-1'
                >
                  Base Price ($)
                </label>
                <input
                  id='booking-price'
                  type='number'
                  value={formData.basePrice}
                  onChange={e => setFormData({ ...formData, basePrice: e.target.value })}
                  min={0}
                  step={0.01}
                  className='w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500'
                />
              </div>
            </div>
            <div className='flex justify-end gap-3 mt-6'>
              <button
                onClick={closeForm}
                className='px-4 py-2 text-gray-400 hover:text-white transition-colors'
              >
                Cancel
              </button>
              <button
                onClick={editingType ? handleUpdate : handleCreate}
                disabled={submitting}
                className='bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50'
              >
                {submitting ? 'Saving...' : editingType ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Types List */}
      {bookingTypes.length === 0 ? (
        <div className='text-center py-12'>
          <svg
            className='mx-auto h-12 w-12 text-gray-500'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10'
            />
          </svg>
          <h3 className='mt-4 text-lg font-medium text-white'>No booking types</h3>
          <p className='mt-2 text-gray-400'>
            Create your first booking type to offer services to clients.
          </p>
        </div>
      ) : (
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {bookingTypes.map(type => (
            <div key={type.id} className='bg-gray-700 rounded-lg p-4 border border-gray-600'>
              <div className='mb-3'>
                <h3 className='text-white font-medium text-lg'>{type.name}</h3>
                {type.description && (
                  <p className='text-gray-400 text-sm mt-1 line-clamp-2'>{type.description}</p>
                )}
              </div>
              <div className='flex justify-between items-center'>
                <span className='text-orange-400 font-semibold text-lg'>
                  ${type.basePrice?.toFixed(2) ?? '0.00'}
                </span>
                <div className='flex gap-2'>
                  <button
                    onClick={() => openEditForm(type)}
                    className='text-gray-400 hover:text-white transition-colors p-2'
                    aria-label='Edit booking type'
                  >
                    <svg className='w-4 h-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(type.id)}
                    disabled={deletingId === type.id}
                    className='text-red-400 hover:text-red-300 transition-colors p-2 disabled:opacity-50'
                    aria-label='Delete booking type'
                  >
                    {deletingId === type.id ? (
                      <svg className='w-4 h-4 animate-spin' fill='none' viewBox='0 0 24 24'>
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
                    ) : (
                      <svg
                        className='w-4 h-4'
                        fill='none'
                        viewBox='0 0 24 24'
                        stroke='currentColor'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DiscountsTab() {
  const { addNotification } = useNotification();
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [formData, setFormData] = useState<DiscountCreateRequest>({
    code: '',
    amount: '',
    expiry: '',
    maxUsage: 100,
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [deletingCode, setDeletingCode] = useState<string | null>(null);

  const fetchDiscounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await discountService.getDiscounts();
      setDiscounts(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDiscounts();
  }, [fetchDiscounts]);

  const handleCreate = async () => {
    if (!formData.code.trim()) {
      addNotification('error', 'Please enter a discount code');
      return;
    }
    if (!formData.expiry) {
      addNotification('error', 'Please select an expiry date');
      return;
    }

    setSubmitting(true);
    try {
      const newDiscount = await discountService.createDiscount({
        ...formData,
        code: formData.code.toUpperCase(),
        expiry: new Date(formData.expiry).toISOString(),
      });
      setDiscounts(prev => [...prev, newDiscount]);
      setShowForm(false);
      setFormData({ code: '', amount: '', expiry: '', maxUsage: 100, isActive: true });
      addNotification('success', 'Discount code created successfully');
    } catch (err) {
      addNotification('error', getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingDiscount) return;

    setSubmitting(true);
    try {
      const updated = await discountService.updateDiscount(editingDiscount.code, {
        amount: formData.amount,
        expiry: formData.expiry ? new Date(formData.expiry).toISOString() : undefined,
        maxUsage: formData.maxUsage,
        isActive: formData.isActive,
      });
      setDiscounts(prev => prev.map(d => (d.code === updated.code ? updated : d)));
      setEditingDiscount(null);
      setShowForm(false);
      setFormData({ code: '', amount: '', expiry: '', maxUsage: 100, isActive: true });
      addNotification('success', 'Discount code updated successfully');
    } catch (err) {
      addNotification('error', getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (code: string) => {
    setDeletingCode(code);
    try {
      await discountService.deleteDiscount(code);
      setDiscounts(prev => prev.filter(d => d.code !== code));
      addNotification('success', 'Discount code deleted successfully');
    } catch (err) {
      addNotification('error', getErrorMessage(err));
    } finally {
      setDeletingCode(null);
    }
  };

  const openEditForm = (discount: Discount) => {
    setEditingDiscount(discount);
    setFormData({
      code: discount.code,
      amount: discount.amount?.toString() ?? '',
      expiry: formatDateTimeForInput(discount.expiry),
      maxUsage: discount.maxUsage ?? 100,
      isActive: discount.isActive ?? true,
    });
    setShowForm(true);
  };

  const openCreateForm = () => {
    setEditingDiscount(null);
    setFormData({ code: '', amount: '', expiry: '', maxUsage: 100, isActive: true });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingDiscount(null);
    setFormData({ code: '', amount: '', expiry: '', maxUsage: 100, isActive: true });
  };

  const isExpired = (expiry: string | null | undefined): boolean => {
    if (!expiry) return false;
    return new Date(expiry) < new Date();
  };

  if (loading) {
    return <LoadingSpinner message='Loading discounts...' fullScreen />;
  }

  if (error) {
    return <ErrorMessage message={error} variant='card' onRetry={fetchDiscounts} />;
  }

  return (
    <div>
      <div className='flex justify-between items-center mb-6'>
        <h2 className='text-xl font-semibold text-white'>Discount Codes ({discounts.length})</h2>
        <button
          onClick={openCreateForm}
          className='bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2'
        >
          <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4v16m8-8H4' />
          </svg>
          Add Discount
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
          <div className='bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4'>
            <h3 className='text-lg font-semibold text-white mb-4'>
              {editingDiscount ? 'Edit Discount Code' : 'Create Discount Code'}
            </h3>
            <div className='space-y-4'>
              <div>
                <label
                  htmlFor='discount-code'
                  className='block text-sm font-medium text-gray-300 mb-1'
                >
                  Code
                </label>
                <input
                  id='discount-code'
                  type='text'
                  value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder='e.g., SUMMER2024'
                  disabled={!!editingDiscount}
                  className='w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50'
                />
              </div>
              <div>
                <label
                  htmlFor='discount-amount'
                  className='block text-sm font-medium text-gray-300 mb-1'
                >
                  Discount Amount (%)
                </label>
                <input
                  id='discount-amount'
                  type='number'
                  value={formData.amount}
                  onChange={e => setFormData({ ...formData, amount: e.target.value })}
                  min={0}
                  max={100}
                  className='w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500'
                />
              </div>
              <div>
                <label
                  htmlFor='discount-expiry'
                  className='block text-sm font-medium text-gray-300 mb-1'
                >
                  Expiry Date
                </label>
                <input
                  id='discount-expiry'
                  type='datetime-local'
                  value={formData.expiry}
                  onChange={e => setFormData({ ...formData, expiry: e.target.value })}
                  className='w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500'
                />
              </div>
              <div>
                <label
                  htmlFor='discount-maxusage'
                  className='block text-sm font-medium text-gray-300 mb-1'
                >
                  Max Usage
                </label>
                <input
                  id='discount-maxusage'
                  type='number'
                  value={formData.maxUsage}
                  onChange={e =>
                    setFormData({ ...formData, maxUsage: parseInt(e.target.value, 10) || 100 })
                  }
                  min={1}
                  className='w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500'
                />
              </div>
              <div className='flex items-center gap-2'>
                <input
                  type='checkbox'
                  id='discountIsActive'
                  checked={formData.isActive}
                  onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                  className='w-4 h-4 rounded border-gray-600 bg-gray-700 text-orange-500 focus:ring-orange-500'
                />
                <label htmlFor='discountIsActive' className='text-sm text-gray-300'>
                  Active
                </label>
              </div>
            </div>
            <div className='flex justify-end gap-3 mt-6'>
              <button
                onClick={closeForm}
                className='px-4 py-2 text-gray-400 hover:text-white transition-colors'
              >
                Cancel
              </button>
              <button
                onClick={editingDiscount ? handleUpdate : handleCreate}
                disabled={submitting}
                className='bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50'
              >
                {submitting ? 'Saving...' : editingDiscount ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discounts List */}
      {discounts.length === 0 ? (
        <div className='text-center py-12'>
          <svg
            className='mx-auto h-12 w-12 text-gray-500'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z'
            />
          </svg>
          <h3 className='mt-4 text-lg font-medium text-white'>No discount codes</h3>
          <p className='mt-2 text-gray-400'>
            Create discount codes to offer promotions to your clients.
          </p>
        </div>
      ) : (
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {discounts.map(discount => {
            const expired = isExpired(discount.expiry);
            const inactive = !discount.isActive;

            return (
              <div
                key={discount.code}
                className={`bg-gray-700 rounded-lg p-4 border ${
                  expired || inactive ? 'border-gray-600 opacity-60' : 'border-orange-500/30'
                }`}
              >
                <div className='flex justify-between items-start mb-3'>
                  <div>
                    <h3 className='text-white font-mono font-bold text-lg'>{discount.code}</h3>
                    <p className='text-orange-400 font-semibold'>{discount.amount}% off</p>
                  </div>
                  <div className='flex flex-col gap-1'>
                    {expired && (
                      <span className='px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400'>
                        Expired
                      </span>
                    )}
                    {inactive && !expired && (
                      <span className='px-2 py-0.5 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400'>
                        Inactive
                      </span>
                    )}
                    {!expired && !inactive && (
                      <span className='px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400'>
                        Active
                      </span>
                    )}
                  </div>
                </div>
                <div className='text-gray-400 text-sm space-y-1 mb-3'>
                  <p>Expires: {discount.expiry ? formatDateTime(discount.expiry) : 'Never'}</p>
                  <p>
                    Usage: {discount.useCount ?? 0} / {discount.maxUsage ?? '∞'}
                  </p>
                </div>
                <div className='flex justify-end gap-2'>
                  <button
                    onClick={() => openEditForm(discount)}
                    className='text-gray-400 hover:text-white transition-colors p-2'
                    aria-label='Edit discount'
                  >
                    <svg className='w-4 h-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(discount.code)}
                    disabled={deletingCode === discount.code}
                    className='text-red-400 hover:text-red-300 transition-colors p-2 disabled:opacity-50'
                    aria-label='Delete discount'
                  >
                    {deletingCode === discount.code ? (
                      <svg className='w-4 h-4 animate-spin' fill='none' viewBox='0 0 24 24'>
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
                    ) : (
                      <svg
                        className='w-4 h-4'
                        fill='none'
                        viewBox='0 0 24 24'
                        stroke='currentColor'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CustomServicesTab() {
  const { addNotification } = useNotification();
  const [customServices, setCustomServices] = useState<CustomService[]>([]);
  const [bookingTypes, setBookingTypes] = useState<BookingType[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [availableUsers, setAvailableUsers] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'list' | 'create' | 'templates' | 'send'>('list');
  const [selectedService, setSelectedService] = useState<CustomService | null>(null);
  const [_editingService, setEditingService] = useState<CustomService | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch all data needed for custom services
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [servicesData, bookingTypesData, timeSlotsData] = await Promise.all([
        customServiceService.getCustomServices(),
        bookingService.getBookingTypes(),
        timeSlotService.getTimeSlots(),
      ]);

      setCustomServices(servicesData);
      setBookingTypes(bookingTypesData);
      setTimeSlots(timeSlotsData);

      // TODO: Fetch available users from messages/conversations
      // For now, using empty array - this would be populated from chat data
      setAvailableUsers([]);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle service creation
  const handleCreateService = async (data: CreateCustomServiceRequest) => {
    setActionLoading(true);
    try {
      const newService = await customServiceService.createCustomService(data);
      setCustomServices(prev => [...prev, newService]);
      setActiveView('list');
      addNotification('success', 'Custom service created successfully');
    } catch (err) {
      addNotification('error', getErrorMessage(err));
      throw err; // Re-throw to let the component handle it
    } finally {
      setActionLoading(false);
    }
  };

  // Handle service update
  const _handleUpdateService = async (id: string, data: UpdateCustomServiceRequest) => {
    setActionLoading(true);
    try {
      const updatedService = await customServiceService.updateCustomService(id, data);
      setCustomServices(prev => prev.map(s => (s.id === id ? updatedService : s)));
      setEditingService(null);
      setActiveView('list');
      addNotification('success', 'Custom service updated successfully');
    } catch (err) {
      addNotification('error', getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  // Handle service deletion
  const handleDeleteService = async (id: string) => {
    setActionLoading(true);
    try {
      await customServiceService.deleteCustomService(id);
      setCustomServices(prev => prev.filter(s => s.id !== id));
      addNotification('success', 'Custom service deleted successfully');
    } catch (err) {
      addNotification('error', getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  // Handle saving as template
  const _handleSaveAsTemplate = async (id: string) => {
    setActionLoading(true);
    try {
      const updatedService = await customServiceService.saveAsTemplate(id);
      setCustomServices(prev => prev.map(s => (s.id === id ? updatedService : s)));
      addNotification('success', 'Service saved as template successfully');
    } catch (err) {
      addNotification('error', getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  // Handle sending service to user
  const handleSendService = async (serviceId: string, data: SendCustomServiceRequest) => {
    setActionLoading(true);
    try {
      await customServiceService.sendToUser(serviceId, data);
      // Update usage count
      setCustomServices(prev =>
        prev.map(s => (s.id === serviceId ? { ...s, usageCount: s.usageCount + 1 } : s))
      );
      setActiveView('list');
      addNotification('success', 'Custom service sent successfully');
    } catch (err) {
      addNotification('error', getErrorMessage(err));
      throw err; // Re-throw to let the component handle it
    } finally {
      setActionLoading(false);
    }
  };

  // Handle template visibility toggle
  const handleToggleVisibility = async (id: string, isPublic: boolean) => {
    setActionLoading(true);
    try {
      const updatedService = await customServiceService.updateCustomService(id, { isPublic });
      setCustomServices(prev => prev.map(s => (s.id === id ? updatedService : s)));
      addNotification(
        'success',
        `Service ${isPublic ? 'made public' : 'made private'} successfully`
      );
    } catch (err) {
      addNotification('error', getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  // Get templates and regular services
  const templates = customServices.filter(s => s.isTemplate);
  const regularServices = customServices.filter(s => !s.isTemplate);

  if (loading) {
    return <LoadingSpinner message='Loading custom services...' fullScreen />;
  }

  if (error) {
    return <ErrorMessage message={error} variant='card' onRetry={fetchData} />;
  }

  // Render different views
  if (activeView === 'create') {
    return (
      <div>
        <div className='flex items-center gap-4 mb-6'>
          <button
            onClick={() => setActiveView('list')}
            className='flex items-center gap-2 text-gray-400 hover:text-white transition-colors'
          >
            <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M15 19l-7-7 7-7'
              />
            </svg>
            Back to Services
          </button>
          <h2 className='text-xl font-semibold text-white'>Create Custom Service</h2>
        </div>

        <CustomServiceCreator
          bookingTypes={bookingTypes}
          timeSlots={timeSlots}
          onCreateService={handleCreateService}
          onCancel={() => setActiveView('list')}
          loading={actionLoading}
        />
      </div>
    );
  }

  if (activeView === 'templates') {
    return (
      <div>
        <div className='flex items-center gap-4 mb-6'>
          <button
            onClick={() => setActiveView('list')}
            className='flex items-center gap-2 text-gray-400 hover:text-white transition-colors'
          >
            <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M15 19l-7-7 7-7'
              />
            </svg>
            Back to Services
          </button>
          <h2 className='text-xl font-semibold text-white'>Service Templates</h2>
        </div>

        <ServiceTemplateManager
          templates={templates}
          onUseTemplate={_template => {
            // TODO: Implement template usage - could open create form with pre-filled data
            addNotification('info', 'Template usage feature coming soon');
          }}
          onEditTemplate={template => {
            setEditingService(template);
            setActiveView('create');
          }}
          onDeleteTemplate={handleDeleteService}
          onToggleVisibility={handleToggleVisibility}
          actionLoading={actionLoading}
        />
      </div>
    );
  }

  if (activeView === 'send' && selectedService) {
    return (
      <div>
        <div className='flex items-center gap-4 mb-6'>
          <button
            onClick={() => {
              setActiveView('list');
              setSelectedService(null);
            }}
            className='flex items-center gap-2 text-gray-400 hover:text-white transition-colors'
          >
            <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M15 19l-7-7 7-7'
              />
            </svg>
            Back to Services
          </button>
          <h2 className='text-xl font-semibold text-white'>Send Custom Service</h2>
        </div>

        <ServiceSender
          service={selectedService}
          availableUsers={availableUsers}
          onSendService={handleSendService}
          onCancel={() => {
            setActiveView('list');
            setSelectedService(null);
          }}
          loading={actionLoading}
        />
      </div>
    );
  }

  // Main list view
  return (
    <div>
      <div className='flex justify-between items-center mb-6'>
        <h2 className='text-xl font-semibold text-white'>
          Custom Services ({customServices.length})
        </h2>
        <div className='flex items-center gap-3'>
          <button
            onClick={() => setActiveView('templates')}
            className='bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2'
          >
            <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10'
              />
            </svg>
            Templates ({templates.length})
          </button>
          <button
            onClick={() => setActiveView('create')}
            className='bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2'
          >
            <svg className='w-5 h-5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 4v16m8-8H4'
              />
            </svg>
            Create Service
          </button>
        </div>
      </div>

      {/* Services List */}
      {regularServices.length === 0 ? (
        <div className='text-center py-12'>
          <svg
            className='mx-auto h-12 w-12 text-gray-500'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4'
            />
          </svg>
          <h3 className='mt-4 text-lg font-medium text-white'>No custom services</h3>
          <p className='mt-2 text-gray-400'>
            Create your first custom service to offer personalized coaching packages.
          </p>
          <button
            onClick={() => setActiveView('create')}
            className='mt-4 bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-medium transition-colors'
          >
            Create Custom Service
          </button>
        </div>
      ) : (
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {regularServices.map(service => (
            <ServicePreview
              key={service.id}
              service={service}
              variant='card'
              showActions
              onEdit={service => {
                setEditingService(service);
                setActiveView('create');
              }}
              onDelete={handleDeleteService}
              onSend={service => {
                setSelectedService(service);
                setActiveView('send');
              }}
              actionLoading={actionLoading}
            />
          ))}
        </div>
      )}

      {/* Templates Section */}
      {templates.length > 0 && (
        <div className='mt-12'>
          <div className='flex items-center justify-between mb-4'>
            <h3 className='text-lg font-semibold text-white'>Quick Templates</h3>
            <button
              onClick={() => setActiveView('templates')}
              className='text-orange-500 hover:text-orange-400 text-sm font-medium transition-colors'
            >
              View All Templates →
            </button>
          </div>
          <div className='grid gap-3 md:grid-cols-2 lg:grid-cols-4'>
            {templates.slice(0, 4).map(template => (
              <ServicePreview
                key={template.id}
                service={template}
                variant='compact'
                onSelect={service => {
                  setSelectedService(service);
                  setActiveView('send');
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AnalyticsTab() {
  const { addNotification } = useNotification();
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [timeRange, setTimeRange] = useState<
    'last_7_days' | 'last_30_days' | 'last_90_days' | 'last_year'
  >('last_30_days');

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await analyticsService.getDashboardAnalytics({ timeRange });
      setAnalytics(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleExport = async (format: 'json' | 'csv') => {
    setExporting(true);
    try {
      const blob = await analyticsService.exportAnalytics({
        timeRange,
        format,
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `coach-analytics-${timeRange.toLowerCase()}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      addNotification('success', `Analytics exported as ${format.toUpperCase()}`);
    } catch (err) {
      addNotification('error', getErrorMessage(err));
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <LoadingSpinner message='Loading analytics...' />;
  if (error) return <ErrorMessage message={error} variant='card' onRetry={fetchAnalytics} />;
  if (!analytics) return null;

  return (
    <div className='space-y-6'>
      {/* Controls */}
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <div>
          <h3 className='text-xl font-semibold text-white'>Analytics Dashboard</h3>
          <p className='text-gray-400'>View your coaching business performance and metrics</p>
        </div>
        <div className='flex flex-col sm:flex-row gap-3'>
          <select
            value={timeRange}
            onChange={e => setTimeRange(e.target.value as typeof timeRange)}
            className='bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm'
          >
            <option value='last_7_days'>Last 7 Days</option>
            <option value='last_30_days'>Last 30 Days</option>
            <option value='last_90_days'>Last 90 Days</option>
            <option value='last_year'>Last Year</option>
          </select>
          <div className='flex gap-2'>
            <button
              onClick={() => handleExport('json')}
              disabled={exporting}
              className='bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm transition-colors disabled:opacity-50'
            >
              Export JSON
            </button>
            <button
              onClick={() => handleExport('csv')}
              disabled={exporting}
              className='bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm transition-colors disabled:opacity-50'
            >
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
        {/* Financial Metrics */}
        <div className='bg-gray-800 rounded-lg p-6'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-gray-400 text-sm'>Total Revenue</p>
              <p className='text-2xl font-bold text-green-400'>
                ${analytics.financialAnalytics.totalRevenue.toLocaleString()}
              </p>
            </div>
            <div className='bg-green-500/20 p-3 rounded-lg'>
              <svg
                className='w-6 h-6 text-green-400'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1'
                />
              </svg>
            </div>
          </div>
        </div>

        <div className='bg-gray-800 rounded-lg p-6'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-gray-400 text-sm'>Total Sessions</p>
              <p className='text-2xl font-bold text-blue-400'>
                {analytics.sessionMetrics.totalSessions}
              </p>
            </div>
            <div className='bg-blue-500/20 p-3 rounded-lg'>
              <svg
                className='w-6 h-6 text-blue-400'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
                />
              </svg>
            </div>
          </div>
        </div>

        <div className='bg-gray-800 rounded-lg p-6'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-gray-400 text-sm'>Completed Sessions</p>
              <p className='text-2xl font-bold text-purple-400'>
                {analytics.sessionMetrics.completedSessions}
              </p>
            </div>
            <div className='bg-purple-500/20 p-3 rounded-lg'>
              <svg
                className='w-6 h-6 text-purple-400'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                />
              </svg>
            </div>
          </div>
        </div>

        <div className='bg-gray-800 rounded-lg p-6'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-gray-400 text-sm'>Average Session Price</p>
              <p className='text-2xl font-bold text-orange-400'>
                ${analytics.financialAnalytics.averageSessionPrice.toFixed(2)}
              </p>
            </div>
            <div className='bg-orange-500/20 p-3 rounded-lg'>
              <svg
                className='w-6 h-6 text-orange-400'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M13 7h8m0 0v8m0-8l-8 8-4-4-6 6'
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      {analytics.financialAnalytics.revenueByMonth.length > 0 && (
        <div className='bg-gray-800 rounded-lg p-6'>
          <h4 className='text-lg font-semibold text-white mb-4'>Revenue Trends</h4>
          <div className='space-y-3'>
            {analytics.financialAnalytics.revenueByMonth.map((month, index) => (
              <div key={index} className='flex items-center justify-between'>
                <span className='text-gray-300'>{month.month}</span>
                <div className='flex items-center gap-3'>
                  <span className='text-sm text-gray-400'>{month.sessionCount} sessions</span>
                  <span className='text-green-400 font-semibold'>
                    ${month.revenue.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Booking Types */}
      {analytics.financialAnalytics.topBookingTypes.length > 0 && (
        <div className='bg-gray-800 rounded-lg p-6'>
          <h4 className='text-lg font-semibold text-white mb-4'>Top Booking Types</h4>
          <div className='space-y-3'>
            {analytics.financialAnalytics.topBookingTypes.map((bookingType, index) => (
              <div key={index} className='flex items-center justify-between'>
                <span className='text-gray-300'>{bookingType.name}</span>
                <div className='flex items-center gap-3'>
                  <span className='text-sm text-gray-400'>{bookingType.bookingCount} bookings</span>
                  <span className='text-green-400 font-semibold'>
                    ${bookingType.revenue.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Custom Services Stats */}
      {analytics.customServiceStats && (
        <div className='bg-gray-800 rounded-lg p-6'>
          <h4 className='text-lg font-semibold text-white mb-4'>Custom Services</h4>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
            <div className='text-center'>
              <div className='text-xl font-bold text-white'>
                {analytics.customServiceStats.totalCustomServices}
              </div>
              <div className='text-sm text-gray-400'>Total Services</div>
            </div>
            <div className='text-center'>
              <div className='text-xl font-bold text-blue-400'>
                {analytics.customServiceStats.templatesCreated}
              </div>
              <div className='text-sm text-gray-400'>Templates</div>
            </div>
            <div className='text-center'>
              <div className='text-xl font-bold text-green-400'>
                {analytics.customServiceStats.publicServices}
              </div>
              <div className='text-sm text-gray-400'>Public Services</div>
            </div>
            <div className='text-center'>
              <div className='text-xl font-bold text-purple-400'>
                {analytics.customServiceStats.totalUsage}
              </div>
              <div className='text-sm text-gray-400'>Total Usage</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetadataTab() {
  return (
    <div>
      <HomeContentEditor />
    </div>
  );
}

export default CoachDashboard;
