import React, { useState, useEffect } from 'react';
import { View, Alert, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Text, Button, TextInput, BottomNav, Icon, Card, Chip } from '../components';
import { useAuth } from '../providers/AuthProvider';
import { useHousehold } from '../providers/HouseholdProvider';
import { useTheme } from '../theme/ThemeProvider';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { RootNavigationProp } from '../navigation/types';
import { BOTTOM_NAV_CLEARANCE } from '../components/BottomNav';

export function HouseholdSettingsScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const { members, settings, inviteCode, isOwner, updateSettings, removeMember } = useHousehold();
  const { colors, spacing, borderWidth: bw, radii } = useTheme();

  const [reminderTime, setReminderTime] = useState(settings?.reminderTimeLocal ?? '09:00');
  const [leadDaysText, setLeadDaysText] = useState(settings?.leadDays?.join(', ') ?? '7, 3, 0');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setReminderTime(settings.reminderTimeLocal);
      setLeadDaysText(settings.leadDays.join(', '));
    }
  }, [settings]);

  const handleSaveSettings = async () => {
    const leadDays = leadDaysText
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n >= 0);

    if (leadDays.length === 0) {
      Alert.alert('Error', 'Please enter at least one lead day.');
      return;
    }

    setSaving(true);
    const { error } = await updateSettings({ reminderTimeLocal: reminderTime, leadDays });
    setSaving(false);

    if (error) {
      Alert.alert('Error', error);
    } else {
      Alert.alert('Saved', 'Settings updated.');
    }
  };

  const handleRemoveMember = (userId: string) => {
    Alert.alert(
      'Remove Member',
      'Are you sure? They will lose access to this inventory.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const { error } = await removeMember(userId);
            if (error) Alert.alert('Error', error);
          },
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}> 
      <View
        style={[
          styles.header,
          {
            borderBottomWidth: bw.medium,
            borderBottomColor: colors.border,
            paddingHorizontal: spacing.xl,
            paddingTop: insets.top + spacing.lg,
            paddingBottom: spacing.lg,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.headerBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: bw.medium, borderRadius: radii.md }]}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={20} />
        </TouchableOpacity>
        <Text variant="h3" weight="bold" uppercase>
          SETTINGS
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.xl, paddingBottom: insets.bottom + BOTTOM_NAV_CLEARANCE, gap: spacing.lg }}>
        <Text variant="label" color="primary" mono tracking="widest">
          MEMBERS
        </Text>

        {isOwner && inviteCode && (
          <Card elevated style={{ borderRadius: radii.lg }}>
            <View style={[styles.rowBetween, { marginBottom: spacing.md }]}> 
              <View>
                <Text variant="body" weight="bold">
                  Invite household member
                </Text>
                <Text variant="caption" color="textMuted" style={{ marginTop: 4 }}>
                  Share this code to add someone to your pantry.
                </Text>
              </View>
              <Chip label="OWNER" variant="warning" />
            </View>

            <View style={[styles.codeBox, { backgroundColor: colors.backgroundAlt, borderColor: colors.border, borderWidth: bw.medium, borderRadius: radii.md }]}> 
              <Text variant="h2" weight="bold" mono>
                {inviteCode}
              </Text>
              <Icon name="content-copy" size={18} color="primary" />
            </View>
          </Card>
        )}

        {members.map((member) => {
          const isCurrentUser = member.userId === user?.id;
          return (
            <Card key={member.userId} style={{ borderRadius: radii.lg }}>
              <View style={styles.memberRow}>
                <View style={[styles.avatar, { backgroundColor: colors.backgroundAlt, borderColor: member.role === 'owner' ? colors.primary : colors.border, borderRadius: radii.full, borderWidth: bw.medium }]}> 
                  <Text variant="label" mono color={member.role === 'owner' ? 'primary' : 'textMuted'}>
                    {isCurrentUser ? 'ME' : member.userId.slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="body" weight="bold">
                    {isCurrentUser ? 'You' : member.userId.slice(0, 8).toUpperCase()}
                  </Text>
                  <Text variant="caption" color="textMuted" style={{ marginTop: 4 }}>
                    {isCurrentUser ? user?.email ?? 'Active operator' : `${member.userId.slice(0, 8)}@freshtrack.app`}
                  </Text>
                </View>
                {member.role === 'owner' ? (
                  <Chip label="OWNER" variant="warning" />
                ) : isOwner ? (
                  <TouchableOpacity onPress={() => handleRemoveMember(member.userId)}>
                    <Text variant="label" color="danger" mono tracking="widest">
                      REMOVE
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Chip label="MEMBER" variant="default" />
                )}
              </View>
            </Card>
          );
        })}

        <Text variant="label" color="primary" mono tracking="widest">
          REMINDERS
        </Text>

        <Card elevated style={{ borderRadius: radii.lg }}>
          <View style={[styles.rowBetween, { marginBottom: spacing.lg }]}> 
            <View style={{ flex: 1 }}>
              <Text variant="body" weight="bold">
                Push notifications
              </Text>
              <Text variant="caption" color="textMuted" style={{ marginTop: 4 }}>
                Keep expiring items visible across the household.
              </Text>
            </View>
            <Icon name="bell-ring-outline" size={20} color="primary" />
          </View>

          <TextInput
            label="NOTIFICATION TIME"
            placeholder="09:00"
            value={reminderTime}
            onChangeText={setReminderTime}
            mono
          />
          <TextInput
            label="LEAD DAYS"
            placeholder="7, 3, 0"
            value={leadDaysText}
            onChangeText={setLeadDaysText}
            helperText="Comma-separated days before expiry."
            mono
          />

          <Button variant="primary" block loading={saving} onPress={handleSaveSettings}>
            SAVE REMINDER RULES
          </Button>
        </Card>

        <Text variant="label" color="danger" mono tracking="widest">
          DANGER ZONE
        </Text>

        <Button variant="ghost" block onPress={handleSignOut}>
          <Text color="danger" weight="bold" uppercase tracking="widest">
            SIGN OUT
          </Text>
        </Button>
      </ScrollView>

      <BottomNav active="config" />
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
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
