import React from 'react';
import { View, ScrollView, ViewProps, ScrollViewProps, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';

export interface ContainerProps extends ViewProps {
  scroll?: boolean;
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
  safeArea?: boolean;
  children: React.ReactNode;
}

export function Container({
  scroll = false,
  safeArea = true,
  contentContainerStyle,
  style,
  children,
  ...rest
}: ContainerProps) {
  const { colors, spacing } = useTheme();

  const Wrap = safeArea ? SafeAreaView : View;

  const innerContent = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.content, { padding: spacing.lg }, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, { padding: spacing.lg }, style]} {...rest}>
      {children}
    </View>
  );

  return (
    <Wrap style={[styles.container, { backgroundColor: colors.background }]} {...rest}>
      {innerContent}
    </Wrap>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
});
