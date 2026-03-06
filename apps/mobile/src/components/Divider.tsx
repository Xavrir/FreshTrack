import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';

export interface DividerProps {
  label?: string;
  dashed?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Divider({ label, dashed = false, style }: DividerProps) {
  const { colors, spacing, borderWidth: bw } = useTheme();

  if (label) {
    return (
      <View style={[styles.container, style]}>
        <View
          style={[
            styles.line,
            {
              borderBottomColor: colors.border,
              borderBottomWidth: bw.medium,
              borderStyle: dashed ? 'dashed' : 'solid',
            },
          ]}
        />
        <Text
          variant="caption"
          color="textMuted"
          uppercase
          tracking="wider"
          weight="bold"
          style={{ marginHorizontal: spacing.md }}
        >
          {label}
        </Text>
        <View
          style={[
            styles.line,
            {
              borderBottomColor: colors.border,
              borderBottomWidth: bw.medium,
              borderStyle: dashed ? 'dashed' : 'solid',
            },
          ]}
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.simpleLine,
        {
          borderBottomColor: colors.border,
          borderBottomWidth: bw.medium,
          borderStyle: dashed ? 'dashed' : 'solid',
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: {
    flex: 1,
  },
  simpleLine: {
    width: '100%',
  },
});
