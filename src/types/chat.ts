export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  status: 'online' | 'offline';
  last_seen?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  sender?: User;
}

export interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  conversation_type: 'direct' | 'group';
  name?: string;
  avatar_url?: string;
  participants: User[];
  last_message?: Message;
  unread_count?: number;
} 