import React from 'react';
import { Text as RNText, TextProps as RNTextProps } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

export interface TextProps extends RNTextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'label';
  color?: 'text' | 'textMuted' | 'primary' | 'danger' | 'success' | 'surface';
  weight?: 'regular' | 'medium' | 'bold' | 'black';
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
  mono?: boolean;
}

export function Text({
  variant = 'body',
  color = 'text',
  weight = 'regular',
  align = 'left',
  mono = false,
  style,
  children,
  ...rest
}: TextProps) {
  const { colors, typography } = useTheme();

  const getFontSize = () => {
    switch (variant) {
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
    if (mono) return typography.fontFamily.mono;
    return typography.fontFamily.sans;
  };

  const getColor = () => {
    switch (color) {
      case 'surface': return colors.surface;
      default: return colors[color];
    }
  };

  return (
    <RNText
      style={[
        {
          fontSize: getFontSize(),
          fontFamily: getFontFamily(),
          color: getColor(),
          fontWeight: typography.weights[weight],
          textAlign: align,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </RNText>
  );
}
