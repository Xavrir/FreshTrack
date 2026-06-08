import React, { useState, useEffect } from 'react';
import { Alert, View } from 'react-native';
import { Container, Text, Button, Card, TextInput, Chip } from '../components';
import { useTheme } from '../theme/ThemeProvider';
import { supabase } from '../lib/supabase';
import { parseLeadDays, parseReminderTime, refreshReminderNotifications } from '../services/reminders';

type HouseholdMember = {
  user_id: string;
  role: 'owner' | 'member';
  username?: string;
  display_name?: string;
};

export function HouseholdSettingsScreen() {
  const { themeMode, setTheme } = useTheme();
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [reminderTime, setReminderTime] = useState('09:00');
  const [leadDays, setLeadDays] = useState('7, 3, 1');
  const [savingSettings, setSavingSettings] = useState(false);

  function generateInviteCode() {
    return Math.random()
      .toString(36)
      .substring(2, 10)
      .toUpperCase();
  }

  async function createInvite() {
    const { data: {user}, } = await supabase.auth.getUser();
    if (!user) return;

    const { data: member } = await supabase
      .from('household_members')
      .select('household_id, role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!member || member.role !== 'owner') {
      Alert.alert('Owner only', 'Only household owners can create invite codes.');
      return;
    }

    const code = generateInviteCode();

    const { error } = await supabase
      .from('household_invites')
      .insert({
        household_id: member.household_id,
        code,
      });

    if (error) {
      Alert.alert('Could not create invite', error.message);
      return;
    }

    setInviteCode(code);
    
  }

  async function loadMembers() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return;
    }

    const { data: currentMember } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!currentMember) return;
    setHouseholdId(currentMember.household_id);
    console.log('CURRENT MEMBERS: ', currentMember);

    const { data, error } = await supabase
      .from('household_members')
      .select(`
        role,
        user_id
      `)
      .eq('household_id', currentMember.household_id);

    console.log('CURRENT HOUSEHOLD:', currentMember.household_id);
    console.log('MEMBERS FOUND:', data);
    console.log('MEMBER COUNT:', data?.length);

    if (error) {
      console.log(error);
      return;
    }

    const userIds = (data ?? []).map((member) => member.user_id);

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, display_name')
      .in('id', userIds)

    const mergedMembers = (data ?? []).map((member) => {
      const profile = profiles?.find(
        (p) => p.id === member.user_id
      );

      return {
        ...member,
        username: profile?.username,
        display_name: profile?.display_name
      };
    });

    console.log('MEMBERS QUERY: ', data);
    console.log('MEMBERS ERROR: ', error);

    setMembers(mergedMembers);
    setIsOwner((data ?? []).some((member) => member.user_id === user.id && member.role === 'owner'));

    const { data: settings } = await supabase
      .from('household_settings')
      .select('reminder_time_local, lead_days')
      .eq('household_id', currentMember.household_id)
      .maybeSingle();

    if (settings) {
      setReminderTime(settings.reminder_time_local ?? '09:00');
      setLeadDays((settings.lead_days ?? [7, 3, 1]).join(', '));
    }
    
  }

  async function saveReminderSettings() {
    if (!householdId) {
      Alert.alert('No household', 'Create or join a household before saving reminders.');
      return;
    }

    if (!isOwner) {
      Alert.alert('Owner only', 'Only household owners can update reminder rules.');
      return;
    }

    if (!parseReminderTime(reminderTime)) {
      Alert.alert('Invalid time', 'Use 24-hour HH:MM format, for example 09:00.');
      return;
    }

    const parsedLeadDays = parseLeadDays(leadDays);
    if (parsedLeadDays.length === 0) {
      Alert.alert('Invalid lead days', 'Enter days like 7, 3, 1.');
      return;
    }

    setSavingSettings(true);
    try {
      const { error } = await supabase
        .from('household_settings')
        .upsert({
          household_id: householdId,
          reminder_time_local: reminderTime.trim(),
          lead_days: parsedLeadDays,
          updated_at: new Date().toISOString(),
        })
        .select()
        .maybeSingle();

      if (error) {
        Alert.alert('Could not save reminders', error.message);
        return;
      }

      const scheduled = await refreshReminderNotifications();
      Alert.alert('Reminder rules saved', `${scheduled} expiry reminders scheduled on this device.`);
    } finally {
      setSavingSettings(false);
    }
  }

  useEffect(() => {
      loadMembers();
    }, []);

    console.log('STATE MEMBERS:', members);
  
  return (
    <Container scroll>
      <View style={{ padding: 16 }}>
        <Text variant="h2" weight="black" style={{ marginBottom: 24 }}>Household</Text>
        
        <Card elevated style={{ marginBottom: 24 }}>
          <Text variant="h3" weight="bold" style={{ marginBottom: 16 }}>Members</Text>
          {members.map((member) => (
            <View key={member.user_id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text variant="body">
                {member.display_name ??
                member.username ??
                member.user_id}
              </Text>

              <Chip label={member.role} variant={member.role === 'owner' ? 'success' : 'default'} />
            </View>
          ))}
          
          <Button variant="secondary" block style={{ marginTop: 16 }} onPress={createInvite}>
            Invite Member
          </Button>

          {inviteCode && (
            <Card style={{ marginTop: 16 }}>
              <Text weight="bold">
                Invite Code
              </Text>

              <Text variant="h2" align="center" style={{ marginTop: 12 }}>
                {inviteCode}
              </Text>
            </Card>
          )}
        </Card>

        <Card elevated style={{ marginBottom: 24 }}>
          <Text variant="h3" weight="bold" style={{ marginBottom: 16 }}>Reminder Settings</Text>
          <TextInput label="Reminder Time" placeholder="09:00" value={reminderTime} onChangeText={setReminderTime} />
          <TextInput label="Lead Days" placeholder="7, 3, 1" helperText="Comma separated days before expiry." value={leadDays} onChangeText={setLeadDays} />
          <Button variant="primary" block loading={savingSettings} onPress={saveReminderSettings}>Save Settings</Button>
          <Text variant="caption" color="textMuted" style={{ marginTop: 12 }}>
            FreshTrack schedules local reminders for H-7, H-3, and H-1 on this device.
          </Text>
        </Card>

        <Card elevated style={{ marginBottom: 24 }}>
          <Text variant="h3" weight="bold" style={{ marginBottom: 16 }}>
            Appearance
          </Text>

          <Button 
            variant="secondary" 
            block 
            onPress={() => {
              if (themeMode === 'light') {
                setTheme('dark');
              }else {
                setTheme('light');
              }
            }}
          >
            {themeMode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          </Button>
        </Card>
        
        <Button variant="ghost" block onPress={async () => {await supabase.auth.signOut();}}>
          <Text color="danger" weight="bold">Sign Out</Text>
        </Button>
      </View>
    </Container>
  );
}
