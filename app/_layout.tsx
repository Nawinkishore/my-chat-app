import { useEffect } from 'react';
import { Slot, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { useAuth } from '../src/hooks/useAuth';
import { LoadingScreen } from '../src/components/common/LoadingScreen';

export default function RootLayout() {
  const { session, loading, error } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      // Redirect to home if authenticated and trying to access auth screens
      router.replace('/(main)');
    }
  }, [session, loading, segments]);

  // Show loading screen while initializing
  if (loading) {
    return <LoadingScreen message={error || 'Loading...'} />;
  }

  return (
    <PaperProvider>
      <Slot />
    </PaperProvider>
  );
} 