export interface EchoAuthor {
  id: string;
  name: string;
  username: string;
  avatarUrl: string | null;
}

export interface EchoConversationInfo {
  id: string;
  name: string | null;
  type: 'direct' | 'group';
}

export interface EchoMessageData {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  createdAt: string;
  deletedAt: string | null;
  sender: EchoAuthor;
  conversation: EchoConversationInfo;
}

export interface NexusEchoItem {
  id: string;
  userId: string;
  messageId: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  message: EchoMessageData | null;
}

export interface SaveEchoInput {
  messageId: string;
  note?: string | null;
}

export interface UpdateEchoNoteInput {
  note: string | null;
}
