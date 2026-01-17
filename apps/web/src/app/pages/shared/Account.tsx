import {
  ImageUploader,
  PasswordChanger,
  ProfileCompleteness,
  ProfileEditor,
} from '@components/Account';
import { useAuth } from '@contexts/AuthContext';
import { accountService } from '@services/account.service';
import { isAppError } from '@services/error-handler';
import { type Account } from '@services/types';
import { useCallback, useEffect, useRef, useState } from 'react';

// ============================================================================
// Types
// ============================================================================

type ActiveTab = 'profile' | 'password' | 'image' | 'completeness';

interface AccountPageState {
  account: Account | null;
  loading: boolean;
  error: string | null;
  activeTab: ActiveTab;
}

// ============================================================================
// Account Page Component
// ============================================================================

function Account() {
  const { account: authAccount, refreshAuth } = useAuth();
  const [state, setState] = useState<AccountPageState>({
    account: null,
    loading: true,
    error: null,
    activeTab: 'profile',
  });
  const hasLoadedRef = useRef(false);

  /**
   * Loads the current account details
   */
  const loadAccount = useCallback(async () => {
    if (!authAccount?.id) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const account = await accountService.getAccount(authAccount.id);
      setState(prev => ({ ...prev, account, loading: false }));
    } catch (error) {
      const errorMessage = isAppError(error) ? error.message : 'Failed to load account';
      setState(prev => ({ ...prev, error: errorMessage, loading: false }));
    }
  }, [authAccount]);

  /**
   * Handles tab change
   */
  const handleTabChange = useCallback((tab: ActiveTab) => {
    setState(prev => ({ ...prev, activeTab: tab }));
  }, []);

  /**
   * Handles profile update success
   */
  const handleProfileUpdated = useCallback(
    async (updatedAccount: Account) => {
      setState(prev => ({ ...prev, account: updatedAccount }));

      // Refresh auth context to update header and other components
      try {
        await refreshAuth();
      } catch (error) {
        // Ignore refresh errors - the profile was still updated successfully
        console.warn('Failed to refresh auth after profile update:', error);
      }
    },
    [refreshAuth]
  );

  /**
   * Handles password change success
   */
  const handlePasswordChanged = useCallback(() => {
    // Password changed successfully - could show notification here
  }, []);

  /**
   * Handles image upload success
   */
  const handleImageUploaded = useCallback(
    (imageUrl: string) => {
      if (state.account) {
        const updatedAccount = { ...state.account, profileImage: imageUrl };
        setState(prev => ({ ...prev, account: updatedAccount }));
      }
    },
    [state.account]
  );

  /**
   * Handles errors from child components
   */
  const handleError = useCallback((error: string) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  /**
   * Clears error state
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  /**
   * Handles complete profile action
   */
  const handleCompleteProfile = useCallback(() => {
    handleTabChange('profile');
  }, [handleTabChange]);

  // Load account on mount
  useEffect(() => {
    if (!hasLoadedRef.current && authAccount?.id) {
      hasLoadedRef.current = true;

      // Move the async logic directly into the effect
      const loadAccountData = async () => {
        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
          const account = await accountService.getAccount(authAccount.id);
          setState(prev => ({ ...prev, account, loading: false }));
        } catch (error) {
          const errorMessage = isAppError(error) ? error.message : 'Failed to load account';
          setState(prev => ({ ...prev, error: errorMessage, loading: false }));
        }
      };

      void loadAccountData();
    }
  }, [authAccount?.id]);

  // Show loading state
  if (state.loading) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4'></div>
          <p className='text-gray-600'>Loading account information...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (state.error && !state.account) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='text-center'>
          <div className='bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4'>
            {state.error}
          </div>
          <button
            onClick={loadAccount}
            className='bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold'
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!state.account) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <p className='text-gray-600'>Account not found</p>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-50 py-8'>
      <div className='max-w-4xl mx-auto px-4'>
        {/* Page Header */}
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-gray-900'>Account Management</h1>
          <p className='text-gray-600 mt-2'>
            Manage your profile, security settings, and account preferences
          </p>
        </div>

        {/* Error Display */}
        {state.error && (
          <div className='mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative'>
            {state.error}
            <button onClick={clearError} className='absolute top-0 bottom-0 right-0 px-4 py-3'>
              <svg className='w-4 h-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M6 18L18 6M6 6l12 12'
                />
              </svg>
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className='bg-white rounded-lg shadow-md mb-6'>
          <div className='border-b border-gray-200'>
            <nav className='flex space-x-8 px-6'>
              <button
                onClick={() => handleTabChange('profile')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  state.activeTab === 'profile'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Profile Information
              </button>
              <button
                onClick={() => handleTabChange('completeness')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  state.activeTab === 'completeness'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Profile Completeness
              </button>
              <button
                onClick={() => handleTabChange('image')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  state.activeTab === 'image'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Profile Image
              </button>
              <button
                onClick={() => handleTabChange('password')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  state.activeTab === 'password'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Security
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className='space-y-6'>
          {state.activeTab === 'profile' && (
            <ProfileEditor
              account={state.account}
              onProfileUpdated={handleProfileUpdated}
              onError={handleError}
            />
          )}

          {state.activeTab === 'completeness' && (
            <ProfileCompleteness
              account={state.account}
              onCompleteProfile={handleCompleteProfile}
              showCompleteButton={true}
            />
          )}

          {state.activeTab === 'image' && authAccount && (
            <ImageUploader
              accountId={authAccount.id}
              currentImageUrl={state.account.profileImage ?? undefined}
              onImageUploaded={handleImageUploaded}
              onError={handleError}
              maxSizeMB={5}
              allowedTypes={['image/jpeg', 'image/jpg', 'image/png', 'image/webp']}
            />
          )}

          {state.activeTab === 'password' && (
            <PasswordChanger onPasswordChanged={handlePasswordChanged} onError={handleError} />
          )}
        </div>

        {/* Quick Actions */}
        <div className='mt-8 bg-white rounded-lg shadow-md p-6'>
          <h3 className='text-lg font-semibold text-gray-900 mb-4'>Quick Actions</h3>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            <button
              onClick={() => handleTabChange('completeness')}
              className='p-4 border border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors text-left'
            >
              <div className='flex items-center'>
                <svg
                  className='w-6 h-6 text-orange-500 mr-3'
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
                  <h4 className='font-medium text-gray-900'>Check Completeness</h4>
                  <p className='text-sm text-gray-600'>Review your profile status</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => handleTabChange('password')}
              className='p-4 border border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors text-left'
            >
              <div className='flex items-center'>
                <svg
                  className='w-6 h-6 text-orange-500 mr-3'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
                  />
                </svg>
                <div>
                  <h4 className='font-medium text-gray-900'>Update Password</h4>
                  <p className='text-sm text-gray-600'>Change your password</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => handleTabChange('image')}
              className='p-4 border border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors text-left'
            >
              <div className='flex items-center'>
                <svg
                  className='w-6 h-6 text-orange-500 mr-3'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'
                  />
                </svg>
                <div>
                  <h4 className='font-medium text-gray-900'>Upload Image</h4>
                  <p className='text-sm text-gray-600'>Update your profile picture</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Account;
