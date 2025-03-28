import { supabase } from './supabase/client';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  created_at: string;
  current_user_id: string;
  participants: Array<{
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  }>;
  last_message: {
    id: string;
    content: string;
    created_at: string;
    sender_id: string;
  } | null;
}

export const chatService = {
  async getConversations(): Promise<Conversation[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get conversations with participants
    const { data: conversations, error: conversationsError } = await supabase
      .from('conversations')
      .select(`
        *,
        conversation_participants!inner (
          user:users (
            id,
            email,
            full_name,
            avatar_url
          )
        )
      `)
      .eq('conversation_participants.user_id', user.id);

    if (conversationsError) throw conversationsError;
    if (!conversations) return [];

    // Get last messages for each conversation
    const conversationsWithMessages = await Promise.all(
      conversations.map(async (conv) => {
        const { data: lastMessage, error: messageError } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (messageError && messageError.code !== 'PGRST116') throw messageError;

        return {
          id: conv.id,
          created_at: conv.created_at,
          current_user_id: user.id,
          participants: conv.conversation_participants.map((p: any) => p.user),
          last_message: lastMessage || null,
        };
      })
    );

    return conversationsWithMessages.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  async getConversation(id: string): Promise<Conversation> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get conversation with participants
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select(`
        *,
        conversation_participants!inner (
          user:users (
            id,
            email,
            full_name,
            avatar_url
          )
        )
      `)
      .eq('id', id)
      .eq('conversation_participants.user_id', user.id)
      .single();

    if (conversationError) throw conversationError;
    if (!conversation) throw new Error('Conversation not found');

    // Get last message
    const { data: lastMessage, error: messageError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (messageError && messageError.code !== 'PGRST116') throw messageError;

    return {
      id: conversation.id,
      created_at: conversation.created_at,
      current_user_id: user.id,
      participants: conversation.conversation_participants.map((p: any) => p.user),
      last_message: lastMessage || null,
    };
  },

  async getMessages(conversationId: string): Promise<Message[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async sendMessage(conversationId: string, content: string): Promise<Message> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Check if user is a participant in the conversation
    const { data: participant, error: participantError } = await supabase
      .from('conversation_participants')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (participantError || !participant) {
      throw new Error('Not a participant in this conversation');
    }

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content,
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Failed to send message');
    return data;
  },

  async createConversation(friendId: string): Promise<Conversation> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Check if users are friends
    const { data: friend, error: friendError } = await supabase
      .from('friends')
      .select('*')
      .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`)
      .eq('status', 'accepted')
      .single();

    if (friendError || !friend) {
      throw new Error('Not friends with this user');
    }

    // Create conversation
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .insert({})
      .select()
      .single();

    if (conversationError) throw conversationError;
    if (!conversation) throw new Error('Failed to create conversation');

    // Add participants
    const { error: participantsError } = await supabase
      .from('conversation_participants')
      .insert([
        { conversation_id: conversation.id, user_id: user.id },
        { conversation_id: conversation.id, user_id: friendId },
      ]);

    if (participantsError) throw participantsError;

    // Get the full conversation data
    const { data: fullConversation, error: fullError } = await supabase
      .from('conversations')
      .select(`
        *,
        conversation_participants!inner (
          user:users (
            id,
            email,
            full_name,
            avatar_url
          )
        )
      `)
      .eq('id', conversation.id)
      .eq('conversation_participants.user_id', user.id)
      .single();

    if (fullError) throw fullError;
    if (!fullConversation) throw new Error('Failed to get conversation data');

    return {
      id: fullConversation.id,
      created_at: fullConversation.created_at,
      current_user_id: user.id,
      participants: fullConversation.conversation_participants.map((p: any) => p.user),
      last_message: null,
    };
  },

  subscribeToMessages(conversationId: string, callback: (message: Message) => void) {
    return supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          callback(payload.new as Message);
        }
      )
      .subscribe();
  },
}; 