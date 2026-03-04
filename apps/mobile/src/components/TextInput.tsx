import React from 'react';
import { TextInput as RNTextInput, TextInputProps as RNTextInputProps, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';

export interface TextInputProps extends RNTextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
}

export function TextInput({
  label,
  error,
  helperText,
  style,
  ...rest
}: TextInputProps) {
  const { colors, spacing, radii, typography } = useTheme();

  return (
    <View style={[{ marginBottom: spacing.md }, style]}>
      {label && (
        <Text variant="label" weight="medium" style={{ marginBottom: spacing.xs }}>
          {label}
        </Text>
      )}
      <RNTextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.surfaceRaised,
            borderColor: error ? colors.danger : colors.border,
            color: colors.text,
            borderRadius: radii.sm,
            paddingHorizontal: spacing.md,
            height: 48,
            fontFamily: typography.fontFamily.sans,
            fontSize: typography.sizes.md,
          },
        ]}
        placeholderTextColor={colors.textMuted}
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
    borderWidth: 1,
    justifyContent: 'center',
  },
});
