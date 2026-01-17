import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { accountService, isAppError } from '../../services';
import { LoadingSpinner } from '../Common';

interface HomeContentData {
  bio: string;
  credentials: string;
  philosophy: string;
  profileImage: string;
}

interface HomeContentEditorProps {
  onSave?: (data: HomeContentData) => void;
  onCancel?: () => void;
}

export function HomeContentEditor({ onSave, onCancel }: HomeContentEditorProps) {
  const { account } = useAuth();
  const { addNotification } = useNotification();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<HomeContentData>({
    bio: '',
    credentials: '',
    philosophy: '',
    profileImage: '',
  });

  const [originalData, setOriginalData] = useState<HomeContentData>({
    bio: '',
    credentials: '',
    philosophy: '',
    profileImage: '',
  });

  // Load current account data
  const loadAccountData = useCallback(async () => {
    if (!account?.id) return;

    setLoading(true);
    setError(null);

    try {
      const accountData = await accountService.getAccount(account.id);

      const contentData: HomeContentData = {
        bio: accountData.bio ?? '',
        credentials: accountData.credentials ?? '',
        philosophy: accountData.philosophy ?? '',
        profileImage: accountData.profileImage ?? '',
      };

      setFormData(contentData);
      setOriginalData(contentData);
    } catch (err) {
      const errorMessage = isAppError(err) ? err.message : 'Failed to load account data';
      setError(errorMessage);
      addNotification('error', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [account?.id, addNotification]);

  useEffect(() => {
    loadAccountData();
  }, [loadAccountData]);

  // Handle form field changes
  const handleFieldChange = (field: keyof HomeContentData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // Check if form has changes
  const hasChanges = () => {
    return Object.keys(formData).some(
      key => formData[key as keyof HomeContentData] !== originalData[key as keyof HomeContentData]
    );
  };

  // Handle form submission
  const handleSave = async () => {
    if (!account?.id) return;

    setSaving(true);
    setError(null);

    try {
      await accountService.updateAccount(account.id, {
        bio: formData.bio || undefined,
        credentials: formData.credentials || undefined,
        philosophy: formData.philosophy || undefined,
        profileImage: formData.profileImage || undefined,
      });

      setOriginalData({ ...formData });
      addNotification('success', 'Home page content updated successfully');

      if (onSave) {
        onSave(formData);
      }
    } catch (err) {
      const errorMessage = isAppError(err) ? err.message : 'Failed to update content';
      setError(errorMessage);
      addNotification('error', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setFormData({ ...originalData });
    setError(null);

    if (onCancel) {
      onCancel();
    }
  };

  // Generate preview image URL
  const getPreviewImageUrl = () => {
    if (formData.profileImage) {
      return formData.profileImage;
    }

    if (account?.email) {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(account.email)}&size=200&background=f97316&color=fff`;
    }

    return '';
  };

  if (loading) {
    return <LoadingSpinner message='Loading content...' fullScreen />;
  }

  return (
    <div className='max-w-4xl mx-auto'>
      <div className='mb-6'>
        <h2 className='text-2xl font-semibold text-white mb-2'>Edit Home Page Content</h2>
        <p className='text-gray-400'>
          Update the information that appears on the home page to attract and inform potential
          clients.
        </p>
      </div>

      {error && (
        <div className='bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6'>
          <p className='text-red-400'>{error}</p>
        </div>
      )}

      <div className='grid lg:grid-cols-2 gap-8'>
        {/* Form Section */}
        <div className='space-y-6'>
          {/* Bio Field */}
          <div>
            <label htmlFor='bio' className='block text-sm font-medium text-gray-300 mb-2'>
              Bio
              <span className='text-gray-500 ml-1'>(Recommended: 50+ characters)</span>
            </label>
            <textarea
              id='bio'
              value={formData.bio}
              onChange={e => handleFieldChange('bio', e.target.value)}
              placeholder='Tell potential clients about yourself, your experience, and what makes you unique as a tennis coach...'
              rows={4}
              className='w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-vertical'
            />
            <p className='text-xs text-gray-500 mt-1'>
              {formData.bio.length} characters
              {formData.bio.length < 50 && formData.bio.length > 0 && (
                <span className='text-yellow-400 ml-1'>
                  (Consider adding more detail for better client engagement)
                </span>
              )}
            </p>
          </div>

          {/* Credentials Field */}
          <div>
            <label htmlFor='credentials' className='block text-sm font-medium text-gray-300 mb-2'>
              Credentials
              <span className='text-gray-500 ml-1'>(Recommended: 20+ characters)</span>
            </label>
            <textarea
              id='credentials'
              value={formData.credentials}
              onChange={e => handleFieldChange('credentials', e.target.value)}
              placeholder='List your certifications, qualifications, achievements, and professional experience...'
              rows={3}
              className='w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-vertical'
            />
            <p className='text-xs text-gray-500 mt-1'>
              {formData.credentials.length} characters
              {formData.credentials.length < 20 && formData.credentials.length > 0 && (
                <span className='text-yellow-400 ml-1'>
                  (Consider providing more detailed qualifications)
                </span>
              )}
            </p>
          </div>

          {/* Philosophy Field */}
          <div>
            <label htmlFor='philosophy' className='block text-sm font-medium text-gray-300 mb-2'>
              Coaching Philosophy
              <span className='text-gray-500 ml-1'>(Recommended: 30+ characters)</span>
            </label>
            <textarea
              id='philosophy'
              value={formData.philosophy}
              onChange={e => handleFieldChange('philosophy', e.target.value)}
              placeholder='Share your coaching philosophy, approach, and what clients can expect from working with you...'
              rows={3}
              className='w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-vertical'
            />
            <p className='text-xs text-gray-500 mt-1'>
              {formData.philosophy.length} characters
              {formData.philosophy.length < 30 && formData.philosophy.length > 0 && (
                <span className='text-yellow-400 ml-1'>
                  (Consider expressing your coaching approach more clearly)
                </span>
              )}
            </p>
          </div>

          {/* Profile Image Field */}
          <div>
            <label htmlFor='profileImage' className='block text-sm font-medium text-gray-300 mb-2'>
              Profile Image URL
              <span className='text-gray-500 ml-1'>(Optional)</span>
            </label>
            <input
              id='profileImage'
              type='url'
              value={formData.profileImage}
              onChange={e => handleFieldChange('profileImage', e.target.value)}
              placeholder='https://example.com/your-photo.jpg'
              className='w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent'
            />
            <p className='text-xs text-gray-500 mt-1'>
              Leave empty to use a generated avatar based on your email
            </p>
          </div>
        </div>

        {/* Preview Section */}
        <div className='lg:sticky lg:top-6'>
          <h3 className='text-lg font-semibold text-white mb-4'>Preview</h3>
          <div className='bg-gray-800 rounded-lg p-6 border border-gray-700'>
            <div className='text-center mb-6'>
              <img
                src={getPreviewImageUrl()}
                alt={`${account?.email ?? 'Coach'} - Preview`}
                className='w-32 h-32 rounded-full mx-auto mb-4 object-cover'
                onError={e => {
                  // Fallback to generated avatar if custom image fails to load
                  const target = e.target as HTMLImageElement;
                  if (
                    account?.email &&
                    target.src !==
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(account.email)}&size=200&background=f97316&color=fff`
                  ) {
                    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(account.email)}&size=200&background=f97316&color=fff`;
                  }
                }}
              />
              <h4 className='text-xl font-bold text-white'>{account?.email ?? 'Your Email'}</h4>
            </div>

            {formData.credentials && (
              <div className='mb-4'>
                <p className='text-orange-500 text-sm font-medium'>{formData.credentials}</p>
              </div>
            )}

            {formData.bio && (
              <div className='mb-4'>
                <p className='text-gray-300 text-sm'>{formData.bio}</p>
              </div>
            )}

            {formData.philosophy && (
              <div className='mb-4'>
                <blockquote className='italic text-sm text-gray-300 border-l-4 border-orange-500 pl-3'>
                  &quot;{formData.philosophy}&quot;
                </blockquote>
              </div>
            )}

            {!formData.bio && !formData.credentials && !formData.philosophy && (
              <p className='text-gray-500 text-sm text-center'>
                Fill in the form to see your preview
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className='flex justify-end gap-4 mt-8 pt-6 border-t border-gray-700'>
        <button
          onClick={handleCancel}
          disabled={saving}
          className='px-6 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50'
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges()}
          className='bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2'
        >
          {saving && (
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
          )}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

export default HomeContentEditor;
