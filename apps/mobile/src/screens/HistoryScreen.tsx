import React, { useCallback, useMemo, useState } from 'react';
import { View, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Text, BottomNav, Icon, Card, Chip } from '../components';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { RootNavigationProp } from '../navigation/types';
import { useTheme } from '../theme/ThemeProvider';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BOTTOM_NAV_CLEARANCE } from '../components/BottomNav';
import { inventoryRepo, type InventoryBatch, type InventoryEvent } from '../services/InventoryRepository';

function eventLabel(type: InventoryEvent['type']) {
  return type === 'created' ? 'ADDED' : type.toUpperCase();
}

function eventVariant(type: InventoryEvent['type']) {
  if (type === 'wasted' || type === 'deleted') return 'danger';
  if (type === 'created') return 'success';
  return 'warning';
}

export function HistoryScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  const insets = useSafeAreaInsets();
  const { colors, spacing, borderWidth: bw, radii } = useTheme();
  const [events, setEvents] = useState<InventoryEvent[]>([]);
  const [items, setItems] = useState<InventoryBatch[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      Promise.all([inventoryRepo.getHistory(), inventoryRepo.getBatches().catch(() => [])])
        .then(([history, batches]) => {
          if (!active) return;
          setEvents(history);
          setItems(batches);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [])
  );

  const itemNames = useMemo(() => new Map(items.map((item) => [item.id, item.name])), [items]);

  const renderEvent = ({ item }: { item: InventoryEvent }) => {
    const amount = item.amount === undefined ? 'No quantity change' : `${item.amount} ${item.unit ?? ''}`.trim();
    const product = item.batchName ?? itemNames.get(item.batchId) ?? 'Inventory item';
    return (
      <Card style={{ marginBottom: spacing.md, borderRadius: radii.lg }}>
        <View style={styles.eventRow}>
          <View style={{ flex: 1 }}>
            <Text variant="body" weight="bold">
              {product}
            </Text>
            <Text variant="caption" color="textMuted" style={{ marginTop: 4 }}>
              {amount}
            </Text>
          </View>
          <Chip label={eventLabel(item.type)} variant={eventVariant(item.type)} />
        </View>
        <Text variant="caption" color="textFaint" mono style={{ marginTop: spacing.md }}>
          {new Date(item.createdAt).toLocaleString().toUpperCase()}
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
        <TouchableOpacity style={[styles.headerBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: bw.medium, borderRadius: radii.md }]} onPress={() => navigation.navigate('Main')}>
          <Icon name="filter-variant" size={20} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={renderEvent}
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: insets.bottom + BOTTOM_NAV_CLEARANCE }}
        ListEmptyComponent={
          <Card style={{ borderRadius: radii.lg }}>
            <Text variant="body" weight="bold">
              {loading ? 'Loading activity...' : 'No activity yet'}
            </Text>
            <Text variant="caption" color="textMuted" style={{ marginTop: spacing.sm }}>
              Add, edit, consume, waste, or delete inventory to build the household log.
            </Text>
          </Card>
        }
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
