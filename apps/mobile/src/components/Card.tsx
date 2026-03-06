import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

export interface CardProps extends ViewProps {
  elevated?: boolean;
}

export function Card({ elevated = false, style, children, ...rest }: CardProps) {
  const { colors, spacing, borderWidth: bw, shadow, radii } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          padding: spacing.lg,
          borderColor: colors.border,
          borderWidth: bw.medium,
          borderRadius: radii.lg,
        },
        elevated && shadow.md,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'visible',
  },
});
