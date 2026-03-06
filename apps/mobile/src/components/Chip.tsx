import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';

export interface ChipProps extends ViewProps {
  label: string;
  variant?: 'default' | 'success' | 'danger' | 'warning';
}

export function Chip({ label, variant = 'default', style, ...rest }: ChipProps) {
  const { colors, spacing, borderWidth: bw, radii } = useTheme();

  const getStampColor = () => {
    switch (variant) {
      case 'success': return colors.success;
      case 'danger': return colors.danger;
      case 'warning': return colors.warning;
      default: return colors.border;
    }
  };

  const stampColor = getStampColor();
  const isFilled = variant !== 'default';

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: isFilled ? stampColor : colors.surfaceMuted,
          borderColor: stampColor,
          borderWidth: bw.medium,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs,
          borderRadius: radii.full,
        },
        style,
      ]}
      {...rest}
    >
      <Text
        variant="label"
        weight="bold"
        color={isFilled ? (variant === 'warning' ? 'primaryText' : 'surface') : 'textMuted'}
        uppercase
        tracking="wider"
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
