import React, { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
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

  const resetState = useCallback(() => {
    setHousehold(null);
    setMembers([]);
    setSettings(null);
    setInviteCode(null);
    setInviteCodeKind(null);
  }, []);

  const fetchHousehold = useCallback(async () => {
    if (!user || !session) {
      resetState();
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data: membership } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!membership?.household_id) {
        resetState();
        return;
      }

      const householdId = membership.household_id as string;

      const [{ data: householdRow }, { data: memberRows }, { data: settingsRow }, { data: inviteRow }] =
        await Promise.all([
          supabase.from('households').select('id, owner_user_id').eq('id', householdId).maybeSingle(),
          supabase.from('household_members').select('user_id, role').eq('household_id', householdId),
          supabase
            .from('household_settings')
            .select('reminder_time_local, lead_days')
            .eq('household_id', householdId)
            .maybeSingle(),
          supabase
            .from('household_invites')
            .select('code')
            .eq('household_id', householdId)
            .is('revoked_at', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

      if (householdRow) {
        setHousehold({ id: householdRow.id, ownerUserId: householdRow.owner_user_id });
      }
      setMembers(
        (memberRows ?? []).map((m: { user_id: string; role: string }) => ({
          userId: m.user_id,
          role: m.role === 'owner' ? 'owner' : 'member',
        })),
      );
      setSettings(
        settingsRow
          ? { reminderTimeLocal: settingsRow.reminder_time_local, leadDays: settingsRow.lead_days ?? [7, 3, 1] }
          : { reminderTimeLocal: '09:00', leadDays: [7, 3, 1] },
      );
      setInviteCode(inviteRow?.code ?? null);
      setInviteCodeKind(inviteRow?.code ? 'full' : null);
    } catch {
      resetState();
    } finally {
      setLoading(false);
    }
  }, [resetState, session, user]);

  useEffect(() => {
    fetchHousehold();
  }, [fetchHousehold]);

  const createHousehold = useCallback(async () => {
    if (!user) return { error: 'Not authenticated' };
    try {
      const { error: insertError } = await supabase
        .from('households')
        .insert({ owner_user_id: user.id });
      if (insertError) return { error: insertError.message };

      const { data: createdHousehold, error: fetchError } = await supabase
        .from('households')
        .select('id')
        .eq('owner_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (fetchError || !createdHousehold) {
        return { error: fetchError?.message ?? 'Could not create household' };
      }

      const householdId = createdHousehold.id as string;

      const { error: memberError } = await supabase
        .from('household_members')
        .insert({ household_id: householdId, user_id: user.id, role: 'owner' });
      if (memberError) return { error: memberError.message };

      await supabase.from('household_settings').upsert({
        household_id: householdId,
        reminder_time_local: '09:00',
        lead_days: [7, 3, 1],
        updated_at: new Date().toISOString(),
      });

      const code = generateInviteCode();
      await supabase.from('household_invites').insert({ household_id: householdId, code });

      await fetchHousehold();
      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Could not create household' };
    }
  }, [fetchHousehold, user]);

  const joinHousehold = useCallback(async (code: string) => {
    if (!user) return { error: 'Not authenticated' };
    try {
      const { data: invite } = await supabase
        .from('household_invites')
        .select('household_id')
        .eq('code', code.trim().toUpperCase())
        .is('revoked_at', null)
        .maybeSingle();
      if (!invite?.household_id) return { error: 'Invalid or expired invite code' };

      const { error: memberError } = await supabase
        .from('household_members')
        .insert({ household_id: invite.household_id, user_id: user.id, role: 'member' });
      if (memberError) return { error: memberError.message };

      await fetchHousehold();
      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Could not join household' };
    }
  }, [fetchHousehold, user]);

  const rotateInvite = useCallback(async () => {
    if (!household) return { error: 'No household' };
    try {
      await supabase
        .from('household_invites')
        .update({ revoked_at: new Date().toISOString() })
        .eq('household_id', household.id)
        .is('revoked_at', null);

      const code = generateInviteCode();
      const { error } = await supabase
        .from('household_invites')
        .insert({ household_id: household.id, code });
      if (error) return { error: error.message };

      setInviteCode(code);
      setInviteCodeKind('full');
      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Could not rotate invite' };
    }
  }, [household]);

  const updateSettings = useCallback(async (partial: Partial<HouseholdSettings>) => {
    if (!household) return { error: 'No household' };
    try {
      const next: HouseholdSettings = {
        reminderTimeLocal: partial.reminderTimeLocal ?? settings?.reminderTimeLocal ?? '09:00',
        leadDays: partial.leadDays ?? settings?.leadDays ?? [7, 3, 1],
      };
      const { error } = await supabase
        .from('household_settings')
        .upsert({
          household_id: household.id,
          reminder_time_local: next.reminderTimeLocal,
          lead_days: next.leadDays,
          updated_at: new Date().toISOString(),
        });
      if (error) return { error: error.message };
      setSettings(next);
      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Could not update settings' };
    }
  }, [household, settings]);

  const removeMember = useCallback(async (userId: string) => {
    if (!household) return { error: 'No household' };
    try {
      const { error } = await supabase
        .from('household_members')
        .delete()
        .eq('household_id', household.id)
        .eq('user_id', userId);
      if (error) return { error: error.message };
      await fetchHousehold();
      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Could not remove member' };
    }
  }, [fetchHousehold, household]);

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
