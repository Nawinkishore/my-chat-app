import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, FlatList } from 'react-native';
import { Text, List, Button, useTheme, TextInput, Portal, Dialog, IconButton, Avatar, FAB } from 'react-native-paper';
import { Link, router } from 'expo-router';
import { friendsService, Friend } from '../../src/services/friends';
import { chatService } from '../../src/services/chat';
import { LoadingScreen } from '../../src/components/common/LoadingScreen';

export default function FriendsScreen() {
  const theme = useTheme();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [newFriendEmail, setNewFriendEmail] = useState('');

  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    try {
      setLoading(true);
      setError(null);
      const [friendsData, requestsData] = await Promise.all([
        friendsService.getFriends(),
        friendsService.getPendingRequests(),
      ]);
      setFriends(friendsData);
      setPendingRequests(requestsData);
    } catch (err) {
      console.error('Error loading friends:', err);
      setError(err instanceof Error ? err.message : 'Failed to load friends');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async () => {
    try {
      setLoading(true);
      setError(null);
      await friendsService.sendFriendRequest(newFriendEmail);
      setNewFriendEmail('');
      setShowAddFriend(false);
      loadFriends();
    } catch (err) {
      console.error('Error adding friend:', err);
      setError(err instanceof Error ? err.message : 'Failed to add friend');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      setLoading(true);
      setError(null);
      await friendsService.acceptFriendRequest(requestId);
      loadFriends();
    } catch (err) {
      console.error('Error accepting request:', err);
      setError(err instanceof Error ? err.message : 'Failed to accept friend request');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      setLoading(true);
      setError(null);
      await friendsService.rejectFriendRequest(requestId);
      loadFriends();
    } catch (err) {
      console.error('Error rejecting request:', err);
      setError(err instanceof Error ? err.message : 'Failed to reject friend request');
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = (friendId: string) => {
    router.push(`/chat/new?friendId=${friendId}`);
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
        >
          Chat
        </Button>
      )}
    />
  );

  const renderRequest = ({ item }: { item: Friend }) => (
    <List.Item
      title={item.friend_email}
      left={props => (
        <Avatar.Text
          {...props}
          label={item.friend_email.charAt(0).toUpperCase()}
        />
      )}
      right={props => (
        <View style={styles.requestActions}>
          <Button
            {...props}
            mode="contained"
            onPress={() => handleAcceptRequest(item.id)}
            style={styles.acceptButton}
          >
            Accept
          </Button>
          <Button
            {...props}
            mode="outlined"
            onPress={() => handleRejectRequest(item.id)}
            style={styles.rejectButton}
          >
            Reject
          </Button>
        </View>
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
      ) : (
        <>
          <View style={styles.header}>
            <Button
              mode="contained"
              onPress={() => setShowRequests(true)}
              disabled={pendingRequests.length === 0}
            >
              Friend Requests ({pendingRequests.length})
            </Button>
          </View>

          {friends.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text>No friends yet</Text>
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

          <FAB
            icon="plus"
            style={[styles.fab, { backgroundColor: theme.colors.primary }]}
            onPress={() => setShowAddFriend(true)}
          />
        </>
      )}

      <Portal>
        <Dialog visible={showAddFriend} onDismiss={() => setShowAddFriend(false)}>
          <Dialog.Title>Add Friend</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Friend's Email"
              value={newFriendEmail}
              onChangeText={setNewFriendEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              disabled={loading}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowAddFriend(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onPress={handleAddFriend} loading={loading} disabled={loading}>
              Add
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={showRequests} onDismiss={() => setShowRequests(false)}>
          <Dialog.Title>Friend Requests</Dialog.Title>
          <Dialog.Content>
            <FlatList
              data={pendingRequests}
              renderItem={renderRequest}
              keyExtractor={item => item.id}
              scrollEnabled={false}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowRequests(false)} disabled={loading}>
              Close
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
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
  requestActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  acceptButton: {
    marginRight: 8,
  },
  rejectButton: {
    marginLeft: 8,
  },
}); 