import { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, List, Avatar, useTheme, Button } from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import { friendsService } from '../../../src/services/friends';
import { chatService } from '../../../src/services/chat';
import { LoadingScreen } from '../../../src/components/common/LoadingScreen';
import type { Friend } from '../../../src/services/friends';

export default function NewChatScreen() {
  const { friendId } = useLocalSearchParams();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();

  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await friendsService.getFriends();
      setFriends(data);
    } catch (err) {
      console.error('Error loading friends:', err);
      setError(err instanceof Error ? err.message : 'Failed to load friends');
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = async (friendId: string) => {
    try {
      setLoading(true);
      setError(null);
      const conversation = await chatService.createConversation(friendId);
      router.replace(`/chat/${conversation.id}`);
    } catch (err) {
      console.error('Error starting chat:', err);
      setError(err instanceof Error ? err.message : 'Failed to start chat');
    } finally {
      setLoading(false);
    }
  };

  const renderFriend = ({ item }: { item: Friend }) => (
    <List.Item
      title={item.friend_email}
      left={props => (
        <Avatar.Text
          {...props}
          label={item.friend_email.charAt(0).toUpperCase()}
        />
      )}
      right={props => (
        <Button
          {...props}
          mode="contained"
          onPress={() => handleStartChat(item.friend_id)}
          loading={loading}
          disabled={loading}
        >
          Start Chat
        </Button>
      )}
    />
  );

  if (loading) {
    return <LoadingScreen message="Loading friends..." />;
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
      ) : friends.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text>No friends available</Text>
          <Text>Add friends to start chatting!</Text>
        </View>
      ) : (
        <FlatList
          data={friends}
          renderItem={renderFriend}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
        />
      )}
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
}); 