import React, { useCallback, useMemo, useState } from 'react';
import { View, FlatList, TouchableOpacity, StyleSheet, Alert, Image } from 'react-native';
import { Text, BottomNav, Icon, Chip, Card } from '../components';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { RootNavigationProp } from '../navigation/types';
import { useTheme } from '../theme/ThemeProvider';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BOTTOM_NAV_CLEARANCE } from '../components/BottomNav';
import { MOCK_INVENTORY } from '../data/mockInventory';
import { inventoryRepo, type InventoryBatch } from '../services/InventoryRepository';
import { daysUntilExpiry, expiryLabel, expiryVariant } from '../utils/expiry';

const FILTERS = ['All', 'Expiring', 'Fresh', 'Low Stock'] as const;
type FilterLabel = typeof FILTERS[number];

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80';

function batchStatus(item: InventoryBatch) {
  const days = daysUntilExpiry(item.expiryDate);
  if (days !== null && days < 0) return 'expired';
  if (days !== null && days <= 3) return 'soon';
  return 'good';
}

export function InventoryHome() {
  const navigation = useNavigation<RootNavigationProp>();
  const insets = useSafeAreaInsets();
  const { colors, spacing, borderWidth: bw, radii } = useTheme();
  const [activeFilter, setActiveFilter] = useState<FilterLabel>('All');
  const [items, setItems] = useState<InventoryBatch[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      inventoryRepo.getBatches()
        .then((results) => {
          if (active) setItems(results);
        })
        .catch(() => {
          if (active) {
            setItems(MOCK_INVENTORY.map((item) => ({
              id: item.id,
              name: item.name,
              brand: item.brand,
              barcode: item.barcode,
              quantity: Number(item.quantityValue) || 1,
              unit: item.unit,
              category: item.category,
              expiryDate: item.expiryIso,
              imageUrl: item.imageUri,
              createdAt: new Date().toISOString(),
            })));
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [])
  );

  const filteredData = useMemo(() => {
    const byExpiry = (data: InventoryBatch[]) => [...data].sort((left, right) => {
      const leftTime = left.expiryDate ? new Date(`${left.expiryDate}T00:00:00`).getTime() : Number.MAX_SAFE_INTEGER;
      const rightTime = right.expiryDate ? new Date(`${right.expiryDate}T00:00:00`).getTime() : Number.MAX_SAFE_INTEGER;
      return leftTime - rightTime;
    });
    switch (activeFilter) {
      case 'Expiring':
        return byExpiry(items.filter((item) => batchStatus(item) === 'soon' || batchStatus(item) === 'expired'));
      case 'Fresh':
        return byExpiry(items.filter((item) => batchStatus(item) === 'good'));
      case 'Low Stock':
        return byExpiry(items.filter((item) => item.quantity <= 1));
      case 'All':
      default:
        return byExpiry(items);
    }
  }, [activeFilter, items]);

  const renderItem = ({ item }: { item: InventoryBatch }) => {
    const status = batchStatus(item);
    const daysLeft = daysUntilExpiry(item.expiryDate);
    const progress = status === 'expired' ? 0.18 : status === 'soon' ? 0.42 : 0.78;
    const accentColor = status === 'expired' ? colors.danger : status === 'soon' ? colors.warning : colors.success;
    const chipVariant = expiryVariant(item.expiryDate);

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
              <Image source={{ uri: item.imageUrl ?? PLACEHOLDER_IMAGE }} style={[styles.thumbImage, { borderRadius: radii.md }]} resizeMode="cover" />
            </View>

            <View style={{ flex: 1 }}>
              <Text variant="body" weight="bold" style={{ marginBottom: 4 }}>
                {item.name}
              </Text>
              <Text variant="caption" color="textMuted">
                {item.quantity} {item.unit} · {item.category ?? 'Unsorted'}
              </Text>
              <View style={{ marginTop: spacing.sm }}>
                <Chip
                  label={expiryLabel(item.expiryDate)}
                  variant={chipVariant}
                />
                {daysLeft !== null && (
                  <Text variant="caption" color="textFaint" mono style={{ marginTop: 4 }}>
                    {daysLeft < 0 ? `${Math.abs(daysLeft)} DAYS OVERDUE` : `${daysLeft} DAYS LEFT`}
                  </Text>
                )}
              </View>
            </View>

            <View style={{ alignItems: 'flex-end', justifyContent: 'space-between', minHeight: 68 }}>
              <TouchableOpacity onPress={() => navigation.navigate('EditBatch', { id: item.id })}>
                <Icon name="dots-vertical" size={18} color="textSubtle" />
              </TouchableOpacity>
              <Text variant="caption" color="textSubtle" mono>
                {item.expiryDate ?? 'No date'}
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
                    {loading ? 'Checking stock status.' : `${items.filter((item) => batchStatus(item) !== 'good' || item.quantity <= 1).length} items need attention.`}
                  </Text>
                  <Text variant="caption" color="textMuted" style={{ marginTop: 4 }}>
                    Review expiring, expired, and low-stock batches.
                  </Text>
                </View>
                <View style={[styles.alertBadge, { backgroundColor: colors.danger, borderRadius: radii.full }]}> 
                  <Text variant="label" color="surface" mono>
                    {String(items.filter((item) => batchStatus(item) !== 'good' || item.quantity <= 1).length).padStart(2, '0')}
                  </Text>
                </View>
              </View>
            </Card>

            <TouchableOpacity activeOpacity={0.88} onPress={() => navigation.navigate('MenuRecommendations')}>
              <Card elevated style={{ marginBottom: spacing.lg, borderRadius: radii.lg }}>
                <Text variant="label" color="primary" mono tracking="widest" style={{ marginBottom: spacing.xs }}>
                  AI MENU PICKS
                </Text>
                <Text variant="body" weight="bold">
                  Build tonight&apos;s meal from what you already have.
                </Text>
                <Text variant="caption" color="textMuted" style={{ marginTop: 4 }}>
                  Open recipe suggestions, ingredient amounts, and what is still missing.
                </Text>
                <View style={[styles.sectionHeader, { marginTop: spacing.md }]}> 
                  <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
                    <Chip label="AI POWERED" variant="warning" />
                    <Chip label="INGREDIENT MATCH" variant="default" />
                  </View>
                  <Icon name="arrow-right" size={20} color="primary" />
                </View>
              </Card>
            </TouchableOpacity>

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
