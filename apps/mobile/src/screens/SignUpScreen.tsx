import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Button, Card, Divider, Icon, Text, TextInput } from '../components';
import { RootNavigationProp } from '../navigation/types';
import { useTheme } from '../theme/ThemeProvider';

export function SignUpScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  const { colors, spacing, radii, borderWidth: bw } = useTheme();
  const [email, setEmail] = useState('');

  const handleContinue = () => {
    const trimmed = email.trim();
    if (!trimmed) {
      Alert.alert('Error', 'Please enter your email address.');
      return;
    }

    navigation.navigate('Auth', { email: trimmed, mode: 'signup' });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}> 
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.container, { padding: spacing.xl }]}> 
        <View style={[styles.topBar, { marginBottom: spacing.xxl }]}> 
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: bw.medium, borderRadius: radii.md }]}
            onPress={() => navigation.navigate('Login')}
          >
            <Icon name="arrow-left" size={18} color="text" />
          </TouchableOpacity>
          <Text variant="label" color="textSubtle" mono tracking="widest">
            CREATE ACCOUNT
          </Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={{ marginTop: spacing.xxl, marginBottom: spacing['4xl'] }}>
          <Text variant="label" color="warning" mono tracking="widest" style={{ marginBottom: spacing.sm }}>
            NEW HOUSEHOLD OPERATOR
          </Text>
          <Text variant="display" weight="bold" uppercase>
            SET UP YOUR
          </Text>
          <Text variant="display" weight="bold" uppercase color="primary" style={{ marginTop: -6 }}>
            ACCOUNT
          </Text>
          <Text variant="body" color="textMuted" style={{ marginTop: spacing.md, maxWidth: 300 }}>
            Use your email to create access, verify the code, then finish household setup in the onboarding flow.
          </Text>

          <View style={{ gap: spacing.sm, marginTop: spacing.xl }}>
            {['Verify your email', 'Create or join a household', 'Start tracking live stock'].map((step, index) => (
              <View key={step} style={[styles.stepRow, { backgroundColor: index === 0 ? colors.surface : colors.surfaceMuted, borderColor: colors.border, borderRadius: radii.md, borderWidth: bw.medium }]}>
                <View style={[styles.stepBadge, { backgroundColor: colors.primary, borderRadius: radii.full }]}>
                  <Text variant="label" color="primaryText" mono>{index + 1}</Text>
                </View>
                <Text variant="body" weight="medium">{step}</Text>
              </View>
            ))}
          </View>
        </View>

        <Card elevated style={[styles.card, { backgroundColor: colors.surface, borderRadius: radii.lg }]}> 
          <Text variant="label" color="primary" mono tracking="widest" style={{ marginBottom: spacing.md }}>
            SIGN UP
          </Text>
          <Text variant="h1" weight="bold" uppercase style={{ marginBottom: spacing.sm }}>
            Create Access
          </Text>
          <Text variant="body" color="textMuted" style={{ marginBottom: spacing.xl }}>
            FreshTrack uses passwordless email verification, so your account starts with a one-time access code.
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
            CONTINUE TO SIGN UP
          </Button>

          <Divider style={{ marginVertical: spacing.xl }} />

          <View style={[styles.metaBox, { backgroundColor: colors.backgroundAlt, borderColor: colors.border, borderWidth: bw.medium, borderRadius: radii.md }]}> 
            <Icon name="account-plus-outline" size={18} color="primary" />
            <Text variant="caption" color="textMuted" style={{ flex: 1 }}>
              After verification, you will create or join a household from onboarding.
            </Text>
          </View>

          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={{ marginTop: spacing.lg }}>
            <Text variant="label" color="textMuted" mono tracking="wider" align="center">
              ALREADY HAVE ACCESS? RETURN TO LOGIN
            </Text>
          </TouchableOpacity>
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
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
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  stepBadge: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
