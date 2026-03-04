import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { tokens, ThemeType } from './tokens';

interface ThemeContextValue {
  theme: ThemeType;
  colors: typeof tokens.colors.light;
  spacing: typeof tokens.spacing;
  radii: typeof tokens.radii;
  typography: typeof tokens.typography;
  setTheme: (theme: ThemeType | 'system') => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeType | 'system'>('system');

  const resolvedTheme = themeMode === 'system' ? (systemColorScheme || 'light') : themeMode;
  const colors = tokens.colors[resolvedTheme as ThemeType];

  return (
    <ThemeContext.Provider
      value={{
        theme: resolvedTheme as ThemeType,
        colors,
        spacing: tokens.spacing,
        radii: tokens.radii,
        typography: tokens.typography,
        setTheme: setThemeMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
