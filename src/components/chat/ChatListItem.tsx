import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text, Avatar, useTheme } from 'react-native-paper';
import { router } from 'expo-router';
import { Conversation } from '../../types/chat';
import { formatDistanceToNow, isValid } from 'date-fns';

interface ChatListItemProps {
  conversation: Conversation;
  onPress?: (conversation: Conversation) => void;
}

export const ChatListItem: React.FC<ChatListItemProps> = ({
  conversation,
  onPress,
}) => {
  const theme = useTheme();
  const otherParticipant = conversation.participants[0];

  const handlePress = () => {
    if (onPress) {
      onPress(conversation);
    } else {
      router.push(`/chat/${conversation.id}`);
    }
  };

  const formatMessageTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (!isValid(date)) return '';
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      return '';
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: pressed
            ? theme.colors.surfaceVariant
            : theme.colors.surface,
        },
      ]}
    >
      <Avatar.Text
        size={50}
        label={otherParticipant.full_name[0].toUpperCase()}
        style={styles.avatar}
      />
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Text variant="titleMedium" style={styles.name}>
            {otherParticipant.full_name}
          </Text>
          {conversation.last_message_at && (
            <Text variant="bodySmall" style={styles.time}>
              {formatMessageTime(conversation.last_message_at)}
            </Text>
          )}
        </View>

        <View style={styles.messageContainer}>
          <Text
            variant="bodyMedium"
            style={styles.message}
            numberOfLines={1}
          >
            {conversation.last_message?.content || 'No messages yet'}
          </Text>
          {conversation.unread_count ? (
            <View
              style={[
                styles.badge,
                { backgroundColor: theme.colors.primary },
              ]}
            >
              <Text style={styles.badgeText}>{conversation.unread_count}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  avatar: {
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    flex: 1,
    marginRight: 8,
  },
  time: {
    opacity: 0.7,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  message: {
    flex: 1,
    opacity: 0.7,
    marginRight: 8,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
}); 