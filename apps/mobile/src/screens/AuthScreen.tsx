import React, { useState } from 'react';
import { View } from 'react-native';
import { Container, Text, Button, TextInput, Card } from '../components';
import { useNavigation } from '@react-navigation/native';
import { RootNavigationProp } from '../navigation/types';
import { supabase } from '../lib/supabase';

export function AuthScreen() {
  const navigation = useNavigation<RootNavigationProp>();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    setErrorMessage('');

    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true },
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      navigation.navigate('OTP', { email: email.trim() });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setErrorMessage('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMessage(error.message);
      console.log('Login error:', error.message);
      return;
    }

    console.log('Login success:')

    // const { data: { user } } = await supabase.auth.getUser()
    // console.log('User:', user)  
  };

// Temp Sign in helper function
  const handleSignUp = async () => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      console.log('Signup error:', error.message)
      return
    }

    if (!data.user) {
      console.log('No User Returned...');
      return;
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: data.user.id,
        username,
        display_name: displayName,
      });

    if (profileError) {
      console.log("Profile Creation Error: ", profileError.message);
      return;
    }

    console.log('Signup success:');
  };
  
  return (
    // <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    //   <Text>Test Screen</Text>
    // </View>
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
          onPress={() => console.log('Pressed')}
        >
          Continue with Google
        </Button>
        
        <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 16 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
          <Text variant="caption" color="textMuted" style={{ marginHorizontal: 8 }}>OR</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
        </View>
        
        <TextInput label="Email Address" placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
        <TextInput label="Password" placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />

        {errorMessage ? (
          <Text color="danger" style={{ marginBottom: 12 }}>
            {errorMessage}
          </Text>
        ) : null}

        {isSignup && (
          <>
            <TextInput label="Username" placeholder="johnsmith" autoCapitalize="none" value={username} onChangeText={setUsername} />

            < TextInput label="Display Name" placeholder="Johnny" value={displayName} onChangeText={setDisplayName} />
          </>
        )}

        <Button 
          variant="primary" 
          block
          loading={loading}
          onPress={isSignup ? handleSignUp : handleLogin}
        >
          {isSignup ? 'Create Account' : 'Sign In'}
        </Button>

        <Button
          variant="secondary"
          block
          style={{ marginTop: 12 }}
          loading={loading}
          onPress={handleSendOtp}
        >
          Email me a code
        </Button>

        <Button variant="ghost" block onPress={() => setIsSignup(!isSignup)}>
          {isSignup ? 'Already have an Account? Sign in' : "Don't have an Account? Create One"}
        </Button>
      </Card>
    </Container>
  );
}
