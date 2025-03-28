import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, List, Avatar, useTheme, FAB } from 'react-native-paper';
import { router } from 'expo-router';
import { chatService } from '../../src/services/chat';
import { LoadingScreen } from '../../src/components/common/LoadingScreen';
import type { Conversation } from '../../src/services/chat';

export default function DashboardScreen() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await chatService.getConversations();
      setConversations(data);
    } catch (err) {
      console.error('Error loading conversations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const handleConversationPress = (conversation: Conversation) => {
    router.push(`/chat/${conversation.id}`);
  };

  const renderConversation = ({ item }: { item: Conversation }) => {
    const otherParticipant = item.participants.find(p => p.id !== item.current_user_id);
    const lastMessage = item.last_message;

    return (
      <List.Item
        title={otherParticipant?.full_name || 'Unknown User'}
        description={lastMessage?.content || 'No messages yet'}
        left={props => (
          <Avatar.Text
            {...props}
            label={otherParticipant?.full_name?.charAt(0) || '?'}
          />
        )}
        onPress={() => handleConversationPress(item)}
      />
    );
  };

  if (loading) {
    return <LoadingScreen message="Loading conversations..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={[styles.error, { color: theme.colors.error }]}>
            {error}
          </Text>
          <Text>Please try again later</Text>
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text>No conversations yet</Text>
          <Text>Add friends to start chatting!</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={renderConversation}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
        />
      )}
      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => router.push('/friends')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  error: {
    marginBottom: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
}); 