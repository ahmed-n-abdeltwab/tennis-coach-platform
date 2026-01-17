import React, { useCallback, useEffect, useState } from 'react';

import { ErrorMessage, LoadingSpinner } from '../../components/Common';
import {
  CustomServiceCreator,
  ServicePreview,
  ServiceSender,
  ServiceTemplateManager,
} from '../../components/CustomServices';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { bookingService } from '../../services/booking.service';
import { customServiceService } from '../../services/custom-service.service';
import { isAppError } from '../../services/error-handler';
import { timeSlotService } from '../../services/timeslot.service';
import type {
  Account,
  BookingType,
  CreateCustomServiceRequest,
  CustomService,
  SendCustomServiceRequest,
  TimeSlot,
  UpdateCustomServiceRequest,
} from '../../services/types';

// ============================================================================
// Types
// ============================================================================

type ViewType = 'overview' | 'create' | 'edit' | 'templates' | 'send';

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

// ============================================================================
// Main Component
// ============================================================================

const CustomServicesPage: React.FC = () => {
  const { account: _account } = useAuth();
  const { addNotification } = useNotification();

  // State management
  const [customServices, setCustomServices] = useState<CustomService[]>([]);
  const [bookingTypes, setBookingTypes] = useState<BookingType[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [availableUsers, setAvailableUsers] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ViewType>('overview');
  const [selectedService, setSelectedService] = useState<CustomService | null>(null);
  const [editingService, setEditingService] = useState<CustomService | null>(null);
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
      setActiveView('overview');
      addNotification('success', 'Custom service created successfully');
    } catch (err) {
      addNotification('error', getErrorMessage(err));
      throw err; // Re-throw to let the component handle it
    } finally {
      setActionLoading(false);
    }
  };

  // Handle service update
  const handleUpdateService = async (id: string, data: UpdateCustomServiceRequest) => {
    setActionLoading(true);
    try {
      const updatedService = await customServiceService.updateCustomService(id, data);
      setCustomServices(prev => prev.map(s => (s.id === id ? updatedService : s)));
      setEditingService(null);
      setActiveView('overview');
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
      setActiveView('overview');
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

  // Handle template usage
  const handleUseTemplate = (template: CustomService) => {
    // Pre-fill create form with template data
    setEditingService({
      ...template,
      id: '', // Clear ID to create new service
      name: `${template.name} (Copy)`,
      isTemplate: false,
      isPublic: false,
      usageCount: 0,
    });
    setActiveView('create');
  };

  // Get templates and regular services
  const templates = customServices.filter(s => s.isTemplate);
  const regularServices = customServices.filter(s => !s.isTemplate);
  const publicServices = customServices.filter(s => s.isPublic);

  // Navigation helper
  const navigateBack = () => {
    setActiveView('overview');
    setSelectedService(null);
    setEditingService(null);
  };

  if (loading) {
    return (
      <div className='container mx-auto px-4 py-8'>
        <LoadingSpinner message='Loading custom services...' fullScreen />
      </div>
    );
  }

  if (error) {
    return (
      <div className='container mx-auto px-4 py-8'>
        <ErrorMessage message={error} variant='card' onRetry={fetchData} />
      </div>
    );
  }

  return (
    <div className='container mx-auto px-4 py-8'>
      {/* Page Header */}
      <div className='mb-8'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold text-white mb-2'>Custom Services</h1>
            <p className='text-gray-400'>
              Create and manage personalized coaching services for your clients.
            </p>
          </div>

          {activeView === 'overview' && (
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
                Templates
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
          )}
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      {activeView !== 'overview' && (
        <div className='mb-6'>
          <button
            onClick={navigateBack}
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
            Back to Custom Services
          </button>
        </div>
      )}

      {/* View Content */}
      {activeView === 'create' && (
        <CustomServiceCreator
          bookingTypes={bookingTypes}
          timeSlots={timeSlots}
          onCreateService={
            editingService
              ? data => handleUpdateService(editingService.id, data)
              : handleCreateService
          }
          onCancel={navigateBack}
          loading={actionLoading}
        />
      )}

      {activeView === 'templates' && (
        <ServiceTemplateManager
          templates={templates}
          onUseTemplate={handleUseTemplate}
          onEditTemplate={template => {
            setEditingService(template);
            setActiveView('create');
          }}
          onDeleteTemplate={handleDeleteService}
          onToggleVisibility={handleToggleVisibility}
          actionLoading={actionLoading}
        />
      )}

      {activeView === 'send' && selectedService && (
        <ServiceSender
          service={selectedService}
          availableUsers={availableUsers}
          onSendService={handleSendService}
          onCancel={navigateBack}
          loading={actionLoading}
        />
      )}

      {activeView === 'overview' && (
        <div className='space-y-8'>
          {/* Statistics Cards */}
          <div className='grid grid-cols-1 md:grid-cols-4 gap-6'>
            <div className='bg-gray-800 rounded-lg p-6'>
              <div className='flex items-center'>
                <div className='p-2 bg-orange-500/20 rounded-lg'>
                  <svg
                    className='w-6 h-6 text-orange-500'
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
                </div>
                <div className='ml-4'>
                  <p className='text-sm font-medium text-gray-400'>Total Services</p>
                  <p className='text-2xl font-semibold text-white'>{customServices.length}</p>
                </div>
              </div>
            </div>

            <div className='bg-gray-800 rounded-lg p-6'>
              <div className='flex items-center'>
                <div className='p-2 bg-blue-500/20 rounded-lg'>
                  <svg
                    className='w-6 h-6 text-blue-500'
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
                </div>
                <div className='ml-4'>
                  <p className='text-sm font-medium text-gray-400'>Templates</p>
                  <p className='text-2xl font-semibold text-white'>{templates.length}</p>
                </div>
              </div>
            </div>

            <div className='bg-gray-800 rounded-lg p-6'>
              <div className='flex items-center'>
                <div className='p-2 bg-green-500/20 rounded-lg'>
                  <svg
                    className='w-6 h-6 text-green-500'
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M15 12a3 3 0 11-6 0 3 3 0 016 0z'
                    />
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'
                    />
                  </svg>
                </div>
                <div className='ml-4'>
                  <p className='text-sm font-medium text-gray-400'>Public Services</p>
                  <p className='text-2xl font-semibold text-white'>{publicServices.length}</p>
                </div>
              </div>
            </div>

            <div className='bg-gray-800 rounded-lg p-6'>
              <div className='flex items-center'>
                <div className='p-2 bg-purple-500/20 rounded-lg'>
                  <svg
                    className='w-6 h-6 text-purple-500'
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2M9 12l2 2 4-4'
                    />
                  </svg>
                </div>
                <div className='ml-4'>
                  <p className='text-sm font-medium text-gray-400'>Total Usage</p>
                  <p className='text-2xl font-semibold text-white'>
                    {customServices.reduce((sum, s) => sum + s.usageCount, 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Services List */}
          <div>
            <div className='flex items-center justify-between mb-6'>
              <h2 className='text-xl font-semibold text-white'>
                Your Services ({regularServices.length})
              </h2>
            </div>

            {regularServices.length === 0 ? (
              <div className='text-center py-12 bg-gray-800 rounded-lg'>
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
                <h3 className='mt-4 text-lg font-medium text-white'>No custom services yet</h3>
                <p className='mt-2 text-gray-400'>
                  Create your first custom service to offer personalized coaching packages.
                </p>
                <button
                  onClick={() => setActiveView('create')}
                  className='mt-4 bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-medium transition-colors'
                >
                  Create Your First Service
                </button>
              </div>
            ) : (
              <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
                {regularServices.map(service => (
                  <ServicePreview
                    key={service.id}
                    service={service}
                    variant='card'
                    detailed
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
          </div>

          {/* Quick Templates */}
          {templates.length > 0 && (
            <div>
              <div className='flex items-center justify-between mb-6'>
                <h2 className='text-xl font-semibold text-white'>Quick Templates</h2>
                <button
                  onClick={() => setActiveView('templates')}
                  className='text-orange-500 hover:text-orange-400 text-sm font-medium transition-colors'
                >
                  View All Templates →
                </button>
              </div>
              <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
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
      )}
    </div>
  );
};

export default CustomServicesPage;
