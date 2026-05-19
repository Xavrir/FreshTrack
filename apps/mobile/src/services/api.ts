import AsyncStorage from '@react-native-async-storage/async-storage';

export const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL ?? '';
export const isApiConfigured = apiBaseUrl.length > 0;

const accessTokenKey = 'freshtrack.accessToken';
const refreshTokenKey = 'freshtrack.refreshToken';

export interface ApiUser {
  id: string;
  email: string;
  fullName?: string | null;
  emailVerified?: boolean;
}

export interface ApiSession {
  accessToken: string;
  refreshToken: string;
  user: ApiUser;
}

export async function saveTokens(session: ApiSession) {
  await AsyncStorage.multiSet([
    [accessTokenKey, session.accessToken],
    [refreshTokenKey, session.refreshToken],
  ]);
}

export async function clearTokens() {
  await AsyncStorage.multiRemove([accessTokenKey, refreshTokenKey]);
}

export async function storedAccessToken() {
  return AsyncStorage.getItem(accessTokenKey);
}

export async function storedRefreshToken() {
  return AsyncStorage.getItem(refreshTokenKey);
}

export async function apiRequest<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  if (!isApiConfigured) throw new Error('API not configured. Use demo mode.');
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? `Request failed with status ${response.status}`);
  }
  return payload.data as T;
}
