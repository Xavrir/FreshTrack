import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { useTheme } from '../theme/ThemeProvider';
import { useAuth } from '../providers/AuthProvider';
import { useHousehold } from '../providers/HouseholdProvider';

import { LoginScreen } from '../screens/LoginScreen';
import { SignUpScreen } from '../screens/SignUpScreen';
import { AuthScreen } from '../screens/AuthScreen';
import { OTPScreen } from '../screens/OTPScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { InventoryHome } from '../screens/InventoryHome';
import { ScannerScreen } from '../screens/ScannerScreen';
import { AddBatchScreen } from '../screens/AddBatchScreen';
import { BatchDetailScreen } from '../screens/BatchDetailScreen';
import { ConsumeWasteScreen } from '../screens/ConsumeWasteScreen';
import { HouseholdSettingsScreen } from '../screens/HouseholdSettingsScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { EditBatchScreen } from '../screens/EditBatchScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

function LoadingScreen() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

export function Navigation() {
  const { colors } = useTheme();
  const { session, loading: authLoading } = useAuth();
  const { household, loading: householdLoading } = useHousehold();

  if (authLoading) {
    return <LoadingScreen />;
  }

  const isAuthenticated = !!session;
  const hasHousehold = !!household;
  const isFullyOnboarded = isAuthenticated && hasHousehold;

  let initialRoute: keyof RootStackParamList;
  if (!isAuthenticated) {
    initialRoute = 'Login';
  } else if (!hasHousehold && !householdLoading) {
    initialRoute = 'Onboarding';
  } else {
    initialRoute = 'Main';
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: colors.background,
          },
          animation: 'none',
        }}
      >
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
            <Stack.Screen name="Auth" component={AuthScreen} />
            <Stack.Screen name="OTP" component={OTPScreen} />
          </>
        ) : !isFullyOnboarded ? (
          <>
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Main" component={InventoryHome} options={{ animation: 'none' }} />
            <Stack.Screen
              name="Scanner"
              component={ScannerScreen}
              options={{ presentation: 'fullScreenModal', animation: 'none' }}
            />
            <Stack.Screen name="AddBatch" component={AddBatchScreen} />
            <Stack.Screen name="BatchDetail" component={BatchDetailScreen} />
            <Stack.Screen
              name="ConsumeWaste"
              component={ConsumeWasteScreen}
              options={{ presentation: 'modal', animation: 'none' }}
            />
            <Stack.Screen name="HouseholdSettings" component={HouseholdSettingsScreen} options={{ animation: 'none' }} />
            <Stack.Screen name="History" component={HistoryScreen} options={{ animation: 'none' }} />
            <Stack.Screen name="EditBatch" component={EditBatchScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
