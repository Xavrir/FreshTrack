import React, { useState } from 'react';
import { Alert, View, StyleSheet } from 'react-native';
import { Text, Button, TextInput, Divider, Card } from '../components';
import { useHousehold } from '../providers/HouseholdProvider';
import { useTheme } from '../theme/ThemeProvider';
import { SafeAreaView } from 'react-native-safe-area-context';

export function OnboardingScreen() {
  const { createHousehold, joinHousehold } = useHousehold();
  const { colors, spacing, radii } = useTheme();
  const [inviteCode, setInviteCode] = useState('');
  const [creatingLoading, setCreatingLoading] = useState(false);
  const [joiningLoading, setJoiningLoading] = useState(false);

  const handleCreate = async () => {
    setCreatingLoading(true);
    const { error } = await createHousehold();
    setCreatingLoading(false);

    if (error) {
      Alert.alert('Error', error);
    }
  };

  const handleJoin = async () => {
    const trimmed = inviteCode.trim();
    if (!trimmed) {
      Alert.alert('Error', 'Please enter an invite code.');
      return;
    }

    setJoiningLoading(true);
    const { error } = await joinHousehold(trimmed);
    setJoiningLoading(false);

    if (error) {
      Alert.alert('Error', error);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}> 
      <View style={{ flex: 1, padding: spacing.xl }}>
        <View style={{ marginTop: spacing.xl, marginBottom: spacing.xxl }}>
          <Text variant="label" color="primary" mono tracking="widest" style={{ marginBottom: spacing.sm }}>
            HOUSEHOLD SETUP
          </Text>
          <Text variant="display" weight="bold" uppercase>
            CONNECT YOUR
          </Text>
          <Text variant="display" weight="bold" uppercase color="primary" style={{ marginTop: -6 }}>
            PANTRY CREW
          </Text>
        </View>

        <Card elevated style={{ borderRadius: radii.lg, marginBottom: spacing.lg }}>
          <Text variant="label" color="primary" mono tracking="widest" style={{ marginBottom: spacing.md }}>
            CREATE WORKSPACE
          </Text>
          <Text variant="h2" weight="bold" style={{ marginBottom: spacing.sm }}>
            Start a new household
          </Text>
          <Text variant="body" color="textMuted" style={{ marginBottom: spacing.lg }}>
            Generate an invite code, set your reminder cadence, and share the inventory with family.
          </Text>
          <Button variant="primary" block loading={creatingLoading} onPress={handleCreate}>
            CREATE HOUSEHOLD
          </Button>
        </Card>

        <Divider label="OR" style={{ marginVertical: spacing.md }} />

        <Card elevated style={{ borderRadius: radii.lg }}>
          <Text variant="label" color="primary" mono tracking="widest" style={{ marginBottom: spacing.md }}>
            JOIN WORKSPACE
          </Text>
          <Text variant="h2" weight="bold" style={{ marginBottom: spacing.sm }}>
            Enter invite code
          </Text>
          <Text variant="body" color="textMuted" style={{ marginBottom: spacing.lg }}>
            Use the household code from a family member or roommate to sync into their pantry.
          </Text>
          <TextInput
            label="INVITE CODE"
            placeholder="ABCD1234"
            autoCapitalize="characters"
            value={inviteCode}
            onChangeText={setInviteCode}
            mono
          />
          <Button variant="secondary" block loading={joiningLoading} onPress={handleJoin}>
            JOIN HOUSEHOLD
          </Button>
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
});
