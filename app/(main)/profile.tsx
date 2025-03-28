import { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Avatar, useTheme, TextInput, Portal, Dialog } from 'react-native-paper';
import { useAuth } from '../../src/hooks/useAuth';
import { LoadingScreen } from '../../src/components/common/LoadingScreen';
import { supabase } from '../../src/services/supabase/client';

export default function ProfileScreen() {
  const { session, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const theme = useTheme();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session?.user?.id)
        .single();

      if (error) throw error;

      setFullName(data.full_name || '');
      setAvatarUrl(data.avatar_url || '');
    } catch (err) {
      console.error('Error loading profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const { error } = await supabase
        .from('users')
        .update({
          full_name: fullName,
          avatar_url: avatarUrl,
        })
        .eq('id', session?.user?.id);

      if (error) throw error;

      setShowEditDialog(false);
      loadProfile();
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setLoading(true);
      setError(null);
      await signOut();
    } catch (err) {
      console.error('Error signing out:', err);
      setError(err instanceof Error ? err.message : 'Failed to sign out');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading profile..." />;
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
        <View style={styles.content}>
          <View style={styles.avatarContainer}>
            <Avatar.Text
              size={80}
              label={fullName ? fullName.charAt(0).toUpperCase() : session?.user?.email?.charAt(0).toUpperCase() || '?'}
            />
          </View>

          <Text variant="headlineSmall" style={styles.name}>
            {fullName || 'No name set'}
          </Text>

          <Text variant="bodyLarge" style={styles.email}>
            {session?.user?.email}
          </Text>

          <Button
            mode="contained"
            onPress={() => setShowEditDialog(true)}
            style={styles.button}
          >
            Edit Profile
          </Button>

          <Button
            mode="outlined"
            onPress={handleSignOut}
            style={styles.button}
            disabled={loading}
          >
            Sign Out
          </Button>
        </View>
      )}

      <Portal>
        <Dialog visible={showEditDialog} onDismiss={() => setShowEditDialog(false)}>
          <Dialog.Title>Edit Profile</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Full Name"
              value={fullName}
              onChangeText={setFullName}
              style={styles.input}
              disabled={loading}
            />
            <TextInput
              label="Avatar URL"
              value={avatarUrl}
              onChangeText={setAvatarUrl}
              style={styles.input}
              disabled={loading}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowEditDialog(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onPress={handleUpdateProfile} loading={loading} disabled={loading}>
              Save
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
  content: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
  },
  avatarContainer: {
    marginTop: 40,
    marginBottom: 20,
  },
  name: {
    marginBottom: 8,
  },
  email: {
    marginBottom: 32,
    opacity: 0.7,
  },
  button: {
    width: '100%',
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
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
}); 