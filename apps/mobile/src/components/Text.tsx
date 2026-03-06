import React from 'react';
import { Text as RNText, TextProps as RNTextProps } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

export interface TextProps extends RNTextProps {
  variant?: 'display' | 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'label';
  color?: 'text' | 'textMuted' | 'textSubtle' | 'textFaint' | 'primary' | 'primaryText' | 'danger' | 'warning' | 'success' | 'surface';
  weight?: 'regular' | 'medium' | 'bold';
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
  mono?: boolean;
  serif?: boolean;
  uppercase?: boolean;
  tracking?: 'tight' | 'normal' | 'wide' | 'wider' | 'widest';
}

export function Text({
  variant = 'body',
  color = 'text',
  weight = 'regular',
  align = 'left',
  mono = false,
  serif = false,
  uppercase = false,
  tracking = 'normal',
  style,
  children,
  ...rest
}: TextProps) {
  const { colors, typography } = useTheme();

  const getFontSize = () => {
    switch (variant) {
      case 'display': return typography.sizes.display;
      case 'h1': return typography.sizes.xxl;
      case 'h2': return typography.sizes.xl;
      case 'h3': return typography.sizes.lg;
      case 'body': return typography.sizes.md;
      case 'caption': return typography.sizes.sm;
      case 'label': return typography.sizes.xs;
      default: return typography.sizes.md;
    }
  };

  const getFontFamily = () => {
    if (mono) {
      const monoFamily = typography.fontFamily.mono;
      switch (weight) {
        case 'bold': return monoFamily.bold;
        case 'medium': return monoFamily.medium;
        default: return monoFamily.regular;
      }
    }

    const family = serif || variant === 'display' || variant === 'h1' || variant === 'h2'
      ? typography.fontFamily.heading
      : typography.fontFamily.body;

    switch (weight) {
      case 'bold': return family.bold;
      case 'medium': return family.medium ?? family.regular;
      default: return family.regular;
    }
  };

  const getColor = () => {
    switch (color) {
      case 'surface': return colors.surface;
      case 'primaryText': return colors.primaryText;
      case 'textSubtle': return colors.textSubtle;
      case 'textFaint': return colors.textFaint;
      default: return colors[color as keyof typeof colors] ?? colors.text;
    }
  };

  const isDisplayVariant = variant === 'display' || variant === 'h1' || variant === 'h2';

  return (
    <RNText
      style={[
        {
          fontSize: getFontSize(),
          fontFamily: getFontFamily(),
          color: getColor(),
          textAlign: align,
          lineHeight: Math.round(getFontSize() * (variant === 'label' || variant === 'caption' ? 1.35 : 1.45)),
          letterSpacing: typography.letterSpacing[tracking],
          textTransform: uppercase || variant === 'label' ? 'uppercase' : 'none',
        },
        isDisplayVariant && { letterSpacing: typography.letterSpacing.tight },
        style,
      ]}
      {...rest}
    >
      {children}
    </RNText>
  );
}
