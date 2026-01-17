import { useSocket } from '../../hooks';
import type { ConversationSummary } from '../../services';
import type { Account, AuthAccount, Message } from '../../services/types';

/**
 * Represents a conversation with a partner, including the last message.
 */
export interface Conversation {
  /** The conversation partner's ID */
  partnerId: string;
  /** The conversation partner's name */
  partnerName: string;
  /** The last message in the conversation */
  lastMessage: Message | null;
  /** Total number of messages in the conversation */
  messageCount: number;
  /** The partner's role */
  partnerRole?: string;
  /** Whether the conversation is pinned (coaches only) */
  isPinned?: boolean;
  /** Unread message count */
  unreadCount?: number;
  /** Conversation ID for enhanced features */
  conversationId?: string;
}

interface ConversationListProps {
  /** Array of messages to group into conversations */
  messages: Message[];
  /** The current authenticated user */
  currentUser: AuthAccount;
  /** Currently selected conversation partner ID */
  selectedPartnerId?: string | null;
  /** Callback when a conversation is selected */
  onSelectConversation: (partnerId: string) => void;
  /** Available contacts to show (even without messages) */
  availableContacts?: Account[];
  /** Enhanced conversation data from API */
  conversationSummaries?: ConversationSummary[];
  /** Callback when a conversation is pinned (coaches only) */
  onPinConversation?: (conversationId: string) => void;
  /** Callback when a conversation is unpinned (coaches only) */
  onUnpinConversation?: (conversationId: string) => void;
  /** Set of conversation IDs currently being pinned/unpinned */
  processingPinIds?: Set<string>;
}

/**
 * Groups messages by conversation partner.
 *
 * @param messages - Array of messages to group
 * @param currentUserId - The current user's ID
 * @returns Map of partner ID to array of messages
 */
export function groupMessagesByConversation(
  messages: Message[],
  currentUserId: string
): Map<string, Message[]> {
  return messages.reduce((groups, msg) => {
    const partnerId = msg.senderId === currentUserId ? msg.receiverId : msg.senderId;
    if (!partnerId) return groups;

    const existing = groups.get(partnerId) ?? [];
    groups.set(partnerId, [...existing, msg]);
    return groups;
  }, new Map<string, Message[]>());
}

/**
 * Converts grouped messages into Conversation objects.
 *
 * @param groupedMessages - Map of partner ID to messages
 * @param availableContacts - Optional array of available contacts to include
 * @param conversationSummaries - Enhanced conversation data from API
 * @returns Array of Conversation objects sorted by last message date
 */
function createConversations(
  groupedMessages: Map<string, Message[]>,
  availableContacts?: Account[],
  conversationSummaries?: ConversationSummary[],
  currentUserId?: string
): Conversation[] {
  const conversations: Conversation[] = [];
  const addedPartnerIds = new Set<string>();

  // Create a map of conversation summaries by participant ID for quick lookup
  const summaryByPartnerId = new Map<string, ConversationSummary>();
  if (conversationSummaries) {
    conversationSummaries.forEach(summary => {
      // Find the partner ID (the participant that's not the current user)
      const partnerId = summary.participantIds.find(id => id !== currentUserId);
      if (partnerId) {
        summaryByPartnerId.set(partnerId, summary);
      }
    });
  }

  // First, add conversations from messages
  groupedMessages.forEach((msgs, partnerId) => {
    // Sort messages by date to get the last one
    const sortedMsgs = [...msgs].sort((a, b) => {
      const dateA = a.sentAt ? new Date(a.sentAt).getTime() : 0;
      const dateB = b.sentAt ? new Date(b.sentAt).getTime() : 0;
      return dateB - dateA;
    });

    const lastMessage = sortedMsgs[0];
    if (!lastMessage) return;

    // Get partner name from sender or receiver
    const partnerName =
      lastMessage.senderId === partnerId
        ? (lastMessage.sender?.name ?? 'Unknown User')
        : (lastMessage.receiver?.name ?? 'Unknown User');

    // Get conversation summary data if available
    const summary = summaryByPartnerId.get(partnerId);

    conversations.push({
      partnerId,
      partnerName,
      lastMessage,
      messageCount: msgs.length,
      isPinned: summary?.isPinned ?? false,
      unreadCount: summary?.unreadCount ?? 0,
      conversationId: summary?.id,
    });
    addedPartnerIds.add(partnerId);
  });

  // Then, add available contacts that don't have conversations yet
  if (availableContacts) {
    for (const contact of availableContacts) {
      if (!addedPartnerIds.has(contact.id)) {
        const summary = summaryByPartnerId.get(contact.id);
        conversations.push({
          partnerId: contact.id,
          partnerName: contact.name,
          lastMessage: null,
          messageCount: 0,
          partnerRole: contact.role,
          isPinned: summary?.isPinned ?? false,
          unreadCount: summary?.unreadCount ?? 0,
          conversationId: summary?.id,
        });
      }
    }
  }

  // Sort conversations: pinned first (by pin date), then by message date, then alphabetically
  return conversations.sort((a, b) => {
    // Pinned conversations come first
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;

    // If both are pinned, sort by pin date (most recent first)
    if (a.isPinned && b.isPinned) {
      const summaryA = summaryByPartnerId.get(a.partnerId);
      const summaryB = summaryByPartnerId.get(b.partnerId);

      if (summaryA?.pinnedAt && summaryB?.pinnedAt) {
        const dateA = new Date(summaryA.pinnedAt).getTime();
        const dateB = new Date(summaryB.pinnedAt).getTime();
        return dateB - dateA; // Most recent pin first
      }
      return 0;
    }

    // If both have messages, sort by date
    if (a.lastMessage && b.lastMessage) {
      const dateA = a.lastMessage.sentAt ? new Date(a.lastMessage.sentAt).getTime() : 0;
      const dateB = b.lastMessage.sentAt ? new Date(b.lastMessage.sentAt).getTime() : 0;
      return dateB - dateA;
    }
    // Messages come before no messages
    if (a.lastMessage && !b.lastMessage) return -1;
    if (!a.lastMessage && b.lastMessage) return 1;
    // Both have no messages, sort alphabetically
    return a.partnerName.localeCompare(b.partnerName);
  });
}

/**
 * Formats a date for display in the conversation list.
 */
function formatMessageDate(dateStr: string | null | undefined): string {
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
 * Truncates a message preview to a maximum length.
 */
function truncateMessage(content: string | null | undefined, maxLength = 50): string {
  if (!content) return 'No message';
  if (content.length <= maxLength) return content;
  return `${content.substring(0, maxLength)}...`;
}

/**
 * ConversationList component displays a list of conversation partners.
 *
 * Groups messages by conversation partner and shows the last message preview.
 * Allows selecting a conversation to view its messages.
 * Shows available contacts even if no messages exist yet.
 * Supports pinning/unpinning conversations for coaches.
 * Displays unread message counts and conversation status.
 *
 *
 * @example
 * <ConversationList
 *   messages={messages}
 *   currentUser={account}
 *   selectedPartnerId={selectedId}
 *   onSelectConversation={(id) => setSelectedId(id)}
 *   availableContacts={contacts}
 *   conversationSummaries={summaries}
 *   onPinConversation={(id) => handlePin(id)}
 *   onUnpinConversation={(id) => handleUnpin(id)}
 *   processingPinIds={processingSet}
 * />
 */
function ConversationList({
  messages,
  currentUser,
  selectedPartnerId,
  onSelectConversation,
  availableContacts,
  conversationSummaries,
  onPinConversation,
  onUnpinConversation,
  processingPinIds = new Set(),
}: ConversationListProps) {
  const socket = useSocket();
  const groupedMessages = groupMessagesByConversation(messages, currentUser.id);
  const conversations = createConversations(
    groupedMessages,
    availableContacts,
    conversationSummaries,
    currentUser.id
  );

  // Check if user can pin conversations (coaches and admins)
  const canPinConversations = currentUser.role === 'COACH' || currentUser.role === 'ADMIN';

  if (conversations.length === 0) {
    return (
      <div className='p-4 text-center text-gray-400'>
        <p>No conversations yet</p>
        <p className='text-sm mt-1'>No contacts available to message</p>
      </div>
    );
  }

  return (
    <div className='divide-y divide-gray-700' role='list' aria-label='Conversations'>
      {conversations.map(conversation => (
        <ConversationItem
          key={conversation.partnerId}
          conversation={conversation}
          isSelected={selectedPartnerId === conversation.partnerId}
          currentUserId={currentUser.id}
          canPin={canPinConversations}
          isOnline={socket.isUserOnline(conversation.partnerId)}
          isTyping={socket.isUserTyping(conversation.partnerId, conversation.conversationId || '')}
          onSelect={() => onSelectConversation(conversation.partnerId)}
          onPin={
            onPinConversation && conversation.conversationId
              ? () => onPinConversation(conversation.conversationId!)
              : undefined
          }
          onUnpin={
            onUnpinConversation && conversation.conversationId
              ? () => onUnpinConversation(conversation.conversationId!)
              : undefined
          }
          isProcessing={
            conversation.conversationId ? processingPinIds.has(conversation.conversationId) : false
          }
        />
      ))}
    </div>
  );
}

interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  currentUserId: string;
  canPin: boolean;
  isOnline: boolean;
  isTyping: boolean;
  onSelect: () => void;
  onPin?: () => void;
  onUnpin?: () => void;
  isProcessing: boolean;
}

/**
 * Individual conversation item in the list.
 */
function ConversationItem({
  conversation,
  isSelected,
  currentUserId,
  canPin,
  isOnline,
  isTyping,
  onSelect,
  onPin,
  onUnpin,
  isProcessing,
}: ConversationItemProps) {
  const { partnerName, lastMessage, messageCount, partnerRole, isPinned, unreadCount } =
    conversation;

  // Handle case where there's no message yet
  const hasMessages = lastMessage !== null;
  const isOwnMessage = hasMessages && lastMessage.senderId === currentUserId;

  // Show typing indicator or message preview
  const messagePreview = isTyping
    ? 'typing...'
    : hasMessages
      ? isOwnMessage
        ? `You: ${truncateMessage(lastMessage.content)}`
        : truncateMessage(lastMessage.content)
      : 'Start a conversation';

  // Get role badge color
  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'COACH':
        return 'bg-green-500/20 text-green-400';
      case 'ADMIN':
        return 'bg-purple-500/20 text-purple-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const handlePinClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent conversation selection
    if (isPinned && onUnpin) {
      onUnpin();
    } else if (!isPinned && onPin) {
      onPin();
    }
  };

  return (
    <div
      className={`relative group transition-colors hover:bg-gray-700/50 ${isSelected ? 'bg-gray-700' : ''}`}
    >
      <button
        type='button'
        onClick={onSelect}
        className='w-full p-4 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-inset'
        aria-pressed={isSelected}
      >
        <div className='flex items-start gap-3'>
          {/* Avatar placeholder with pin indicator and online status */}
          <div className='relative shrink-0'>
            <div className='w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center'>
              <span className='text-orange-400 font-semibold text-sm'>
                {partnerName.charAt(0).toUpperCase()}
              </span>
            </div>

            {/* Online status indicator */}
            {isOnline && (
              <div className='absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-gray-800 rounded-full'></div>
            )}

            {/* Pin indicator */}
            {isPinned && (
              <div className='absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center'>
                <svg
                  className='h-2.5 w-2.5 text-white'
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
            )}
          </div>

          <div className='flex-1 min-w-0'>
            <div className='flex items-center justify-between mb-1'>
              <div className='flex items-center gap-2'>
                <h3 className='font-medium text-white truncate'>{partnerName}</h3>
                {partnerRole && !hasMessages && (
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${getRoleBadgeColor(partnerRole)}`}
                  >
                    {partnerRole}
                  </span>
                )}
              </div>
              <div className='flex items-center gap-2 shrink-0 ml-2'>
                {hasMessages && (
                  <span className='text-xs text-gray-500'>
                    {formatMessageDate(lastMessage.sentAt)}
                  </span>
                )}
                {unreadCount && unreadCount > 0 && (
                  <span className='inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-orange-500 text-white'>
                    {unreadCount}
                  </span>
                )}
              </div>
            </div>
            <p
              className={`text-sm truncate ${
                isTyping
                  ? 'text-orange-400 italic'
                  : hasMessages
                    ? 'text-gray-400'
                    : 'text-gray-500 italic'
              }`}
            >
              {messagePreview}
            </p>
            {messageCount > 1 && (
              <p className='text-xs text-gray-500 mt-1'>{messageCount} messages</p>
            )}
          </div>
        </div>
      </button>

      {/* Pin/Unpin button (only for coaches/admins) */}
      {canPin && (onPin || onUnpin) && (
        <button
          type='button'
          onClick={handlePinClick}
          disabled={isProcessing}
          className='absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50'
          aria-label={isPinned ? 'Unpin conversation' : 'Pin conversation'}
          title={isPinned ? 'Unpin conversation' : 'Pin conversation'}
        >
          {isProcessing ? (
            <svg
              className='h-4 w-4 animate-spin text-gray-400'
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
          ) : isPinned ? (
            <svg
              className='h-4 w-4 text-orange-400 hover:text-orange-300'
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
          ) : (
            <svg
              className='h-4 w-4 text-gray-400 hover:text-orange-400'
              fill='none'
              viewBox='0 0 20 20'
              stroke='currentColor'
              aria-hidden='true'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z'
              />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}

export default ConversationList;
