import { Redirect } from 'expo-router';
import { useAuth } from '../src/hooks/useAuth';

export default function Index() {
  const { session } = useAuth();
  
  // Redirect to the appropriate route based on auth state
  return <Redirect href={session ? '/(main)' : '/(auth)/login'} />;
} 