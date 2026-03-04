import React from 'react';
import { Container, Text, Button, Card, TextInput } from '../components';
import { useNavigation } from '@react-navigation/native';
import { RootNavigationProp } from '../navigation/types';
import { View } from 'react-native';

export function OnboardingScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  
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
          onPress={() => navigation.replace('Main')}
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
          mono
        />
        <Button 
          variant="secondary" 
          block
          onPress={() => navigation.replace('Main')}
        >
          Join Household
        </Button>
      </Card>
    </Container>
  );
}
