import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

export type ReminderItem = {
  id: string;
  name: string;
  expiry_date: string;
};

export type ReminderSettings = {
  reminder_time_local: string;
  lead_days: number[];
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export function parseLeadDays(value: string): number[] {
  const parsed = value
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((day) => Number.isInteger(day) && day >= 0);

  return Array.from(new Set(parsed)).sort((left, right) => right - left);
}

export function parseReminderTime(value: string): { hour: number; minute: number } | null {
  const match = value.trim().match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

async function cancelFreshTrackNotifications(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((notification) => notification.content.data?.freshTrack === true)
      .map((notification) => Notifications.cancelScheduledNotificationAsync(notification.identifier))
  );
}

function reminderDate(expiryDate: string, leadDay: number, reminderTime: string): Date | null {
  const time = parseReminderTime(reminderTime);
  if (!time) return null;
  const [year, month, day] = expiryDate.split('-').map(Number);
  const scheduled = new Date(year, month - 1, day - leadDay, time.hour, time.minute, 0, 0);
  if (scheduled.getTime() <= Date.now()) return null;
  return scheduled;
}

export async function scheduleReminderNotifications(items: ReminderItem[], settings: ReminderSettings): Promise<number> {
  if (Platform.OS === 'web') return 0;
  const hasPermission = await ensureNotificationPermission();
  if (!hasPermission) return 0;

  await cancelFreshTrackNotifications();

  let count = 0;
  for (const item of items) {
    for (const leadDay of settings.lead_days) {
      const date = reminderDate(item.expiry_date, leadDay, settings.reminder_time_local);
      if (!date) continue;

      const label = leadDay === 0 ? 'expires today' : `expires in ${leadDay} day${leadDay === 1 ? '' : 's'}`;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `FreshTrack: ${item.name}`,
          body: `${item.name} ${label}.`,
          data: {
            freshTrack: true,
            batchId: item.id,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date,
        },
      });
      count += 1;
    }
  }

  return count;
}

export async function refreshReminderNotifications(): Promise<number> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return 0;

  const { data: member } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', session.user.id)
    .maybeSingle();
  if (!member) return 0;

  const { data: settings } = await supabase
    .from('household_settings')
    .select('reminder_time_local, lead_days')
    .eq('household_id', member.household_id)
    .maybeSingle();

  const { data: items } = await supabase
    .from('inventory_batches')
    .select('id, name, expiry_date')
    .eq('household_id', member.household_id)
    .is('deleted_at', null)
    .not('expiry_date', 'is', null);

  return scheduleReminderNotifications((items ?? []) as ReminderItem[], {
    reminder_time_local: settings?.reminder_time_local ?? '09:00',
    lead_days: settings?.lead_days ?? [7, 3, 1],
  });
}
