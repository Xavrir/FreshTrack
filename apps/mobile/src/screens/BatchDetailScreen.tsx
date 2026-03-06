import React from 'react';
import { View, TouchableOpacity, ScrollView, StyleSheet, Image } from 'react-native';
import { Text, Button, Icon, Card, Chip } from '../components';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootNavigationProp, RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/ThemeProvider';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { SCREEN_EDGE_GUTTER } from '../theme/layout';
import { getMockInventoryItem } from '../data/mockInventory';

export function BatchDetailScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  const route = useRoute<RouteProp<RootStackParamList, 'BatchDetail'>>();
  const insets = useSafeAreaInsets();
  const { colors, spacing, borderWidth: bw, radii } = useTheme();
  const item = getMockInventoryItem(route.params?.id);
  const daysLeftLabel = item.status === 'expired' ? 'EXPIRED' : `${item.daysLeft} DAYS LEFT`;

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={[styles.safe, { backgroundColor: colors.background }]}> 
      <View
        style={[
          styles.header,
          {
            borderBottomWidth: bw.medium,
            borderBottomColor: colors.border,
            paddingHorizontal: spacing.xl,
            paddingTop: Math.max(insets.top, spacing.sm),
            paddingBottom: spacing.md,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.headerBtn, { borderWidth: bw.medium, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radii.md }]}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={20} />
        </TouchableOpacity>
        <Text variant="label" color="textSubtle" mono tracking="widest">
          INVENTORY TRACKER
        </Text>
        <TouchableOpacity
          style={[styles.headerBtn, { borderWidth: bw.medium, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radii.md }]}
          onPress={() => navigation.navigate('EditBatch', { id: route.params?.id ?? '1' })}
        >
          <Icon name="dots-vertical" size={18} />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.xl, paddingBottom: insets.bottom + SCREEN_EDGE_GUTTER + spacing.xxl }}>
        <View
          style={[
            styles.hero,
            {
              borderRadius: radii.lg,
              borderWidth: bw.medium,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              marginBottom: spacing.xl,
            },
          ]}
        >
          <Chip label="PREMIUM PRODUCE" variant="warning" style={{ alignSelf: 'flex-start', marginBottom: spacing.lg }} />
          <View style={[styles.heroImage, { backgroundColor: colors.surfaceMuted, borderRadius: radii.md, marginBottom: spacing.lg }]}>
            <Image source={{ uri: item.imageUri }} style={[styles.heroPhoto, { borderRadius: radii.md }]} resizeMode="cover" />
          </View>
          <Text variant="h1" weight="bold" uppercase>
            {item.name.toUpperCase()}
          </Text>
          <View style={[styles.noteRow, { marginTop: spacing.md }]}> 
            <View style={[styles.noteLine, { backgroundColor: colors.primary }]} />
              <Text variant="body" color="textMuted" style={{ flex: 1 }}>
                {item.note}
              </Text>
          </View>
        </View>

        <Card elevated style={{ marginBottom: spacing.md, borderRadius: radii.lg }}>
          <Text variant="label" color="primary" mono tracking="widest" style={{ marginBottom: spacing.sm }}>
            QUANTITY REMAINING
          </Text>
          <View style={styles.quantityRow}>
            <Text variant="display" weight="bold">
              {item.quantityValue}
            </Text>
            <Text variant="h3" color="textMuted" mono>
              {item.unit.toUpperCase()}
            </Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.backgroundAlt, borderRadius: radii.full, marginTop: spacing.lg }]}>
            <View style={[styles.progressFill, { backgroundColor: colors.primary, borderRadius: radii.full, width: '58%' }]} />
          </View>
        </Card>

        <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md }}>
          <Card style={{ flex: 1, borderRadius: radii.lg }}>
            <Icon name="calendar-month-outline" size={18} color="primary" />
            <Text variant="label" color="textSubtle" mono tracking="widest" style={{ marginTop: spacing.md }}>
              EXPIRY DATE
            </Text>
            <Text variant="h2" weight="bold" style={{ marginTop: spacing.xs }}>
              {item.expiry.toUpperCase()}
            </Text>
            <Text variant="caption" color="danger" mono style={{ marginTop: spacing.sm }}>
              {daysLeftLabel}
            </Text>
          </Card>

          <Card style={{ flex: 1, borderRadius: radii.lg }}>
            <Icon name="snowflake-variant" size={18} color="primary" />
            <Text variant="label" color="textSubtle" mono tracking="widest" style={{ marginTop: spacing.md }}>
              STORAGE
            </Text>
            <Text variant="h2" weight="bold" style={{ marginTop: spacing.xs }}>
              {item.storage.toUpperCase()}
            </Text>
            <Text variant="caption" color="textMuted" mono style={{ marginTop: spacing.sm }}>
              {item.storageDetail.toUpperCase()}
            </Text>
          </Card>
        </View>

        <View style={{ marginTop: spacing.lg, marginBottom: spacing.md }}>
          <Text variant="caption" color="textFaint" mono tracking="widest">
            ADDED TO INVENTORY
          </Text>
          <Text variant="body" color="textMuted" style={{ marginTop: 4 }}>
            {item.addedAt.toUpperCase()}
          </Text>
        </View>

        <View style={{ gap: spacing.md }}>
          <Button
            variant="primary"
            block
            size="lg"
            onPress={() => navigation.navigate('ConsumeWaste', { id: route.params?.id ?? '1' })}
          >
            MARK CONSUMED
          </Button>
          <Button
            variant="danger"
            block
            size="lg"
            onPress={() => navigation.navigate('ConsumeWaste', { id: route.params?.id ?? '1' })}
          >
            MARK WASTED
          </Button>
        </View>
      </ScrollView>
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
  hero: {
    padding: 20,
  },
  heroImage: {
    height: 220,
    overflow: 'hidden',
  },
  heroPhoto: {
    width: '100%',
    height: '100%',
  },
  noteRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'stretch',
  },
  noteLine: {
    width: 3,
    borderRadius: 999,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  progressTrack: {
    height: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
});
