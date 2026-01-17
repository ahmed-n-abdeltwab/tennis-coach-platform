import type { ConversationSummary } from '../../services';
import type { Account, AuthAccount } from '../../services/types';

interface PinnedConversationsProps {
  /** Array of pinned conversations */
  conversations: ConversationSummary[];
  /** The current authenticated user */
  currentUser: AuthAccount;
  /** Currently selected conversation ID */
  selectedConversationId?: string | null;
  /** Callback when a conversation is selected */
  onSelectConversation: (conversationId: string) => void;
  /** Callback when a conversation is unpinned */
  onUnpinConversation: (conversationId: string) => void;
  /** Whether unpin operations are in progress */
  unpinningIds?: Set<string>;
  /** Available contacts for name resolution */
  availableContacts?: Account[];
}

/**
 * Formats a date for display in the pinned conversations list.
 */
function formatPinnedDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';

  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }
}

/**
 * Gets the partner name from a conversation.
 */
function getPartnerName(
  conversation: ConversationSummary,
  currentUserId: string,
  availableContacts?: Account[]
): string {
  // Find the partner ID (the participant that's not the current user)
  const partnerId = conversation.participantIds.find(id => id !== currentUserId);

  if (!partnerId) {
    return 'Unknown User';
  }

  // Try to get name from last message
  if (conversation.lastMessage) {
    const isOwnMessage = conversation.lastMessage.senderId === currentUserId;
    if (!isOwnMessage && conversation.lastMessage.sender?.email) {
      return conversation.lastMessage.sender.email;
    }
    if (isOwnMessage && conversation.lastMessage.receiver?.email) {
      return conversation.lastMessage.receiver.email;
    }
  }

  // Try to get name from available contacts
  if (availableContacts) {
    const contact = availableContacts.find(c => c.id === partnerId);
    if (contact) {
      return contact.email;
    }
  }

  return 'Unknown User';
}

/**
 * Truncates a message preview to a maximum length.
 */
function truncateMessage(content: string | null | undefined, maxLength = 40): string {
  if (!content) return 'No message';
  if (content.length <= maxLength) return content;
  return `${content.substring(0, maxLength)}...`;
}

/**
 * PinnedConversations component displays a list of pinned conversations.
 *
 * Shows pinned conversations sorted by most recently pinned date.
 * Allows selecting conversations and unpinning them.
 * Only visible to coaches and admins who can pin conversations.
 *
 *
 * @example
 * <PinnedConversations
 *   conversations={pinnedConversations}
 *   currentUser={account}
 *   selectedConversationId={selectedId}
 *   onSelectConversation={(id) => setSelectedId(id)}
 *   onUnpinConversation={(id) => handleUnpin(id)}
 *   unpinningIds={unpinningSet}
 * />
 */
function PinnedConversations({
  conversations,
  currentUser,
  selectedConversationId,
  onSelectConversation,
  onUnpinConversation,
  unpinningIds = new Set(),
  availableContacts,
}: PinnedConversationsProps) {
  if (conversations.length === 0) {
    return null; // Don't show the section if no pinned conversations
  }

  // Sort by most recently pinned
  const sortedConversations = [...conversations].sort((a, b) => {
    const dateA = a.pinnedAt ? new Date(a.pinnedAt).getTime() : 0;
    const dateB = b.pinnedAt ? new Date(b.pinnedAt).getTime() : 0;
    return dateB - dateA;
  });

  return (
    <div className='mb-4'>
      {/* Section Header */}
      <div className='px-4 py-2 border-b border-gray-700'>
        <div className='flex items-center gap-2'>
          <svg
            className='h-4 w-4 text-orange-400'
            fill='currentColor'
            viewBox='0 0 20 20'
            aria-hidden='true'
          >
            <path
              fillRule='evenodd'
              d='M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z'
              clipRule='evenodd'
            />
          </svg>
          <h3 className='text-sm font-medium text-orange-400'>Pinned Conversations</h3>
          <span className='text-xs text-gray-500'>({conversations.length})</span>
        </div>
      </div>

      {/* Pinned Conversations List */}
      <div className='divide-y divide-gray-700' role='list' aria-label='Pinned conversations'>
        {sortedConversations.map(conversation => (
          <PinnedConversationItem
            key={conversation.id}
            conversation={conversation}
            isSelected={selectedConversationId === conversation.id}
            currentUserId={currentUser.id}
            onSelect={() => onSelectConversation(conversation.id)}
            onUnpin={() => onUnpinConversation(conversation.id)}
            isUnpinning={unpinningIds.has(conversation.id)}
            availableContacts={availableContacts}
          />
        ))}
      </div>
    </div>
  );
}

interface PinnedConversationItemProps {
  conversation: ConversationSummary;
  isSelected: boolean;
  currentUserId: string;
  onSelect: () => void;
  onUnpin: () => void;
  isUnpinning: boolean;
  availableContacts?: Account[];
}

/**
 * Individual pinned conversation item.
 */
function PinnedConversationItem({
  conversation,
  isSelected,
  currentUserId,
  onSelect,
  onUnpin,
  isUnpinning,
  availableContacts,
}: PinnedConversationItemProps) {
  const partnerName = getPartnerName(conversation, currentUserId, availableContacts);
  const hasLastMessage =
    conversation.lastMessage !== null && conversation.lastMessage !== undefined;
  const isOwnMessage = hasLastMessage && conversation.lastMessage?.senderId === currentUserId;
  const messagePreview = hasLastMessage
    ? isOwnMessage
      ? `You: ${truncateMessage(conversation.lastMessage?.content)}`
      : truncateMessage(conversation.lastMessage?.content)
    : 'No messages yet';

  const handleUnpinClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent conversation selection
    onUnpin();
  };

  return (
    <div
      className={`relative group transition-colors hover:bg-gray-700/50 ${
        isSelected ? 'bg-gray-700' : ''
      }`}
    >
      <button
        type='button'
        onClick={onSelect}
        className='w-full p-3 text-left focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-inset'
        aria-pressed={isSelected}
      >
        <div className='flex items-start gap-3'>
          {/* Avatar with pin indicator */}
          <div className='relative shrink-0'>
            <div className='w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center'>
              <span className='text-orange-400 font-semibold text-xs'>
                {partnerName.charAt(0).toUpperCase()}
              </span>
            </div>
            {/* Pin indicator */}
            <div className='absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full flex items-center justify-center'>
              <svg
                className='h-2 w-2 text-white'
                fill='currentColor'
                viewBox='0 0 20 20'
                aria-hidden='true'
              >
                <path
                  fillRule='evenodd'
                  d='M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z'
                  clipRule='evenodd'
                />
              </svg>
            </div>
          </div>

          <div className='flex-1 min-w-0'>
            <div className='flex items-center justify-between mb-1'>
              <h4 className='font-medium text-white text-sm truncate'>{partnerName}</h4>
              {hasLastMessage && (
                <span className='text-xs text-gray-500 shrink-0 ml-2'>
                  {formatPinnedDate(conversation.lastMessage?.sentAt)}
                </span>
              )}
            </div>
            <p className='text-xs text-gray-400 truncate'>{messagePreview}</p>
            {(conversation.unreadCount ?? 0) > 0 && (
              <div className='flex items-center gap-2 mt-1'>
                <span className='inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-orange-500 text-white'>
                  {conversation.unreadCount}
                </span>
                <span className='text-xs text-gray-500'>unread</span>
              </div>
            )}
          </div>
        </div>
      </button>

      {/* Unpin button */}
      <button
        type='button'
        onClick={handleUnpinClick}
        disabled={isUnpinning}
        className='absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50'
        aria-label='Unpin conversation'
        title='Unpin conversation'
      >
        {isUnpinning ? (
          <svg
            className='h-3 w-3 animate-spin text-gray-400'
            fill='none'
            viewBox='0 0 24 24'
            aria-hidden='true'
          >
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
            className='h-3 w-3 text-gray-400 hover:text-white'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
            aria-hidden='true'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M6 18L18 6M6 6l12 12'
            />
          </svg>
        )}
      </button>
    </div>
  );
}

export default PinnedConversations;
