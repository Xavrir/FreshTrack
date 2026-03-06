import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
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
}

interface HouseholdContextValue {
  household: Household | null;
  members: HouseholdMember[];
  settings: HouseholdSettings | null;
  inviteCode: string | null;
  isOwner: boolean;
  loading: boolean;
  createHousehold: () => Promise<{ error: string | null }>;
  joinHousehold: (code: string) => Promise<{ error: string | null }>;
  updateSettings: (settings: Partial<HouseholdSettings>) => Promise<{ error: string | null }>;
  removeMember: (userId: string) => Promise<{ error: string | null }>;
  refreshHousehold: () => Promise<void>;
}

const HouseholdContext = createContext<HouseholdContextValue | undefined>(undefined);

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [settings, setSettings] = useState<HouseholdSettings | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isOwner = household?.ownerUserId === user?.id;

  const fetchHousehold = useCallback(async () => {
    if (!user) {
      setHousehold(null);
      setMembers([]);
      setSettings(null);
      setInviteCode(null);
      setLoading(false);
      return;
    }

    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data: membership } = await supabase
      .from('household_members')
      .select('household_id, role')
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      setHousehold(null);
      setLoading(false);
      return;
    }

    const householdId = membership.household_id;

    const [householdRes, membersRes, settingsRes, inviteRes] = await Promise.all([
      supabase
        .from('households')
        .select('id, owner_user_id')
        .eq('id', householdId)
        .single(),
      supabase
        .from('household_members')
        .select('user_id, role')
        .eq('household_id', householdId),
      supabase
        .from('household_settings')
        .select('reminder_time_local, lead_days')
        .eq('household_id', householdId)
        .single(),
      supabase
        .from('household_invites')
        .select('code')
        .eq('household_id', householdId)
        .is('revoked_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
    ]);

    if (householdRes.data) {
      setHousehold({
        id: householdRes.data.id,
        ownerUserId: householdRes.data.owner_user_id,
      });
    }

    if (membersRes.data) {
      setMembers(
        membersRes.data.map((m) => ({
          userId: m.user_id,
          role: m.role as 'owner' | 'member',
        }))
      );
    }

    if (settingsRes.data) {
      setSettings({
        reminderTimeLocal: settingsRes.data.reminder_time_local,
        leadDays: settingsRes.data.lead_days,
      });
    }

    setInviteCode(inviteRes.data?.code ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchHousehold();
  }, [fetchHousehold]);

  const createHousehold = useCallback(async () => {
    if (!user) return { error: 'Not authenticated' };

    if (!isSupabaseConfigured) {
      const mockId = 'mock-household-' + Date.now();
      setHousehold({ id: mockId, ownerUserId: user.id });
      setMembers([{ userId: user.id, role: 'owner' }]);
      setSettings({ reminderTimeLocal: '09:00', leadDays: [7, 3, 0] });
      setInviteCode(generateInviteCode());
      return { error: null };
    }

    const { data: newHousehold, error: hErr } = await supabase
      .from('households')
      .insert({ owner_user_id: user.id })
      .select('id')
      .single();

    if (hErr) return { error: hErr.message };

    const householdId = newHousehold.id;
    const code = generateInviteCode();

    const results = await Promise.all([
      supabase.from('household_members').insert({
        household_id: householdId,
        user_id: user.id,
        role: 'owner',
      }),
      supabase.from('household_settings').insert({
        household_id: householdId,
        reminder_time_local: '09:00',
        lead_days: [7, 3, 0],
      }),
      supabase.from('household_invites').insert({
        household_id: householdId,
        code,
      }),
    ]);

    const firstError = results.find((r) => r.error);
    if (firstError?.error) return { error: firstError.error.message };

    await fetchHousehold();
    return { error: null };
  }, [user, fetchHousehold]);

  const joinHousehold = useCallback(async (code: string) => {
    if (!user) return { error: 'Not authenticated' };

    if (!isSupabaseConfigured) {
      const mockId = 'mock-household-joined-' + Date.now();
      setHousehold({ id: mockId, ownerUserId: 'other-user' });
      setMembers([
        { userId: 'other-user', role: 'owner' },
        { userId: user.id, role: 'member' },
      ]);
      setSettings({ reminderTimeLocal: '09:00', leadDays: [7, 3, 0] });
      setInviteCode(code.toUpperCase());
      return { error: null };
    }

    const { data: invite, error: iErr } = await supabase
      .from('household_invites')
      .select('household_id')
      .eq('code', code.toUpperCase())
      .is('revoked_at', null)
      .single();

    if (iErr || !invite) return { error: 'Invalid invite code' };

    const { error: mErr } = await supabase.from('household_members').insert({
      household_id: invite.household_id,
      user_id: user.id,
      role: 'member',
    });

    if (mErr) {
      if (mErr.code === '23505') return { error: 'You already belong to a household' };
      return { error: mErr.message };
    }

    await fetchHousehold();
    return { error: null };
  }, [user, fetchHousehold]);

  const updateSettings = useCallback(async (partial: Partial<HouseholdSettings>) => {
    if (!household) return { error: 'No household' };

    const update: Record<string, unknown> = {};
    if (partial.reminderTimeLocal !== undefined) update.reminder_time_local = partial.reminderTimeLocal;
    if (partial.leadDays !== undefined) update.lead_days = partial.leadDays;

    const { error } = await supabase
      .from('household_settings')
      .update(update)
      .eq('household_id', household.id);

    if (error) return { error: error.message };

    await fetchHousehold();
    return { error: null };
  }, [household, fetchHousehold]);

  const removeMember = useCallback(async (userId: string) => {
    if (!household) return { error: 'No household' };

    const { error } = await supabase
      .from('household_members')
      .delete()
      .eq('household_id', household.id)
      .eq('user_id', userId);

    if (error) return { error: error.message };

    await fetchHousehold();
    return { error: null };
  }, [household, fetchHousehold]);

  return (
    <HouseholdContext.Provider
      value={{
        household,
        members,
        settings,
        inviteCode,
        isOwner,
        loading,
        createHousehold,
        joinHousehold,
        updateSettings,
        removeMember,
        refreshHousehold: fetchHousehold,
      }}
    >
      {children}
    </HouseholdContext.Provider>
  );
}

export function useHousehold() {
  const context = useContext(HouseholdContext);
  if (context === undefined) {
    throw new Error('useHousehold must be used within a HouseholdProvider');
  }
  return context;
}
