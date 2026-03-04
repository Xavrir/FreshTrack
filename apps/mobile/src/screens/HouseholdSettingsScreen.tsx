import React from 'react';
import { View } from 'react-native';
import { Container, Text, Button, Card, TextInput, Chip } from '../components';
import { useNavigation } from '@react-navigation/native';
import { RootNavigationProp } from '../navigation/types';

export function HouseholdSettingsScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  
  return (
    <Container scroll>
      <View style={{ padding: 16 }}>
        <Text variant="h2" weight="black" style={{ marginBottom: 24 }}>Household</Text>
        
        <Card elevated style={{ marginBottom: 24 }}>
          <Text variant="h3" weight="bold" style={{ marginBottom: 16 }}>Members</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text variant="body" weight="medium">You</Text>
            <Chip label="Owner" variant="success" />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="body">Jane Doe</Text>
            <Button variant="ghost" size="sm"><Text color="danger">Remove</Text></Button>
          </View>
          
          <Button variant="secondary" block style={{ marginTop: 16 }}>Invite Member</Button>
        </Card>

        <Card elevated style={{ marginBottom: 24 }}>
          <Text variant="h3" weight="bold" style={{ marginBottom: 16 }}>Reminder Settings</Text>
          <TextInput label="Reminder Time" placeholder="09:00" />
          <TextInput label="Lead Days" placeholder="7, 3, 0" helperText="Comma separated days before expiry." />
          <Button variant="primary" block>Save Settings</Button>
        </Card>
        
        <Button variant="ghost" block onPress={() => navigation.navigate('Auth')}>
          <Text color="danger" weight="bold">Sign Out</Text>
        </Button>
      </View>
    </Container>
  );
}
