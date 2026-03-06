import React from 'react';
import { View, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Text, BottomNav, Icon, Card, Chip } from '../components';
import { useNavigation } from '@react-navigation/native';
import { RootNavigationProp } from '../navigation/types';
import { useTheme } from '../theme/ThemeProvider';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BOTTOM_NAV_CLEARANCE } from '../components/BottomNav';

interface HistoryEvent {
  id: string;
  type: 'consumed' | 'wasted' | 'added';
  product: string;
  amount: string;
  time: string;
}

const mockData: HistoryEvent[] = [
  { id: '1', type: 'consumed', product: 'Organic Strawberries', amount: '150 g', time: 'TODAY, 08:30' },
  { id: '2', type: 'added', product: 'Oat Milk', amount: '1 carton', time: 'YESTERDAY, 14:20' },
  { id: '3', type: 'wasted', product: 'Greek Yogurt', amount: '1 cup', time: 'OCT 24, 09:15' },
];

export function HistoryScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  const insets = useSafeAreaInsets();
  const { colors, spacing, borderWidth: bw, radii } = useTheme();

  const renderEvent = ({ item }: { item: HistoryEvent }) => {
    const variant = item.type === 'wasted' ? 'danger' : item.type === 'added' ? 'success' : 'warning';

    return (
      <Card style={{ marginBottom: spacing.md, borderRadius: radii.lg }}>
        <View style={styles.eventRow}>
          <View style={{ flex: 1 }}>
            <Text variant="body" weight="bold">
              {item.product}
            </Text>
            <Text variant="caption" color="textMuted" style={{ marginTop: 4 }}>
              {item.amount}
            </Text>
          </View>
          <Chip label={item.type.toUpperCase()} variant={variant} />
        </View>
        <Text variant="caption" color="textFaint" mono style={{ marginTop: spacing.md }}>
          {item.time}
        </Text>
      </Card>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}> 
      <View style={[styles.header, { paddingHorizontal: spacing.xl, paddingVertical: spacing.lg, borderBottomColor: colors.border, borderBottomWidth: bw.medium }]}> 
        <TouchableOpacity style={[styles.headerBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: bw.medium, borderRadius: radii.md }]} onPress={() => navigation.navigate('Main')}> 
          <Icon name="history" size={20} color="primary" />
        </TouchableOpacity>
        <Text variant="h3" weight="bold" uppercase>
          ACTIVITY
        </Text>
        <TouchableOpacity style={[styles.headerBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: bw.medium, borderRadius: radii.md }]} onPress={() => Alert.alert('Filters coming next', 'Sorting and filtering for activity history has not been wired yet.')}> 
          <Icon name="filter-variant" size={20} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={mockData}
        keyExtractor={(item) => item.id}
        renderItem={renderEvent}
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: insets.bottom + BOTTOM_NAV_CLEARANCE }}
        ListHeaderComponent={
          <View style={{ marginBottom: spacing.lg }}>
            <Text variant="label" color="primary" mono tracking="widest">
              SYSTEM LOG
            </Text>
            <Text variant="body" color="textMuted" style={{ marginTop: spacing.sm }}>
              Track what was consumed, added, or discarded across the household inventory.
            </Text>
          </View>
        }
      />

      <BottomNav active="activity" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
});
