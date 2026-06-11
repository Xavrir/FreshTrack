import React, { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { apiRequest, isApiConfigured } from '../services/api';
import { useAuth } from './AuthProvider';

interface HouseholdMember {
  userId: string;
  role: 'owner' | 'member';
}

interface Household {
  id: string;
  ownerUserId: string;
}

interface HouseholdSettings {
  reminderTimeLocal: string;
  leadDays: number[];
  timezone: string;
}

interface HouseholdContextValue {
  household: Household | null;
  members: HouseholdMember[];
  settings: HouseholdSettings | null;
  inviteCode: string | null;
  inviteCodeKind: 'full' | 'suffix' | null;
  isOwner: boolean;
  loading: boolean;
  createHousehold: () => Promise<{ error: string | null }>;
  joinHousehold: (code: string) => Promise<{ error: string | null }>;
  rotateInvite: () => Promise<{ error: string | null }>;
  updateSettings: (settings: Partial<HouseholdSettings>) => Promise<{ error: string | null }>;
  removeMember: (userId: string) => Promise<{ error: string | null }>;
  refreshHousehold: () => Promise<void>;
}

const HouseholdContext = createContext<HouseholdContextValue | undefined>(undefined);

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { user, session } = useAuth();
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [settings, setSettings] = useState<HouseholdSettings | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteCodeKind, setInviteCodeKind] = useState<'full' | 'suffix' | null>(null);
  const [loading, setLoading] = useState(true);

  const isOwner = household?.ownerUserId === user?.id;
  const token = session?.access_token;

  const fetchHousehold = useCallback(async () => {
    if (!user) {
      setHousehold(null);
      setMembers([]);
      setSettings(null);
      setInviteCode(null);
      setInviteCodeKind(null);
      setLoading(false);
      return;
    }

    if (!isApiConfigured || !token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [householdData, memberData, settingsData] = await Promise.all([
        apiRequest<Household & { role?: string }>('/v1/household', { method: 'GET' }, token),
        apiRequest<HouseholdMember[]>('/v1/household/members', { method: 'GET' }, token),
        apiRequest<HouseholdSettings>('/v1/household/settings', { method: 'GET' }, token),
      ]);
      setHousehold({ id: householdData.id, ownerUserId: householdData.ownerUserId });
      setMembers(memberData);
      setSettings(settingsData);
      const invite = await apiRequest<{ code?: string | null; codeSuffix?: string }>('/v1/household/invite', { method: 'GET' }, token).catch(() => null);
      // Prefer the full shareable code; fall back to suffix only for legacy
      // invites created before the full code was persisted.
      const fullCode = invite?.code ?? null;
      setInviteCode(fullCode ?? invite?.codeSuffix ?? null);
      setInviteCodeKind(fullCode ? 'full' : invite?.codeSuffix ? 'suffix' : null);
    } catch {
      setHousehold(null);
      setMembers([]);
      setSettings(null);
      setInviteCode(null);
      setInviteCodeKind(null);
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  useEffect(() => {
    fetchHousehold();
  }, [fetchHousehold]);

  const createHousehold = useCallback(async () => {
    if (!user) return { error: 'Not authenticated' };

    if (!isApiConfigured || !token) {
      const mockId = 'mock-household-' + Date.now();
      setHousehold({ id: mockId, ownerUserId: user.id });
      setMembers([{ userId: user.id, role: 'owner' }]);
      setSettings({ reminderTimeLocal: '09:00', leadDays: [7, 3, 0], timezone: 'UTC' });
      setInviteCode(generateInviteCode());
      setInviteCodeKind('full');
      return { error: null };
    }

    try {
      const created = await apiRequest<{ inviteCode?: string }>('/v1/household', { method: 'POST', body: JSON.stringify({ name: 'My Household' }) }, token);
      await fetchHousehold();
      if (created.inviteCode) {
        setInviteCode(created.inviteCode);
        setInviteCodeKind('full');
      }
      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Could not create household' };
    }
  }, [fetchHousehold, token, user]);

  const joinHousehold = useCallback(async (code: string) => {
    if (!user) return { error: 'Not authenticated' };

    if (!isApiConfigured || !token) {
      const mockId = 'mock-household-joined-' + Date.now();
      setHousehold({ id: mockId, ownerUserId: 'other-user' });
      setMembers([{ userId: 'other-user', role: 'owner' }, { userId: user.id, role: 'member' }]);
      setSettings({ reminderTimeLocal: '09:00', leadDays: [7, 3, 0], timezone: 'UTC' });
      setInviteCode(code.toUpperCase());
      setInviteCodeKind('full');
      return { error: null };
    }

    try {
      await apiRequest('/v1/household/join', { method: 'POST', body: JSON.stringify({ code }) }, token);
      await fetchHousehold();
      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Could not join household' };
    }
  }, [fetchHousehold, token, user]);

  const rotateInvite = useCallback(async () => {
    if (!household) return { error: 'No household' };
    if (!isApiConfigured || !token) {
      setInviteCode(generateInviteCode());
      setInviteCodeKind('full');
      return { error: null };
    }
    try {
      const rotated = await apiRequest<{ inviteCode: string }>('/v1/household/invite/rotate', { method: 'POST' }, token);
      setInviteCode(rotated.inviteCode);
      setInviteCodeKind('full');
      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Could not rotate invite' };
    }
  }, [household, token]);

  const updateSettings = useCallback(async (partial: Partial<HouseholdSettings>) => {
    if (!household) return { error: 'No household' };
    if (!isApiConfigured || !token) {
      setSettings((current) => current ? { ...current, ...partial } : current);
      return { error: null };
    }
    try {
      const updated = await apiRequest<HouseholdSettings>('/v1/household/settings', {
        method: 'PATCH',
        body: JSON.stringify(partial),
      }, token);
      setSettings(updated);
      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Could not update settings' };
    }
  }, [household, token]);

  const removeMember = useCallback(async (userId: string) => {
    if (!household) return { error: 'No household' };
    if (!isApiConfigured || !token) {
      setMembers((current) => current.filter((member) => member.userId !== userId));
      return { error: null };
    }
    try {
      await apiRequest(`/v1/household/members/${userId}`, { method: 'DELETE' }, token);
      await fetchHousehold();
      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Could not remove member' };
    }
  }, [fetchHousehold, household, token]);

  return (
    <HouseholdContext.Provider
      value={{ household, members, settings, inviteCode, inviteCodeKind, isOwner, loading, createHousehold, joinHousehold, rotateInvite, updateSettings, removeMember, refreshHousehold: fetchHousehold }}
    >
      {children}
    </HouseholdContext.Provider>
  );
}

export function useHousehold() {
  const context = useContext(HouseholdContext);
  if (context === undefined) throw new Error('useHousehold must be used within a HouseholdProvider');
  return context;
}
