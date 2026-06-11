import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { authenticatedApiRequest, isApiConfigured } from './api';

// Show reminders while the app is foregrounded too.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Requests notification permission, obtains the Expo push token, and registers it
 * with the backend so expiry reminders can be delivered. Safe to call repeatedly;
 * it no-ops in mock mode, on simulators, or if permission is denied, and never
 * throws (failures are swallowed so they cannot break sign-in).
 */
export async function registerForPushNotifications(): Promise<void> {
  try {
    if (!isApiConfigured || !Device.isDevice) return;

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== 'granted') return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Expiry reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const tokenResponse = await Notifications.getExpoPushTokenAsync();
    const token = tokenResponse.data;
    if (!token) return;

    await authenticatedApiRequest('/v1/me/push-token', {
      method: 'POST',
      body: JSON.stringify({ token, platform: Platform.OS }),
    });
  } catch {
    // Push registration is best-effort; never surface errors to the user.
  }
}
