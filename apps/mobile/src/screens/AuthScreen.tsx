import React from 'react';
import { View } from 'react-native';
import { Container, Text, Button, TextInput, Card } from '../components';
import { useNavigation } from '@react-navigation/native';
import { RootNavigationProp } from '../navigation/types';

export function AuthScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  
  return (
    <Container scroll>
      <View style={{ marginTop: 48, marginBottom: 32 }}>
        <Text variant="h1" weight="black" align="center">FreshTrack</Text>
        <Text variant="body" color="textMuted" align="center" style={{ marginTop: 8 }}>
          Track inventory, prevent waste.
        </Text>
      </View>
      
      <Card elevated>
        <Text variant="h3" weight="bold" style={{ marginBottom: 16 }}>Sign In</Text>
        <Button 
          variant="secondary" 
          block 
          style={{ marginBottom: 16 }}
          onPress={() => navigation.replace('Onboarding')}
        >
          Continue with Google
        </Button>
        
        <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 16 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
          <Text variant="caption" color="textMuted" style={{ marginHorizontal: 8 }}>OR</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
        </View>
        
        <TextInput label="Email Address" placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
        <Button 
          variant="primary" 
          block
          onPress={() => navigation.navigate('OTP', { email: 'test@example.com' })}
        >
          Send OTP
        </Button>
      </Card>
    </Container>
  );
}
