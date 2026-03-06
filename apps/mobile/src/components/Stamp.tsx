import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';

export interface StampProps extends ViewProps {
  label: string;
  variant?: 'success' | 'danger' | 'warning' | 'default' | 'filled';
  rotation?: number;
}

export function Stamp({ label, variant = 'default', rotation = -3, style, ...rest }: StampProps) {
  const { colors, borderWidth: bw, spacing, radii } = useTheme();

  const getColor = () => {
    switch (variant) {
      case 'success': return colors.success;
      case 'danger': return colors.danger;
      case 'warning': return colors.warning;
      case 'filled': return colors.primary;
      default: return colors.border;
    }
  };

  const stampColor = getColor();
  const isFilled = variant === 'filled';

  return (
    <View
      style={[
        styles.stamp,
        {
          borderColor: stampColor,
          borderWidth: bw.medium,
          backgroundColor: isFilled ? colors.primary : colors.surfaceMuted,
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
          borderRadius: radii.full,
          transform: [{ rotate: `${rotation}deg` }],
        },
        style,
      ]}
      {...rest}
    >
      <Text
        variant="label"
        weight="bold"
        uppercase
        tracking="wide"
        color={isFilled ? 'primaryText' : variant === 'danger' ? 'danger' : variant === 'warning' ? 'warning' : variant === 'success' ? 'success' : 'textMuted'}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stamp: {
    alignSelf: 'flex-start',
    opacity: 0.9,
  },
});
