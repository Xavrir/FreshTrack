import React from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from '../theme/ThemeProvider';

type IconColor = 'text' | 'textMuted' | 'textSubtle' | 'textFaint' | 'primary' | 'danger' | 'warning' | 'success' | 'surface' | 'primaryText';

export interface IconProps {
  name: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  size?: number;
  color?: IconColor;
}

export function Icon({ name, size = 24, color = 'text' }: IconProps) {
  const { colors } = useTheme();

  const getColor = () => {
    switch (color) {
      case 'surface': return colors.surface;
      case 'primaryText': return colors.primaryText;
      case 'textSubtle': return colors.textSubtle;
      case 'textFaint': return colors.textFaint;
      default: return colors[color as keyof typeof colors] ?? colors.text;
    }
  };

  return (
    <MaterialCommunityIcons
      name={name}
      size={size}
      color={getColor() as string}
    />
  );
}
