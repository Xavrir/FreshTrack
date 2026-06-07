import React, { useState } from 'react';
import { Container, Text, Button, TextInput, Card } from '../components';
import { useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { supabase } from '../lib/supabase';

export function OTPScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'OTP'>>();
  const email = route.params?.email;

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleVerify = async () => {
    setErrorMessage('');

    if (code.length !== 6) {
      setErrorMessage('Enter the 6-digit code.');
      return;
    }

    if (!email) {
      setErrorMessage('Missing email. Go back and request a new code.');
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'email',
      });

      if (error) {
        setErrorMessage('Invalid or expired code. Please try again.');
        return;
      }
      // On success the auth listener in Navigation flips the session
      // and routes to Onboarding/Main automatically.
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setErrorMessage('');

    if (!email) {
      setErrorMessage('Missing email. Go back and request a new code.');
      return;
    }

    try {
      setResending(true);

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });

      if (error) {
        setErrorMessage(error.message);
      }
    } finally {
      setResending(false);
    }
  };

  return (
    <Container scroll>
      <Card elevated style={{ marginTop: 24 }}>
        <Text variant="h2" weight="bold" style={{ marginBottom: 8 }}>Check your email</Text>
        <Text variant="body" color="textMuted" style={{ marginBottom: 24 }}>
          We sent a code to {email}
        </Text>
        
        <TextInput 
          label="One-Time Password" 
          placeholder="000000" 
          keyboardType="numeric" 
          maxLength={6} 
          mono 
          value={code}
          onChangeText={setCode}
          style={{ textAlign: 'center', fontSize: 24, letterSpacing: 8 }}
        />

        {errorMessage ? (
          <Text color="danger" style={{ marginBottom: 12 }}>
            {errorMessage}
          </Text>
        ) : null}

        <Button 
          variant="primary" 
          block 
          style={{ marginTop: 16 }}
          loading={loading}
          onPress={handleVerify}
        >
          Verify
        </Button>

        <Button
          variant="ghost"
          block
          loading={resending}
          onPress={handleResend}
        >
          Resend code
        </Button>
      </Card>
    </Container>
  );
}
