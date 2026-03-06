import React from 'react';
import {
  Pressable,
  ActivityIndicator,
  StyleSheet,
  PressableProps,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';

export interface ButtonProps extends Omit<PressableProps, 'style'> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  block?: boolean;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
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
  const { colors, spacing, borderWidth: bw, shadow, radii } = useTheme();

  const getBackgroundColor = () => {
    if (disabled) return colors.surfaceRaised;
    switch (variant) {
      case 'primary': return colors.primary;
      case 'secondary': return colors.surface;
      case 'danger': return colors.danger;
      case 'ghost': return 'transparent';
      default: return colors.primary;
    }
  };

  const getBorderColor = () => {
    if (disabled) return colors.border;
    switch (variant) {
      case 'primary': return colors.primary;
      case 'danger': return colors.danger;
      case 'secondary': return colors.border;
      case 'ghost': return 'transparent';
      default: return colors.border;
    }
  };

  const getTextColor = (): 'primaryText' | 'text' | 'surface' | 'textMuted' => {
    if (disabled) return 'textMuted';
    switch (variant) {
      case 'primary': return 'primaryText';
      case 'secondary': return 'text';
      case 'danger': return 'surface';
      case 'ghost': return 'primary';
      default: return 'primaryText';
    }
  };

  const getHeight = () => {
    switch (size) {
      case 'sm': return 36;
      case 'md': return 52;
      case 'lg': return 60;
      default: return 52;
    }
  };

  const getPaddingHorizontal = () => {
    switch (size) {
      case 'sm': return spacing.md;
      case 'md': return spacing.lg;
      case 'lg': return spacing.xl;
      default: return spacing.lg;
    }
  };

  const textColor = getTextColor();
  const hasShadow = variant !== 'ghost' && !disabled;
  const spinnerColor = colors[textColor] ?? colors.text;

  return (
    <Pressable
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          borderWidth: variant === 'ghost' ? 0 : bw.medium,
          height: getHeight(),
          width: block ? '100%' : 'auto',
          paddingHorizontal: getPaddingHorizontal(),
          borderRadius: radii.md,
        },
        hasShadow && (pressed ? shadow.pressed : shadow.md),
        pressed && hasShadow && {
          transform: [{ translateY: 1 }],
        },
        !pressed && hasShadow && {
          transform: [{ translateY: 0 }],
        },
        style,
      ]}
      {...rest}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={spinnerColor} />
        ) : (
          typeof children === 'string' ? (
            <Text
              weight="bold"
              color={textColor}
              align="center"
              uppercase
              tracking="widest"
              variant={size === 'sm' ? 'caption' : size === 'lg' ? 'h2' : 'body'}
            >
              {children}
            </Text>
          ) : children
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
