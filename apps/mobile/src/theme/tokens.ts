export const palette = {
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
  primary: {
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
  },
  danger: {
    500: '#EF4444',
    600: '#DC2626',
  },
  success: {
    500: '#10B981',
    600: '#059669',
  }
};

export const tokens = {
  colors: {
    light: {
      background: palette.gray[50],
      surface: '#FFFFFF',
      surfaceRaised: palette.gray[100],
      border: palette.gray[200],
      text: palette.gray[900],
      textMuted: palette.gray[500],
      primary: palette.primary[500],
      primaryText: '#FFFFFF',
      danger: palette.danger[500],
      success: palette.success[500],
    },
    dark: {
      background: palette.gray[900],
      surface: palette.gray[800],
      surfaceRaised: palette.gray[700],
      border: palette.gray[700],
      text: palette.gray[50],
      textMuted: palette.gray[400],
      primary: palette.primary[500],
      primaryText: palette.gray[900],
      danger: palette.danger[500],
      success: palette.success[500],
    }
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  radii: {
    none: 0,
    sm: 2,
    md: 4,
    lg: 8,
    full: 9999,
  },
  typography: {
    fontFamily: {
      sans: 'System',
      mono: 'Courier New',
    },
    sizes: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 20,
      xl: 24,
      xxl: 32,
    },
    weights: {
      regular: '400',
      medium: '500',
      bold: '700',
      black: '900',
    }
  }
};

export type ThemeType = 'light' | 'dark';
