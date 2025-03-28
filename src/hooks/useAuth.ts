import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase/client';
import { Session } from '@supabase/supabase-js';
import { router } from 'expo-router';

interface AuthState {
  session: Session | null;
  loading: boolean;
  error: string | null;
}

interface AuthActions {
  signUp: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signOut: () => Promise<{ error: any }>;
}

export const useAuth = (): AuthState & AuthActions => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    console.log('useAuth: Starting initialization');
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('useAuth: Testing Supabase connection...');
        // Test the connection first
        const { error: testError } = await supabase.auth.getSession();
        if (testError) {
          console.error('useAuth: Connection test failed:', testError);
          throw new Error('Failed to connect to Supabase. Please check your internet connection and try again.');
        }
        console.log('useAuth: Connection test successful');

        // Get initial session
        console.log('useAuth: Getting initial session...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('useAuth: Session error:', sessionError);
          throw sessionError;
        }
        
        console.log('useAuth: Initial session:', session ? 'exists' : 'none');
        
        if (mounted) {
          setSession(session);
        }

        // Listen for auth changes
        console.log('useAuth: Setting up auth state change listener');
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          console.log('useAuth: Auth state changed:', _event);
          if (mounted) {
            setSession(session);
            // Only navigate if the component is already initialized
            if (isInitialized) {
              if (_event === 'SIGNED_IN') {
                router.replace('/(main)');
              } else if (_event === 'SIGNED_OUT') {
                router.replace('/(auth)/login');
              }
            }
          }
        });

        return () => {
          console.log('useAuth: Cleaning up...');
          mounted = false;
          subscription.unsubscribe();
        };
      } catch (err) {
        console.error('useAuth: Initialization error:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize authentication');
        }
      } finally {
        if (mounted) {
          console.log('useAuth: Setting loading to false');
          setLoading(false);
          setIsInitialized(true);
        }
      }
    };

    initializeAuth();
  }, [isInitialized]);

  const signUp = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      // After successful signup, sign in automatically
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;
      return { data, error: null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      setError(null);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setError(errorMessage);
      return { error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  return {
    session,
    loading,
    error,
    signUp,
    signIn,
    signOut,
  };
}; 