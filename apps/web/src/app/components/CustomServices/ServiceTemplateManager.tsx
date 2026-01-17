import { useState } from 'react';

import type { CustomService } from '../../services/types';
import { LoadingSpinner } from '../Common';

interface ServiceTemplateManagerProps {
  /** Array of template services */
  templates: CustomService[];
  /** Whether the component is in loading state */
  loading?: boolean;
  /** Error message to display */
  error?: string | null;
  /** Callback when a template is selected for use */
  onUseTemplate?: (template: CustomService) => void;
  /** Callback when a template is edited */
  onEditTemplate?: (template: CustomService) => void;
  /** Callback when a template is deleted */
  onDeleteTemplate?: (templateId: string) => void;
  /** Callback when template visibility is toggled */
  onToggleVisibility?: (templateId: string, isPublic: boolean) => void;
  /** Whether actions are currently being processed */
  actionLoading?: boolean;
}

/**
 * Component for managing custom service templates.
 *
 * Displays saved templates with options to use, edit, delete, and toggle visibility.
 * Supports both private templates and public templates visible to all clients.
 *
 *
 * @example
 * <ServiceTemplateManager
 *   templates={templates}
 *   onUseTemplate={(template) => console.log('Using:', template)}
 *   onEditTemplate={(template) => console.log('Editing:', template)}
 *   onDeleteTemplate={(id) => console.log('Deleting:', id)}
 * />
 */
function ServiceTemplateManager({
  templates,
  loading = false,
  error = null,
  onUseTemplate,
  onEditTemplate,
  onDeleteTemplate,
  onToggleVisibility,
  actionLoading = false,
}: ServiceTemplateManagerProps) {
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

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
   * Handles template deletion with confirmation.
   */
  const handleDelete = (templateId: string) => {
    if (confirmDelete === templateId) {
      onDeleteTemplate?.(templateId);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(templateId);
    }
  };

  /**
   * Cancels delete confirmation.
   */
  const cancelDelete = () => {
    setConfirmDelete(null);
  };

  /**
   * Toggles template expansion.
   */
  const toggleExpanded = (templateId: string) => {
    setExpandedTemplate(expandedTemplate === templateId ? null : templateId);
  };

  if (loading) {
    return (
      <div className='bg-gray-800 rounded-lg p-6'>
        <div className='flex items-center justify-center py-8'>
          <LoadingSpinner size='lg' />
          <span className='ml-3 text-gray-400'>Loading templates...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='bg-gray-800 rounded-lg p-6'>
        <div className='text-center py-8'>
          <div className='text-red-400 mb-2'>Failed to load templates</div>
          <div className='text-sm text-gray-400'>{error}</div>
        </div>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className='bg-gray-800 rounded-lg p-6'>
        <div className='text-center py-8'>
          <div className='text-gray-400 mb-2'>No templates saved</div>
          <div className='text-sm text-gray-500'>
            Create custom services and save them as templates for easy reuse.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='bg-gray-800 rounded-lg p-6'>
      <div className='flex items-center justify-between mb-6'>
        <h2 className='text-xl font-semibold text-white'>Service Templates</h2>
        <div className='text-sm text-gray-400'>
          {templates.length} template{templates.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className='space-y-4'>
        {templates.map(template => (
          <div
            key={template.id}
            className='bg-gray-700 rounded-lg border border-gray-600 overflow-hidden'
          >
            {/* Template Header */}
            <div className='p-4'>
              <div className='flex items-start justify-between'>
                <div className='flex-1 min-w-0'>
                  <div className='flex items-center gap-3 mb-2'>
                    <h3 className='font-semibold text-white truncate'>{template.name}</h3>
                    <div className='flex items-center gap-2'>
                      {template.isPublic && (
                        <span className='inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400'>
                          Public
                        </span>
                      )}
                      <span className='inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400'>
                        Template
                      </span>
                    </div>
                  </div>

                  <div className='flex items-center gap-4 text-sm text-gray-400'>
                    <span>{formatPrice(template.basePrice)}</span>
                    <span>{formatDuration(template.duration)}</span>
                    <span>Used {template.usageCount} times</span>
                  </div>

                  {template.description && (
                    <p className='mt-2 text-sm text-gray-300 line-clamp-2'>
                      {template.description}
                    </p>
                  )}
                </div>

                <div className='flex items-center gap-2 ml-4'>
                  {/* Expand/Collapse Button */}
                  <button
                    type='button'
                    onClick={() => toggleExpanded(template.id)}
                    className='p-2 text-gray-400 hover:text-white transition-colors'
                    aria-label={expandedTemplate === template.id ? 'Collapse' : 'Expand'}
                  >
                    <svg
                      className={`w-5 h-5 transition-transform ${
                        expandedTemplate === template.id ? 'rotate-180' : ''
                      }`}
                      fill='none'
                      viewBox='0 0 24 24'
                      stroke='currentColor'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M19 9l-7 7-7-7'
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Expanded Content */}
            {expandedTemplate === template.id && (
              <div className='border-t border-gray-600 p-4 bg-gray-750'>
                <div className='space-y-4'>
                  {/* Pre-filled Details */}
                  {(template.prefilledBookingTypeId ||
                    template.prefilledDateTime ||
                    template.prefilledTimeSlotId) && (
                    <div>
                      <h4 className='text-sm font-medium text-gray-300 mb-2'>Pre-filled Details</h4>
                      <div className='text-sm text-gray-400 space-y-1'>
                        {template.prefilledBookingTypeId && (
                          <div>Booking Type: {template.prefilledBookingTypeId}</div>
                        )}
                        {template.prefilledDateTime && (
                          <div>
                            Date/Time: {new Date(template.prefilledDateTime).toLocaleString()}
                          </div>
                        )}
                        {template.prefilledTimeSlotId && (
                          <div>Time Slot: {template.prefilledTimeSlotId}</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Template Actions */}
                  <div className='flex items-center justify-between pt-2 border-t border-gray-600'>
                    <div className='flex items-center gap-2'>
                      {/* Use Template Button */}
                      {onUseTemplate && (
                        <button
                          type='button'
                          onClick={() => onUseTemplate(template)}
                          disabled={actionLoading}
                          className='px-3 py-1.5 bg-orange-500 text-white text-sm rounded hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                        >
                          Use Template
                        </button>
                      )}

                      {/* Edit Button */}
                      {onEditTemplate && (
                        <button
                          type='button'
                          onClick={() => onEditTemplate(template)}
                          disabled={actionLoading}
                          className='px-3 py-1.5 bg-gray-600 text-white text-sm rounded hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                        >
                          Edit
                        </button>
                      )}

                      {/* Visibility Toggle */}
                      {onToggleVisibility && (
                        <button
                          type='button'
                          onClick={() => onToggleVisibility(template.id, !template.isPublic)}
                          disabled={actionLoading}
                          className='px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                        >
                          {template.isPublic ? 'Make Private' : 'Make Public'}
                        </button>
                      )}
                    </div>

                    {/* Delete Button */}
                    {onDeleteTemplate && (
                      <div className='flex items-center gap-2'>
                        {confirmDelete === template.id ? (
                          <>
                            <button
                              type='button'
                              onClick={cancelDelete}
                              disabled={actionLoading}
                              className='px-3 py-1.5 text-gray-400 text-sm hover:text-white transition-colors'
                            >
                              Cancel
                            </button>
                            <button
                              type='button'
                              onClick={() => handleDelete(template.id)}
                              disabled={actionLoading}
                              className='px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                            >
                              {actionLoading ? (
                                <div className='flex items-center'>
                                  <LoadingSpinner size='sm' />
                                  <span className='ml-1'>Deleting...</span>
                                </div>
                              ) : (
                                'Confirm Delete'
                              )}
                            </button>
                          </>
                        ) : (
                          <button
                            type='button'
                            onClick={() => handleDelete(template.id)}
                            disabled={actionLoading}
                            className='px-3 py-1.5 text-red-400 text-sm hover:text-red-300 transition-colors'
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ServiceTemplateManager;
