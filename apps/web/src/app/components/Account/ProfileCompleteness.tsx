import { ACCOUNT_ROLES, type Account } from '@services/types';
import { useMemo } from 'react';

// =========================================================================
// Types
// ============================================================================

interface ProfileCompletenessProps {
  /** Current account data */
  account: Account;
  /** Callback when user clicks to complete profile */
  onCompleteProfile?: () => void;
  /** Whether to show the complete profile button */
  showCompleteButton?: boolean;
}

interface ProfileField {
  key: keyof Account;
  label: string;
  required: boolean;
  roles: string[]; // Which roles require this field
}

interface CompletenessResult {
  completedFields: number;
  totalFields: number;
  percentage: number;
  missingFields: ProfileField[];
}

// ============================================================================
// Profile Field Definitions
// ============================================================================

/**
 * Profile field requirements by role
 */
const PROFILE_FIELDS: ProfileField[] = [
  // Basic fields required for all users
  { key: 'name', label: 'Full Name', required: true, roles: ['USER', 'COACH', 'ADMIN'] },
  { key: 'address', label: 'Address', required: false, roles: ['USER', 'COACH', 'ADMIN'] },
  { key: 'country', label: 'Country', required: false, roles: ['USER', 'COACH', 'ADMIN'] },
  { key: 'gender', label: 'Gender', required: false, roles: ['USER', 'COACH', 'ADMIN'] },
  { key: 'age', label: 'Age', required: false, roles: ['USER', 'COACH', 'ADMIN'] },
  { key: 'height', label: 'Height', required: false, roles: ['USER', 'COACH', 'ADMIN'] },
  { key: 'weight', label: 'Weight', required: false, roles: ['USER', 'COACH', 'ADMIN'] },
  {
    key: 'disability',
    label: 'Disability Status',
    required: false,
    roles: ['USER', 'COACH', 'ADMIN'],
  },
  {
    key: 'disabilityCause',
    label: 'Disability Cause',
    required: false,
    roles: ['USER', 'COACH', 'ADMIN'],
  },
  { key: 'notes', label: 'Additional Notes', required: false, roles: ['USER', 'COACH', 'ADMIN'] },

  // Coach-specific fields
  { key: 'bio', label: 'Biography', required: true, roles: ['COACH', 'ADMIN'] },
  { key: 'credentials', label: 'Credentials', required: true, roles: ['COACH', 'ADMIN'] },
  { key: 'philosophy', label: 'Coaching Philosophy', required: false, roles: ['COACH', 'ADMIN'] },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Checks if a field value is considered complete
 */
function isFieldComplete(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

/**
 * Calculates profile completeness for a given account and role
 */
function calculateCompleteness(account: Account): CompletenessResult {
  const userRole = account.role;

  // Filter fields relevant to the user's role
  const relevantFields = PROFILE_FIELDS.filter(field => field.roles.includes(userRole));

  // Check which fields are complete
  const missingFields: ProfileField[] = [];
  let completedFields = 0;

  relevantFields.forEach(field => {
    const fieldValue = account[field.key];
    const isComplete = isFieldComplete(fieldValue);

    if (isComplete) {
      completedFields++;
    } else if (field.required) {
      missingFields.push(field);
    }
  });

  const totalFields = relevantFields.length;
  const percentage = totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 100;

  return {
    completedFields,
    totalFields,
    percentage,
    missingFields,
  };
}

/**
 * Gets the appropriate color class for completion percentage
 */
function getCompletionColor(percentage: number): string {
  if (percentage >= 80) return 'text-green-600';
  if (percentage >= 60) return 'text-yellow-600';
  return 'text-red-600';
}

/**
 * Gets the appropriate background color class for progress bar
 */
function getProgressBarColor(percentage: number): string {
  if (percentage >= 80) return 'bg-green-500';
  if (percentage >= 60) return 'bg-yellow-500';
  return 'bg-red-500';
}

// ============================================================================
// ProfileCompleteness Component
// ============================================================================

function ProfileCompleteness({
  account,
  onCompleteProfile,
  showCompleteButton = true,
}: ProfileCompletenessProps) {
  // Calculate completeness metrics
  const completeness = useMemo(() => calculateCompleteness(account), [account]);

  const { completedFields, totalFields, percentage, missingFields } = completeness;
  const isComplete = percentage === 100;
  const hasRequiredMissing = missingFields.some(field => field.required);

  // Get role-specific messaging
  const getRoleMessage = (): string => {
    switch (account.role) {
      case ACCOUNT_ROLES.COACH:
        return 'Complete your coaching profile to attract more clients';
      case ACCOUNT_ROLES.ADMIN:
        return 'Complete your admin profile for better system management';
      default:
        return 'Complete your profile for a better experience';
    }
  };

  return (
    <div className='bg-white rounded-lg shadow-md p-6'>
      <div className='flex items-center justify-between mb-4'>
        <h2 className='text-2xl font-bold text-gray-900'>Profile Completeness</h2>
        <div className={`text-2xl font-bold ${getCompletionColor(percentage)}`}>{percentage}%</div>
      </div>

      {/* Progress Bar */}
      <div className='mb-6'>
        <div className='flex justify-between text-sm text-gray-600 mb-2'>
          <span>
            {completedFields} of {totalFields} fields completed
          </span>
          <span>{getRoleMessage()}</span>
        </div>
        <div className='w-full bg-gray-200 rounded-full h-3'>
          <div
            className={`h-3 rounded-full transition-all duration-300 ${getProgressBarColor(percentage)}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Completion Status */}
      {isComplete ? (
        <div className='flex items-center p-4 bg-green-50 border border-green-200 rounded-lg'>
          <svg
            className='w-6 h-6 text-green-500 mr-3'
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
          <div>
            <h3 className='text-lg font-semibold text-green-800'>Profile Complete!</h3>
            <p className='text-green-700'>Your profile is fully completed and ready to go.</p>
          </div>
        </div>
      ) : (
        <>
          {/* Missing Fields */}
          {missingFields.length > 0 && (
            <div className='mb-6'>
              <h3 className='text-lg font-semibold text-gray-900 mb-3'>
                {hasRequiredMissing ? 'Required Fields Missing' : 'Optional Fields to Complete'}
              </h3>
              <div className='space-y-2'>
                {missingFields.map(field => (
                  <div
                    key={field.key}
                    className={`flex items-center p-3 rounded-lg border ${
                      field.required ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
                    }`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full mr-3 ${
                        field.required ? 'bg-red-500' : 'bg-yellow-500'
                      }`}
                    />
                    <div className='flex-1'>
                      <span className='font-medium text-gray-900'>{field.label}</span>
                      {field.required && (
                        <span className='ml-2 text-sm text-red-600'>(Required)</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Call to Action */}
          {showCompleteButton && onCompleteProfile && (
            <div className='text-center'>
              <button
                onClick={onCompleteProfile}
                className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                  hasRequiredMissing
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-orange-500 hover:bg-orange-600 text-white'
                }`}
              >
                {hasRequiredMissing ? 'Complete Required Fields' : 'Complete Profile'}
              </button>
            </div>
          )}
        </>
      )}

      {/* Role-Specific Tips */}
      {account.role === ACCOUNT_ROLES.COACH && !isComplete && (
        <div className='mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg'>
          <h4 className='font-semibold text-blue-900 mb-2'>Coach Profile Tips:</h4>
          <ul className='text-sm text-blue-800 space-y-1'>
            <li>• A complete bio helps clients understand your coaching style</li>
            <li>• Credentials build trust and credibility</li>
            <li>• Your philosophy shows your unique approach to coaching</li>
            <li>• Experience details help clients choose the right coach</li>
          </ul>
        </div>
      )}
    </div>
  );
}

export default ProfileCompleteness;
