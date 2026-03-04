import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';

export interface ChipProps extends ViewProps {
  label: string;
  variant?: 'default' | 'success' | 'danger' | 'warning';
}

export function Chip({ label, variant = 'default', style, ...rest }: ChipProps) {
  const { colors, spacing, radii } = useTheme();

  const getBackgroundColor = () => {
    switch (variant) {
      case 'success': return colors.success;
      case 'danger': return colors.danger;
      case 'warning': return colors.primary;
      default: return colors.surfaceRaised;
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'success':
      case 'danger':
      case 'warning':
        return colors.surface;
      default:
        return colors.text;
    }
  };

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: getBackgroundColor(),
          borderRadius: radii.full,
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs / 2,
        },
        style,
      ]}
      {...rest}
    >
      <Text variant="caption" weight="medium" style={{ color: getTextColor() }}>
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
