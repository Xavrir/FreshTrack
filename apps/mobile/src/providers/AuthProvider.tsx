import React, { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import {
  ApiSession,
  ApiUser,
  apiRequest,
  clearTokens,
  isApiConfigured,
  saveTokens,
  storedAccessToken,
  storedRefreshToken,
} from '../services/api';

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

const MOCK_USER: User = {
  id: 'mock-user-id',
  email: 'demo@freshtrack.local',
  user_metadata: { full_name: 'Demo User' },
};

const MOCK_SESSION: Session = {
  access_token: 'mock-token',
  refresh_token: 'mock-refresh',
  user: MOCK_USER,
};

function toSession(apiSession: ApiSession): Session {
  return {
    access_token: apiSession.accessToken,
    refresh_token: apiSession.refreshToken,
    user: toUser(apiSession.user),
  };
}

function toUser(user: ApiUser): User {
  return {
    id: user.id,
    email: user.email,
    user_metadata: { full_name: user.fullName ?? undefined },
  };
}

function fallbackPassword(email: string) {
  return `FreshTrack-${email.toLowerCase()}-Passwordless`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function restoreSession() {
      if (!isApiConfigured) {
        setLoading(false);
        return;
      }
      const [accessToken, refreshToken] = await Promise.all([storedAccessToken(), storedRefreshToken()]);
      if (!accessToken || !refreshToken) {
        setLoading(false);
        return;
      }
      try {
        const user = await apiRequest<ApiUser>('/v1/me', { method: 'GET' }, accessToken);
        setSession({ access_token: accessToken, refresh_token: refreshToken, user: toUser(user) });
      } catch {
        try {
          const apiSession = await apiRequest<ApiSession>('/v1/auth/refresh', {
            method: 'POST',
            body: JSON.stringify({ refreshToken }),
          });
          await saveTokens(apiSession);
          setSession(toSession(apiSession));
        } catch {
          await clearTokens();
        }
      } finally {
        setLoading(false);
      }
    }
    restoreSession();
  }, []);

  const signInWithOtp = useCallback(async (email: string) => {
    const trimmed = email.trim().toLowerCase();
    if (!isApiConfigured) return { error: 'API not configured. Use demo mode.' };
    try {
      await apiRequest('/v1/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email: trimmed, password: fallbackPassword(trimmed), fullName: '' }),
      });
      return { error: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not send access code';
      if (!message.toLowerCase().includes('already')) return { error: message };
      try {
        await apiRequest('/v1/auth/resend-verification', {
          method: 'POST',
          body: JSON.stringify({ email: trimmed }),
        });
        return { error: null };
      } catch (resendError) {
        return { error: resendError instanceof Error ? resendError.message : 'Could not send access code' };
      }
    }
  }, []);

  const verifyOtp = useCallback(async (email: string, token: string) => {
    if (!isApiConfigured) return { error: 'API not configured. Use demo mode.' };
    try {
      const apiSession = await apiRequest<ApiSession>('/v1/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: token.trim() }),
      });
      await saveTokens(apiSession);
      setSession(toSession(apiSession));
      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Verification failed' };
    }
  }, []);

  const updateDisplayName = useCallback(async (fullName: string) => {
    const trimmed = fullName.trim();
    if (!trimmed) return { error: 'Please enter a valid name.' };
    if (!session) return { error: 'Not authenticated' };
    try {
      const user = await apiRequest<ApiUser>('/v1/me', {
        method: 'PATCH',
        body: JSON.stringify({ fullName: trimmed }),
      }, session.access_token);
      setSession((current) => (current ? { ...current, user: toUser(user) } : current));
      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Could not update profile' };
    }
  }, [session]);

  const signInMock = useCallback(() => {
    setSession(MOCK_SESSION);
  }, []);

  const signOut = useCallback(async () => {
    if (session && isApiConfigured) {
      await apiRequest('/v1/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: session.refresh_token }),
      }, session.access_token).catch(() => null);
      await clearTokens();
    }
    setSession(null);
  }, [session]);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        isMockMode: !isApiConfigured,
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
