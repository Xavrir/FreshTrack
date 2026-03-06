import React from 'react';
import { TextInput as RNTextInput, TextInputProps as RNTextInputProps, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';

export interface TextInputProps extends RNTextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  mono?: boolean;
}

export function TextInput({
  label,
  error,
  helperText,
  mono = false,
  style,
  ...rest
}: TextInputProps) {
  const { colors, spacing, borderWidth: bw, typography, radii } = useTheme();

  const fontFamily = mono ? typography.fontFamily.mono.regular : typography.fontFamily.body.regular;

  return (
    <View style={[{ marginBottom: spacing.lg }, style]}>
      {label && (
        <Text
          variant="label"
          color="textSubtle"
          weight="medium"
          tracking="widest"
          style={{ marginBottom: spacing.sm }}
        >
          {label}
        </Text>
      )}
      <RNTextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.backgroundAlt,
            borderColor: error ? colors.danger : colors.border,
            borderWidth: bw.medium,
            color: colors.text,
            paddingHorizontal: spacing.lg,
            height: 52,
            fontFamily,
            fontSize: typography.sizes.md,
            borderRadius: radii.md,
          },
        ]}
        placeholderTextColor={colors.textFaint}
        {...rest}
      />
      {error && (
        <Text variant="caption" color="danger" style={{ marginTop: spacing.xs }}>
          {error}
        </Text>
      )}
      {!error && helperText && (
        <Text variant="caption" color="textMuted" style={{ marginTop: spacing.xs }}>
          {helperText}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    justifyContent: 'center',
  },
});
