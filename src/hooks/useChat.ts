import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase/client';
import { Conversation, Message } from '../types/chat';
import { useAuth } from './useAuth';

export const useChat = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const { session } = useAuth();

  useEffect(() => {
    if (!session?.user) return;

    fetchConversations();

    // Subscribe to new messages
    const subscription = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMessage = payload.new as Message;
          updateConversationWithNewMessage(newMessage);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [session?.user]);

  const fetchConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          participants:conversation_participants(
            user:users(
              id,
              email,
              full_name,
              avatar_url,
              status,
              last_seen
            )
          ),
          last_message:messages(
            id,
            content,
            created_at,
            sender:users(
              id,
              email,
              full_name,
              avatar_url
            )
          )
        `)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      // Transform the data to match our Conversation type
      const transformedConversations = data.map((conv: any) => ({
        ...conv,
        participants: conv.participants.map((p: any) => p.user),
        last_message: conv.last_message?.[0],
      }));

      setConversations(transformedConversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateConversationWithNewMessage = (message: Message) => {
    setConversations((prevConversations) => {
      const conversationIndex = prevConversations.findIndex(
        (conv) => conv.id === message.conversation_id
      );

      if (conversationIndex === -1) return prevConversations;

      const updatedConversations = [...prevConversations];
      const conversation = updatedConversations[conversationIndex];

      conversation.last_message = message;
      conversation.last_message_at = message.created_at;
      conversation.unread_count = (conversation.unread_count || 0) + 1;

      // Move the conversation to the top
      updatedConversations.splice(conversationIndex, 1);
      updatedConversations.unshift(conversation);

      return updatedConversations;
    });
  };

  const markConversationAsRead = async (conversationId: string) => {
    try {
      const { error } = await supabase
        .from('message_reads')
        .upsert({
          conversation_id: conversationId,
          user_id: session?.user?.id,
          read_at: new Date().toISOString(),
        });

      if (error) throw error;

      setConversations((prevConversations) =>
        prevConversations.map((conv) =>
          conv.id === conversationId
            ? { ...conv, unread_count: 0 }
            : conv
        )
      );
    } catch (error) {
      console.error('Error marking conversation as read:', error);
    }
  };

  return {
    conversations,
    loading,
    markConversationAsRead,
    refreshConversations: fetchConversations,
  };
}; 