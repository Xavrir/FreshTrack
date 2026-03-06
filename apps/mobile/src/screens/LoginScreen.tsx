import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Button, Card, Divider, Icon, Text, TextInput } from '../components';
import { RootNavigationProp } from '../navigation/types';
import { useTheme } from '../theme/ThemeProvider';
import { useAuth } from '../providers/AuthProvider';

export function LoginScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  const { colors, spacing, radii, borderWidth: bw } = useTheme();
  const { signInMock, isMockMode } = useAuth();
  const [email, setEmail] = useState('');

  const handleContinue = () => {
    const trimmed = email.trim();
    if (!trimmed) {
      Alert.alert('Error', 'Please enter your email address.');
      return;
    }

    navigation.navigate('Auth', { email: trimmed, mode: 'login' });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.container, { padding: spacing.xl }]}>
        <View style={{ marginTop: spacing.xxl, marginBottom: spacing['4xl'] }}>
          <Text variant="label" color="textSubtle" mono tracking="widest" style={{ marginBottom: spacing.sm }}>
            HOUSEHOLD ACCESS PORTAL
          </Text>
          <Text variant="display" weight="bold" uppercase>
            LOGIN TO
          </Text>
          <Text variant="display" weight="bold" uppercase color="primary" style={{ marginTop: -6 }}>
            FRESHTRACK
          </Text>
          <Text variant="body" color="textMuted" style={{ marginTop: spacing.md, maxWidth: 300 }}>
            Start with your email, then verify the one-time access code on the next screen.
          </Text>

          <View style={[styles.heroStrip, { marginTop: spacing.xl }]}> 
            <View style={[styles.heroMetric, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.md, borderWidth: bw.medium }]}>
              <Text variant="label" color="primary" mono tracking="widest">LIVE</Text>
              <Text variant="body" weight="bold" style={{ marginTop: spacing.xs }}>Pantry status</Text>
            </View>
            <View style={[styles.heroMetric, { backgroundColor: colors.surfaceMuted, borderColor: colors.border, borderRadius: radii.md, borderWidth: bw.medium }]}>
              <Text variant="label" color="warning" mono tracking="widest">FAST</Text>
              <Text variant="body" weight="bold" style={{ marginTop: spacing.xs }}>OTP sign in</Text>
            </View>
          </View>
        </View>

        <Card elevated style={[styles.card, { backgroundColor: colors.surface, borderRadius: radii.lg }]}> 
          <Text variant="label" color="primary" mono tracking="widest" style={{ marginBottom: spacing.md }}>
            LOGIN
          </Text>
          <Text variant="h1" weight="bold" uppercase style={{ marginBottom: spacing.sm }}>
            Welcome Back
          </Text>
          <Text variant="body" color="textMuted" style={{ marginBottom: spacing.xl }}>
            Enter your email to continue to the access code checkpoint.
          </Text>

          <TextInput
            label="EMAIL ADDRESS"
            placeholder="operator@freshtrack.app"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <Button variant="primary" block onPress={handleContinue}>
            CONTINUE TO LOGIN
          </Button>

          <Button variant="secondary" block style={{ marginTop: spacing.md }} onPress={() => navigation.navigate('SignUp')}>
            CREATE NEW ACCOUNT
          </Button>

          <Button
            variant="ghost"
            block
            style={{ marginTop: spacing.md, borderWidth: bw.medium, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.backgroundAlt }}
            onPress={() => navigation.navigate('Auth', { email: email.trim() || undefined, mode: 'login' })}
          >
            OPEN ACCESS CODE PAGE
          </Button>

          {isMockMode && (
            <Button variant="secondary" block style={{ marginTop: spacing.md }} onPress={signInMock}>
              ENTER DEMO WORKSPACE
            </Button>
          )}

          <Divider style={{ marginVertical: spacing.xl }} />

          <View style={[styles.metaBox, { backgroundColor: colors.backgroundAlt, borderColor: colors.border, borderWidth: bw.medium, borderRadius: radii.md }]}>
            <Icon name="shield-check-outline" size={18} color="primary" />
            <Text variant="caption" color="textMuted" style={{ flex: 1 }}>
              Passwordless login. New users continue through the same verified email flow.
            </Text>
          </View>
        </Card>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  card: {
    paddingVertical: 24,
  },
  metaBox: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    padding: 14,
  },
  heroStrip: {
    flexDirection: 'row',
    gap: 12,
  },
  heroMetric: {
    flex: 1,
    padding: 14,
  },
});
