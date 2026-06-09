import React, { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import type { Session as SupabaseSession } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface Session {
  access_token: string;
  refresh_token: string;
  user: User;
}

interface User {
  id: string;
  email?: string;
  user_metadata: { full_name?: string | null };
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isMockMode: boolean;
  signInWithOtp: (email: string) => Promise<{ error: string | null }>;
  verifyOtp: (email: string, token: string) => Promise<{ error: string | null }>;
  updateDisplayName: (fullName: string) => Promise<{ error: string | null }>;
  signInMock: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function toSession(supabaseSession: SupabaseSession | null): Session | null {
  if (!supabaseSession) return null;
  const { access_token, refresh_token, user } = supabaseSession;
  return {
    access_token,
    refresh_token,
    user: {
      id: user.id,
      email: user.email ?? undefined,
      user_metadata: { full_name: (user.user_metadata?.full_name as string | undefined) ?? undefined },
    },
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(toSession(data.session));
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, supabaseSession) => {
      setSession(toSession(supabaseSession));
      setLoading(false);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const signInWithOtp = useCallback(async (email: string) => {
    const trimmed = email.trim().toLowerCase();
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { shouldCreateUser: true },
    });
    return { error: error ? error.message : null };
  }, []);

  const verifyOtp = useCallback(async (email: string, token: string) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: token.trim(),
      type: 'email',
    });
    if (error) return { error: error.message };
    setSession(toSession(data.session));
    return { error: null };
  }, []);

  const updateDisplayName = useCallback(async (fullName: string) => {
    const trimmed = fullName.trim();
    if (!trimmed) return { error: 'Please enter a valid name.' };
    if (!session) return { error: 'Not authenticated' };
    const { data, error } = await supabase.auth.updateUser({ data: { full_name: trimmed } });
    if (error) return { error: error.message };
    if (data.user) {
      setSession((current) =>
        current
          ? { ...current, user: { ...current.user, user_metadata: { full_name: trimmed } } }
          : current,
      );
    }
    return { error: null };
  }, [session]);

  // Retained for screen compatibility; Supabase backend has no mock mode.
  const signInMock = useCallback(() => {}, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        isMockMode: false,
        signInWithOtp,
        verifyOtp,
        updateDisplayName,
        signInMock,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
