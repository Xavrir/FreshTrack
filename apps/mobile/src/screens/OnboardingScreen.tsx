import React, { useState } from 'react';
import { Container, Text, Button, Card, TextInput } from '../components';
import { useNavigation } from '@react-navigation/native';
import { RootNavigationProp } from '../navigation/types';
import { View } from 'react-native';
import { supabase } from '../lib/supabase';

export function OnboardingScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  const [inviteCode, setInviteCode] = useState('');

  const handleCreateHousehold = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    console.log('AUTH ID: ', user.id);
    
    const payload = {
      owner_user_id: user.id,
    };

    console.log('INSERT PAYLOAD: ', payload)

    const { error: householdError } = await supabase
      .from('households')
      .insert({
        owner_user_id: user.id,
      });
      // .select()
      // .maybeSingle()

    if (householdError) {
      console.log(householdError.message);
      return;
    }

    const { data: household, error: fetchError } = await supabase
      .from('households')
      .select('id')
      .eq('owner_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError || !household) {
      console.log('FETCH ERROR: ', fetchError);
      return;
    }

    const { error: memberError } = await supabase
      .from('household_members')
      .insert({
        household_id: household.id,
        user_id: user.id,
        role: 'owner',
      });

    if (memberError) {
      console.log(memberError.message);
      return;
    }

    // navigation.replace('Main');
  };

  async function handleJoinHousehold() {
    const { data: {user}, } = await supabase.auth.getUser();
    if (!user) return;

    console.log('ENTERED CODE:', inviteCode);
    console.log('NORMALIZED:', inviteCode.trim().toUpperCase());

    const { data: invite, error: inviteError } = await supabase
      .from('household_invites')
      .select('*')
      .eq('code', inviteCode.trim().toUpperCase())
      .is('revoked_at', null)
      .maybeSingle()

    console.log('INVITE:', invite);
    console.log('INVITE ERROR:', inviteError);

    if (inviteError || !invite) {
      console.log('Invalid invite Code!');
      return;
    }

    const { error: memberError } = await supabase
      .from('household_members')
      .insert({
        household_id: invite.household_id,
        user_id: user.id,
        role: 'member',
      });

    if (memberError) {
      console.log(memberError);
      return;
    }

    console.log('Joined Household!')
    
  }
  
  return (
    <Container scroll>
      <Text variant="h2" weight="black" style={{ marginBottom: 24, marginTop: 16 }}>
        Welcome to FreshTrack
      </Text>
      
      <Card elevated style={{ marginBottom: 24 }}>
        <Text variant="h3" weight="bold" style={{ marginBottom: 8 }}>Create Household</Text>
        <Text variant="body" color="textMuted" style={{ marginBottom: 16 }}>
          Start a new shared inventory and invite others.
        </Text>
        <Button 
          variant="primary" 
          block
          onPress={handleCreateHousehold}
        >
          Create New Household
        </Button>
      </Card>

      <Text variant="body" color="textMuted" align="center" style={{ marginBottom: 24 }}>- OR -</Text>

      <Card elevated>
        <Text variant="h3" weight="bold" style={{ marginBottom: 8 }}>Join Existing</Text>
        <Text variant="body" color="textMuted" style={{ marginBottom: 16 }}>
          Have an invite code from a family member or roommate?
        </Text>
        <TextInput 
          placeholder="Enter invite code" 
          autoCapitalize="characters"
          value={inviteCode}
          onChangeText={setInviteCode}
        />
        <Button 
          variant="secondary" 
          block
          onPress={handleJoinHousehold}
        >
          Join Household
        </Button>
      </Card>
    </Container>
  );
}
