import React from 'react';
import { TouchableOpacity, ActivityIndicator, StyleSheet, TouchableOpacityProps, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';

export interface ButtonProps extends TouchableOpacityProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  block?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  block = false,
  disabled,
  style,
  children,
  ...rest
}: ButtonProps) {
  const { colors, spacing, radii } = useTheme();

  const getBackgroundColor = () => {
    if (disabled) return colors.border;
    switch (variant) {
      case 'primary': return colors.primary;
      case 'secondary': return colors.surfaceRaised;
      case 'danger': return colors.danger;
      case 'ghost': return 'transparent';
      default: return colors.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return 'textMuted';
    switch (variant) {
      case 'primary': return 'primaryText';
      case 'secondary': return 'text';
      case 'danger': return 'surface';
      case 'ghost': return 'text';
      default: return 'primaryText';
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'sm': return { paddingVertical: spacing.sm, paddingHorizontal: spacing.md };
      case 'md': return { paddingVertical: spacing.md, paddingHorizontal: spacing.lg };
      case 'lg': return { paddingVertical: spacing.lg, paddingHorizontal: spacing.xl };
      default: return { paddingVertical: spacing.md, paddingHorizontal: spacing.lg };
    }
  };

  const getHeight = () => {
    switch (size) {
      case 'sm': return 36;
      case 'md': return 48;
      case 'lg': return 56;
      default: return 48;
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled || loading}
      style={[
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          borderRadius: radii.sm,
          height: getHeight(),
          width: block ? '100%' : 'auto',
          ...getPadding(),
        },
        variant === 'ghost' && styles.ghostButton,
        style,
      ]}
      {...rest}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={getTextColor() === 'primaryText' ? colors.primaryText : colors.text} />
        ) : (
          typeof children === 'string' ? (
            <Text
              weight="bold"
              color={getTextColor() as any}
              mono={false}
              align="center"
            >
              {children}
            </Text>
          ) : children
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  ghostButton: {
    borderWidth: 0,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
