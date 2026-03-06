import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootNavigationProp } from '../navigation/types';
import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';
import { Icon } from './Icon';
import type { IconProps } from './Icon';
import { BOTTOM_NAV_BASE_CLEARANCE } from '../theme/layout';

type Tab = 'stock' | 'activity' | 'config';

interface BottomNavProps {
  active: Tab;
}

export const BOTTOM_NAV_CLEARANCE = BOTTOM_NAV_BASE_CLEARANCE;

const TAB_CONFIG: Record<Tab, { label: string; icon: IconProps['name']; route: 'Main' | 'History' | 'HouseholdSettings' }> = {
  stock: { label: 'STOCK', icon: 'package-variant-closed', route: 'Main' },
  activity: { label: 'ACTIVITY', icon: 'history', route: 'History' },
  config: { label: 'CONFIG', icon: 'cog', route: 'HouseholdSettings' },
};

export function BottomNav({ active }: BottomNavProps) {
  const navigation = useNavigation<RootNavigationProp>();
  const insets = useSafeAreaInsets();
  const { colors, spacing, borderWidth: bw, shadow, radii } = useTheme();

  return (
    <View>
      <TouchableOpacity
        style={[
            styles.fab,
            {
              top: -22,
              borderWidth: bw.medium,
              borderColor: colors.primary,
              backgroundColor: colors.primary,
              borderRadius: radii.full,
              ...shadow.lg,
            },
          ]}
        onPress={() => navigation.navigate('Scanner')}
        activeOpacity={0.8}
      >
        <Icon name="barcode-scan" size={28} color="surface" />
      </TouchableOpacity>

      <View
        style={[
          styles.container,
          {
            marginTop: 24,
            borderTopWidth: bw.medium,
            borderTopColor: colors.border,
            backgroundColor: colors.backgroundAlt,
            paddingTop: spacing.xl,
            paddingBottom: insets.bottom + spacing.md,
            paddingHorizontal: spacing.md,
          },
        ]}
      >
        {(Object.keys(TAB_CONFIG) as Tab[]).map((tab) => {
          const { label, icon, route } = TAB_CONFIG[tab];
          const isActive = tab === active;

          return (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab,
                {
                  borderWidth: bw.medium,
                  borderColor: isActive ? colors.borderStrong : 'transparent',
                  backgroundColor: isActive ? colors.surface : 'transparent',
                  borderRadius: radii.md,
                },
              ]}
              onPress={() => {
                if (!isActive) navigation.navigate(route);
              }}
              activeOpacity={0.7}
            >
              <Icon name={icon} size={22} color={isActive ? 'primary' : 'textSubtle'} />
              <Text
                variant="label"
                weight="bold"
                uppercase
                color={isActive ? 'primary' : 'textSubtle'}
                style={{ marginTop: 2 }}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 18,
    zIndex: 10,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 58,
    paddingVertical: 8,
  },
});
