import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { useTheme } from '../theme/ThemeProvider';

import { AuthScreen } from '../screens/AuthScreen';
import { OTPScreen } from '../screens/OTPScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { InventoryHome } from '../screens/InventoryHome';
import { ScannerScreen } from '../screens/ScannerScreen';
import { AddBatchScreen } from '../screens/AddBatchScreen';
import { BatchDetailScreen } from '../screens/BatchDetailScreen';
import { ConsumeWasteScreen } from '../screens/ConsumeWasteScreen';
import { HouseholdSettingsScreen } from '../screens/HouseholdSettingsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function Navigation() {
  const { colors, typography } = useTheme();

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Auth"
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.surface,
          },
          headerTintColor: colors.text,
          headerTitleStyle: {
            fontFamily: typography.fontFamily.sans,
            fontWeight: 'bold',
          },
          contentStyle: {
            backgroundColor: colors.background,
          }
        }}
      >
        <Stack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false }} />
        <Stack.Screen name="OTP" component={OTPScreen} options={{ title: 'Enter OTP' }} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ title: 'Setup' }} />
        <Stack.Screen name="Main" component={InventoryHome} options={{ headerShown: false }} />
        <Stack.Screen 
          name="Scanner" 
          component={ScannerScreen} 
          options={{ presentation: 'fullScreenModal', headerShown: false }} 
        />
        <Stack.Screen name="AddBatch" component={AddBatchScreen} options={{ title: 'Add Item' }} />
        <Stack.Screen name="BatchDetail" component={BatchDetailScreen} options={{ title: 'Details' }} />
        <Stack.Screen 
          name="ConsumeWaste" 
          component={ConsumeWasteScreen} 
          options={{ presentation: 'modal', title: 'Record Action' }} 
        />
        <Stack.Screen name="HouseholdSettings" component={HouseholdSettingsScreen} options={{ title: 'Settings' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
