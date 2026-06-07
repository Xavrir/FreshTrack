import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { useTheme } from '../theme/ThemeProvider';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';

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


const Stack = createNativeStackNavigator<RootStackParamList>();

export function Navigation() {
  const { colors, typography } = useTheme();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasHousehold, setHasHousehold] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);

      if (session) {
        const { data: member, error } = await supabase
          .from('household_members')
          .select('household_id, role')
          .eq('user_id', session.user.id)
          .maybeSingle();

        setHasHousehold(!!member);
        
        if (member) {
          const {data: inventory, error: inventoryError } = await supabase
            .from('inventory_batches')
            .select('*')
            .eq('household_id', member.household_id);

          console.log('INVENTORY:', inventory);
          console.log('INVENTORY ERROR:', inventoryError);
        }

        console.log('HOUSEHOLD ERROR:', error);
      }

      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);

        if (!session) {
          setHasHousehold(null);
          return;
        }

        const { data: member } = await supabase
          .from('household_members')
          .select('household_id')
          .eq('user_id', session.user.id)
          .maybeSingle();

        setHasHousehold(!!member);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  if (loading) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator
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
      
        {session ? (
          hasHousehold ? (
            <>
              <Stack.Screen
                name="Main"
                component={InventoryHome}
                options={{ headerShown: false }}
              />

              <Stack.Screen
                name="Scanner"
                component={ScannerScreen}
                options={{ presentation: 'fullScreenModal', headerShown: false }}
              />

              <Stack.Screen
                name="AddBatch"
                component={AddBatchScreen}
                options={{ title: 'Add Item' }}
              />

              <Stack.Screen
                name="BatchDetail"
                component={BatchDetailScreen}
                options={{ title: 'Details' }}
              />

              <Stack.Screen
                name="ConsumeWaste"
                component={ConsumeWasteScreen}
                options={{ presentation: 'modal', title: 'Record Action' }}
              />

              <Stack.Screen
                name="HouseholdSettings"
                component={HouseholdSettingsScreen}
                options={{ title: 'Settings' }}
              />

              <Stack.Screen
                name="History"
                component={HistoryScreen}
                options={{ title: 'History' }}
              />
            </>
          ) : (
            <Stack.Screen
              name="Onboarding"
              component={OnboardingScreen}
              options={{ headerShown: false }}
            />
          )
        ) : (
          <>
            <Stack.Screen
              name="Auth"
              component={AuthScreen}
              options={{ headerShown: false }}
            />

            <Stack.Screen
              name="OTP"
              component={OTPScreen}
              options={{ title: 'Enter OTP' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
