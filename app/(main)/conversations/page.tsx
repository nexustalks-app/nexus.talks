import { EmptyConversation } from '@/components/conversation/empty-conversation';

/**
 * Placeholder shown in the center pane when no conversation is selected.
 * ConversationList is rendered by ConversationsShell (conversations/layout.tsx),
 * not here, so it stays persistently mounted beside this page.
 */
export default function ConversationsPage() {
  return (
    <EmptyConversation
      title="Select a conversation"
      description="Choose someone from the list to start chatting."
    />
  );
}
