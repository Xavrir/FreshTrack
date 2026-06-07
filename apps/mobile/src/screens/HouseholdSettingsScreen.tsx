import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { Container, Text, Button, Card, TextInput, Chip } from '../components';
import { useNavigation } from '@react-navigation/native';
import { RootNavigationProp } from '../navigation/types';
import { useTheme } from '../theme/ThemeProvider';
import { supabase } from '../lib/supabase';

type HouseholdMember = {
  user_id: string;
  role: 'owner' | 'member';
  username?: string;
  display_name?: string;
};

export function HouseholdSettingsScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  const { themeMode, setTheme } = useTheme();
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

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
      console.log(error);
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
          <TextInput label="Reminder Time" placeholder="09:00" />
          <TextInput label="Lead Days" placeholder="7, 3, 0" helperText="Comma separated days before expiry." />
          <Button variant="primary" block>Save Settings</Button>
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
