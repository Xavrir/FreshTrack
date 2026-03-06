import React, { useMemo, useState } from 'react';
import { View, FlatList, TouchableOpacity, StyleSheet, Alert, Image } from 'react-native';
import { Text, BottomNav, Icon, Chip, Card } from '../components';
import { useNavigation } from '@react-navigation/native';
import { RootNavigationProp } from '../navigation/types';
import { useTheme } from '../theme/ThemeProvider';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BOTTOM_NAV_CLEARANCE } from '../components/BottomNav';
import { MOCK_INVENTORY, MockInventoryItem } from '../data/mockInventory';

const FILTERS = ['All', 'Expiring', 'Fresh', 'Low Stock'] as const;
type FilterLabel = typeof FILTERS[number];

export function InventoryHome() {
  const navigation = useNavigation<RootNavigationProp>();
  const insets = useSafeAreaInsets();
  const { colors, spacing, borderWidth: bw, radii } = useTheme();
  const [activeFilter, setActiveFilter] = useState<FilterLabel>('All');

  const filteredData = useMemo(() => {
    switch (activeFilter) {
      case 'Expiring':
        return MOCK_INVENTORY.filter((item) => item.status === 'soon' || item.status === 'expired');
      case 'Fresh':
        return MOCK_INVENTORY.filter((item) => item.status === 'good');
      case 'Low Stock':
        return MOCK_INVENTORY.filter((item) => item.isLowStock);
      case 'All':
      default:
        return MOCK_INVENTORY;
    }
  }, [activeFilter]);

  const renderItem = ({ item }: { item: MockInventoryItem }) => {
    const progress = item.status === 'expired' ? 0.18 : item.status === 'soon' ? 0.42 : 0.78;
    const accentColor = item.status === 'expired' ? colors.danger : item.status === 'soon' ? colors.warning : colors.success;
    const chipVariant = item.status === 'expired' ? 'danger' : item.status === 'soon' ? 'warning' : 'success';

    return (
      <TouchableOpacity activeOpacity={0.88} onPress={() => navigation.navigate('BatchDetail', { id: item.id })}>
        <Card elevated style={{ marginBottom: spacing.md, padding: spacing.md, borderRadius: radii.lg }}>
          <View style={styles.itemRow}>
            <View
              style={[
                styles.thumb,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderRadius: radii.md,
                  borderWidth: bw.medium,
                  borderColor: colors.border,
                },
              ]}
            >
              <Image source={{ uri: item.imageUri }} style={[styles.thumbImage, { borderRadius: radii.md }]} resizeMode="cover" />
            </View>

            <View style={{ flex: 1 }}>
              <Text variant="body" weight="bold" style={{ marginBottom: 4 }}>
                {item.name}
              </Text>
              <Text variant="caption" color="textMuted">
                {item.qtyLabel} · {item.category}
              </Text>
              <View style={{ marginTop: spacing.sm }}>
                <Chip
                  label={item.status === 'expired' ? 'EXPIRED' : `${item.daysLeft} DAYS LEFT`}
                  variant={chipVariant}
                />
              </View>
            </View>

            <View style={{ alignItems: 'flex-end', justifyContent: 'space-between', minHeight: 68 }}>
              <TouchableOpacity onPress={() => navigation.navigate('EditBatch', { id: item.id })}>
                <Icon name="dots-vertical" size={18} color="textSubtle" />
              </TouchableOpacity>
              <Text variant="caption" color="textSubtle" mono>
                {item.expiry}
              </Text>
            </View>
          </View>

          <View style={[styles.progressTrack, { backgroundColor: colors.backgroundAlt, borderRadius: radii.full, marginTop: spacing.md }]}>
            <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: accentColor, borderRadius: radii.full }]} />
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}> 
      <View style={[styles.header, { paddingHorizontal: spacing.xl, paddingTop: spacing.md }]}> 
        <View>
          <Text variant="caption" color="textSubtle" mono tracking="widest">
            HOUSEHOLD INVENTORY
          </Text>
          <Text variant="h1" weight="bold" uppercase style={{ marginTop: 4 }}>
            FRESHTRACK
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: bw.medium, borderRadius: radii.md }]}
          onPress={() => navigation.navigate('History')}
        >
          <Icon name="bell-outline" size={20} color="primary" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: insets.bottom + BOTTOM_NAV_CLEARANCE }}
        ListHeaderComponent={
          <>
            <View
              style={[
                styles.searchBar,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderWidth: bw.medium,
                  borderRadius: radii.md,
                  marginBottom: spacing.md,
                },
              ]}
            >
              <Icon name="magnify" size={18} color="textSubtle" />
              <Text variant="body" color="textSubtle">
                Search pantry items
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md, flexWrap: 'wrap' }}>
              {FILTERS.map((filter) => {
                const isActive = filter === activeFilter;
                return (
                  <TouchableOpacity key={filter} onPress={() => setActiveFilter(filter)} activeOpacity={0.8}>
                    <Chip label={filter} variant={isActive ? 'warning' : 'default'} />
                  </TouchableOpacity>
                );
              })}
            </View>

            <Card style={{ marginBottom: spacing.lg, borderRadius: radii.lg }}>
              <View style={styles.alertRow}>
                <View>
                  <Text variant="label" color="danger" mono tracking="widest" style={{ marginBottom: spacing.xs }}>
                    LOW STOCK ALERT
                  </Text>
                  <Text variant="body" weight="bold">
                    Strawberries and yogurt need attention.
                  </Text>
                  <Text variant="caption" color="textMuted" style={{ marginTop: 4 }}>
                    2 items are within the next 48 hours.
                  </Text>
                </View>
                <View style={[styles.alertBadge, { backgroundColor: colors.danger, borderRadius: radii.full }]}> 
                  <Text variant="label" color="surface" mono>
                    02
                  </Text>
                </View>
              </View>
            </Card>

            <View style={[styles.sectionHeader, { marginBottom: spacing.md }]}> 
              <Text variant="label" color="primary" mono tracking="widest">
                RECENT STOCK
              </Text>
              <TouchableOpacity onPress={() => Alert.alert('All inventory visible', 'This dashboard is already showing your full current stock list.') }>
                <Text variant="label" color="textMuted" mono tracking="wider">
                  VIEW ALL
                </Text>
              </TouchableOpacity>
            </View>
          </>
        }
      />

      <BottomNav active="stock" />
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
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemRow: {
    flexDirection: 'row',
    gap: 12,
  },
  thumb: {
    width: 64,
    height: 64,
    overflow: 'hidden',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  progressTrack: {
    height: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  alertRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  alertBadge: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
