import React, { useState } from 'react';
import { View, Alert, StyleSheet, Pressable, TextInput as RNTextInput, TouchableOpacity } from 'react-native';
import { Text, Button, Divider, Card, Icon } from '../components';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { RootNavigationProp, RootStackParamList } from '../navigation/types';
import { useAuth } from '../providers/AuthProvider';
import { useTheme } from '../theme/ThemeProvider';
import { SafeAreaView } from 'react-native-safe-area-context';

export function AuthScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  const route = useRoute<RouteProp<RootStackParamList, 'Auth'>>();
  const { signInWithOtp, signInMock, isMockMode } = useAuth();
  const { colors, spacing, radii, borderWidth: bw } = useTheme();
  const [email, setEmail] = useState(route.params?.email ?? '');
  const [loading, setLoading] = useState(false);
  const mode = route.params?.mode ?? 'login';
  const isSignUp = mode === 'signup';

  const handleSendOtp = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      Alert.alert('Error', 'Please enter your email address.');
      return;
    }

    setLoading(true);
    const { error } = await signInWithOtp(trimmed);
    setLoading(false);

    if (error) {
      Alert.alert('Error', error);
      return;
    }

    navigation.navigate('OTP', { email: trimmed, mode });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}> 
      <View style={[styles.container, { padding: spacing.xl }]}> 
        <View style={[styles.topBar, { marginBottom: spacing.xxl }]}> 
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: bw.medium, borderRadius: radii.md }]}
            onPress={() => navigation.navigate(isSignUp ? 'SignUp' : 'Login')}
          >
            <Icon name="arrow-left" size={18} color="text" />
          </TouchableOpacity>
          <Text variant="label" color="textSubtle" mono tracking="widest">
            ACCESS CODE PAGE
          </Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={{ marginTop: spacing.xxl, marginBottom: spacing['4xl'] }}>
          <Text variant="label" color="primary" mono tracking="widest" style={{ marginBottom: spacing.sm }}>
            REFINED UTILITY SYSTEM
          </Text>
          <Text variant="display" weight="bold" uppercase>
            FRESH
          </Text>
          <Text variant="display" weight="bold" uppercase color="primary" style={{ marginTop: -6 }}>
            TRACK
          </Text>
          <Text variant="body" color="textMuted" style={{ marginTop: spacing.md, maxWidth: 280 }}>
            Access your household inventory console, monitor expiring stock, and keep the kitchen in sync.
          </Text>
        </View>

        <Card elevated style={[styles.authCard, { backgroundColor: colors.surface, borderRadius: radii.lg }]}> 
          <Text variant="label" color="primary" mono tracking="widest" style={{ marginBottom: spacing.md }}>
            {isSignUp ? 'ACCOUNT ACTIVATION' : 'AUTHENTICATION NODE'}
          </Text>

          <Text variant="h1" weight="bold" uppercase style={{ marginBottom: spacing.sm }}>
            {isSignUp ? 'Create Access Code' : 'Send Access Code'}
          </Text>
          <Text variant="body" color="textMuted" style={{ marginBottom: spacing.xl }}>
            {isSignUp
              ? 'We will send a one-time code to verify your email and start household setup.'
              : 'Continue with email OTP to unlock your live pantry dashboard.'}
          </Text>

          <View style={{ marginBottom: spacing.sm }}>
            <Text variant="label" color="textSubtle" mono tracking="widest" style={{ marginBottom: spacing.sm }}>
              EMAIL ADDRESS
            </Text>
            <View
              style={[
                styles.inputShell,
                {
                  backgroundColor: colors.backgroundAlt,
                  borderColor: colors.border,
                  borderRadius: radii.md,
                },
              ]}
            >
              <View style={[styles.inputIcon, { backgroundColor: colors.surfaceMuted, borderRadius: radii.sm }]}>
                <Icon name="at" size={16} color="primary" />
              </View>
              <RNTextInput
                placeholder="operator@freshtrack.app"
                placeholderTextColor={colors.textFaint}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                style={{ flex: 1, color: colors.text, fontSize: 14 }}
              />
            </View>
          </View>

          <Button variant="primary" block loading={loading} onPress={handleSendOtp}>
            SEND ACCESS CODE
          </Button>

          {isMockMode && (
            <Button variant="secondary" block style={{ marginTop: spacing.md }} onPress={signInMock}>
              ENTER DEMO WORKSPACE
            </Button>
          )}

          <Divider style={{ marginVertical: spacing.xl }} />

          <View style={styles.metaRow}>
            <View>
              <Text variant="label" color="textSubtle" mono tracking="widest">
                {isSignUp ? 'NEXT STEP' : 'STATUS'}
              </Text>
              <Text variant="body" color={isMockMode ? 'warning' : 'success'} weight="medium">
                {isSignUp ? 'Household onboarding after verify' : isMockMode ? 'Offline demo channel ready' : 'Secure node online'}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text variant="label" color="textSubtle" mono tracking="widest">
                REGION
              </Text>
              <Text variant="body" color="textMuted" mono>
                AP-SOUTHEAST
              </Text>
            </View>
          </View>

          <View style={[styles.linkRow, { marginTop: spacing.lg }]}>
            <Pressable onPress={() => navigation.navigate('SignUp')}>
              <Text variant="label" color="textMuted" mono tracking="wider">
                {isSignUp ? 'EDIT ACCOUNT FLOW' : 'CREATE ACCOUNT'}
              </Text>
            </Pressable>
            <Pressable onPress={() => navigation.navigate('Login')}>
              <Text variant="label" color="textMuted" mono tracking="wider">
                RETURN TO LOGIN
              </Text>
            </Pressable>
          </View>
        </Card>

        <View style={{ marginTop: 'auto', paddingTop: spacing.xxl }}>
          <Text variant="caption" color="textFaint" mono align="center">
            (C) 2026 FRESHTRACK SYSTEMS // HOUSEHOLD INVENTORY NETWORK
          </Text>
        </View>
      </View>
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
  authCard: {
    paddingVertical: 24,
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
  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10,
  },
  inputIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    rowGap: 8,
  },
});
