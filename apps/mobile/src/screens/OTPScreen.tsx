import React, { useEffect, useState } from 'react';
import { View, Alert, TouchableOpacity, StyleSheet } from 'react-native';
import { Text, Button, TextInput, Icon, Card } from '../components';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { RootStackParamList, RootNavigationProp } from '../navigation/types';
import { useAuth } from '../providers/AuthProvider';
import { useTheme } from '../theme/ThemeProvider';
import { SafeAreaView } from 'react-native-safe-area-context';

// Matches the backend per-email send cooldown (emailSendCooldown).
const RESEND_COOLDOWN_SECONDS = 60;

export function OTPScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'OTP'>>();
  const navigation = useNavigation<RootNavigationProp>();
  const { verifyOtp, resendOtp } = useAuth();
  const { colors, spacing, borderWidth: bw, radii } = useTheme();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  // A code was just sent before this screen opened, so start in cooldown.
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS);
  const isSignUp = route.params?.mode === 'signup';

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((current) => (current <= 1 ? 0 : current - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const handleVerify = async () => {
    const trimmed = token.trim();
    if (trimmed.length !== 6) {
      Alert.alert('Error', 'Please enter the 6-digit code.');
      return;
    }

    setLoading(true);
    const { error } = await verifyOtp(route.params.email, trimmed);
    setLoading(false);

    if (error) {
      Alert.alert('Verification Failed', error);
    }
  };

  const handleResend = async () => {
    if (secondsLeft > 0 || resending) return;
    setResending(true);
    const { error } = await resendOtp(route.params.email);
    setResending(false);
    if (error) {
      Alert.alert('Could Not Resend', error);
      // Back off locally even on failure so we do not hammer the endpoint.
      setSecondsLeft(RESEND_COOLDOWN_SECONDS);
      return;
    }
    setSecondsLeft(RESEND_COOLDOWN_SECONDS);
    Alert.alert('Code Sent', 'A new access code is on its way.');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}> 
      <View style={[styles.header, { padding: spacing.xl, borderBottomColor: colors.border, borderBottomWidth: bw.medium }]}>
        <TouchableOpacity
          style={[styles.headerBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.md, borderWidth: bw.medium }]}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={20} />
        </TouchableOpacity>
        <Text variant="label" color="textSubtle" mono tracking="widest">
          ACCESS CHECKPOINT
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={[styles.content, { padding: spacing.xl }]}>
        <Card elevated style={{ borderRadius: radii.lg }}>
          <Text variant="label" color="primary" mono tracking="widest" style={{ marginBottom: spacing.md }}>
            {isSignUp ? 'ACCOUNT VERIFICATION' : 'EMAIL VERIFICATION'}
          </Text>
          <Text variant="h1" weight="bold" uppercase style={{ marginBottom: spacing.sm }}>
            {isSignUp ? 'Confirm New Access' : 'Enter Access Code'}
          </Text>
          <Text variant="body" color="textMuted" style={{ marginBottom: spacing.xl }}>
            {isSignUp ? 'Activation code sent to ' : 'Code sent to '}{route.params?.email}
          </Text>

          <TextInput
            label="ONE-TIME PASSCODE"
            placeholder="000000"
            keyboardType="numeric"
            maxLength={6}
            value={token}
            onChangeText={setToken}
            mono
          />

          <Button variant="primary" block loading={loading} onPress={handleVerify}>
            VERIFY ACCESS
          </Button>

          {secondsLeft > 0 ? (
            <Text variant="caption" color="textFaint" mono align="center" style={{ marginTop: spacing.lg }}>
              RESEND AVAILABLE IN 0:{String(secondsLeft).padStart(2, '0')}
            </Text>
          ) : (
            <TouchableOpacity onPress={handleResend} disabled={resending} style={{ marginTop: spacing.lg }}>
              <Text variant="caption" color="primary" mono align="center" tracking="widest">
                {resending ? 'SENDING…' : 'RESEND ACCESS CODE'}
              </Text>
            </TouchableOpacity>
          )}
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
});
