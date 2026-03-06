import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import {
  Barlow_400Regular,
  Barlow_500Medium,
  Barlow_700Bold,
} from '@expo-google-fonts/barlow';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import { ThemeProvider } from './src/theme/ThemeProvider';
import { AuthProvider } from './src/providers/AuthProvider';
import { HouseholdProvider } from './src/providers/HouseholdProvider';
import { Navigation } from './src/navigation';

export default function App() {
  const [fontsLoaded] = useFonts({
    Barlow_400Regular,
    Barlow_500Medium,
    Barlow_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#090909' }}>
        <ActivityIndicator size="large" color="#F2A900" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <HouseholdProvider>
            <Navigation />
            <StatusBar style="light" />
          </HouseholdProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
