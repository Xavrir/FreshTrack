import React from 'react';
import { Container, Text, Button, TextInput, Card } from '../components';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList, RootNavigationProp } from '../navigation/types';

export function OTPScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  const route = useRoute<RouteProp<RootStackParamList, 'OTP'>>();
  
  return (
    <Container scroll>
      <Card elevated style={{ marginTop: 24 }}>
        <Text variant="h2" weight="bold" style={{ marginBottom: 8 }}>Check your email</Text>
        <Text variant="body" color="textMuted" style={{ marginBottom: 24 }}>
          We sent a code to {route.params?.email}
        </Text>
        
        <TextInput 
          label="One-Time Password" 
          placeholder="000000" 
          keyboardType="numeric" 
          maxLength={6} 
          mono 
          style={{ textAlign: 'center', fontSize: 24, letterSpacing: 8 }}
        />
        <Button 
          variant="primary" 
          block 
          style={{ marginTop: 16 }}
          onPress={() => navigation.replace('Onboarding')}
        >
          Verify
        </Button>
      </Card>
    </Container>
  );
}
