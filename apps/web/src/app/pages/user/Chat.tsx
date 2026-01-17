import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import ChatInterface from '../../components/Chat/ChatInterface';
import { ErrorMessage } from '../../components/Common';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { accountService, isAppError } from '../../services';
import { ACCOUNT_ROLES, type Account } from '../../services/types';

/**
 * Chat page state interface.
 */
interface ChatPageState {
  /** Available contacts based on user role */
  availableContacts: Account[];
  /** Whether contacts are being loaded */
  loadingContacts: boolean;
  /** Error message if contact loading failed */
  contactsError: string | null;
}

/**
 * Initial state for the chat page.
 */
const initialState: ChatPageState = {
  availableContacts: [],
  loadingContacts: true,
  contactsError: null,
};

/**
 * Chat page component.
 *
 * Provides an enhanced messaging interface with:
 * - Conversation management with pinning support
 * - Custom service message rendering
 * - Role-based contact visibility
 * - Real-time conversation updates
 * - Support for session-specific messages via URL param
 */
function Chat() {
  const { account } = useAuth();
  const { addNotification } = useNotification();
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<ChatPageState>(initialState);

  // URL parameters for session-specific messages
  const sessionIdParam = searchParams.get('sessionId');
  const receiverIdParam = searchParams.get('receiverId');

  // Fetch available contacts based on user role
  useEffect(() => {
    if (!account) return;

    let isMounted = true;

    const loadContacts = async () => {
      setState(prev => ({ ...prev, loadingContacts: true, contactsError: null }));

      try {
        let contacts: Account[] = [];
        const userRole = account.role;

        if (userRole === ACCOUNT_ROLES.ADMIN) {
          // Admins can see all accounts
          contacts = await accountService.getAccounts();
          // Filter out self
          contacts = contacts.filter(c => c.id !== account.id);
        } else if (userRole === ACCOUNT_ROLES.COACH) {
          // Coaches can see admins and users who have messaged them
          // For now, show all accounts (backend should filter appropriately)
          // The conversation list will show users who have messaged
          const allAccounts = await accountService.getAccounts();
          contacts = allAccounts.filter(
            c =>
              c.id !== account.id &&
              (c.role === ACCOUNT_ROLES.ADMIN || c.role === ACCOUNT_ROLES.USER)
          );
        } else {
          // Users can only see coaches and admins
          const coaches = await accountService.getCoaches();
          const allAccounts = await accountService.getAccounts();
          const admins = allAccounts.filter(a => a.role === ACCOUNT_ROLES.ADMIN);
          contacts = [...coaches, ...admins].filter(c => c.id !== account.id);
        }

        if (isMounted) {
          setState(prev => ({
            ...prev,
            availableContacts: contacts,
            loadingContacts: false,
          }));
        }
      } catch (error) {
        if (isMounted) {
          const message = isAppError(error) ? error.message : 'Failed to load contacts';
          setState(prev => ({
            ...prev,
            contactsError: message,
            loadingContacts: false,
          }));
          addNotification('error', message);
        }
      }
    };

    loadContacts();

    return () => {
      isMounted = false;
    };
  }, [account, addNotification]);

  // Not authenticated
  if (!account) {
    return (
      <div className='container mx-auto px-4 py-8'>
        <h1 className='text-3xl font-bold mb-6 text-white'>Messages</h1>
        <ErrorMessage
          variant='card'
          title='Authentication Required'
          message='Please log in to view your messages.'
        />
      </div>
    );
  }

  // Contacts loading error
  if (state.contactsError) {
    return (
      <div className='container mx-auto px-4 py-8'>
        <h1 className='text-3xl font-bold mb-6 text-white'>Messages</h1>
        <ErrorMessage
          variant='card'
          title='Failed to Load Contacts'
          message={state.contactsError}
          onRetry={() => window.location.reload()}
          retryText='Try Again'
        />
      </div>
    );
  }

  return (
    <div className='container mx-auto px-4 py-8'>
      {/* Header */}
      <div className='mb-6'>
        <h1 className='text-3xl font-bold text-white'>Messages</h1>
        {sessionIdParam && <p className='text-gray-400 mt-1'>Viewing messages for session</p>}
        {(account.role === 'COACH' || account.role === 'ADMIN') && (
          <p className='text-sm text-orange-400 mt-1'>
            You can pin important conversations for quick access
          </p>
        )}
      </div>

      {/* Enhanced Chat Interface */}
      <ChatInterface
        sessionId={sessionIdParam || undefined}
        receiverId={receiverIdParam || undefined}
        availableContacts={state.availableContacts}
        loadingContacts={state.loadingContacts}
      />
    </div>
  );
}

export default Chat;
