import React from 'react';
import { FlatList, Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { BottomNav, Card, Chip, Icon, Text } from '../components';
import { RootNavigationProp } from '../navigation/types';
import { useTheme } from '../theme/ThemeProvider';
import { BOTTOM_NAV_CLEARANCE } from '../components/BottomNav';
import { useHousehold } from '../providers/HouseholdProvider';
import { MOCK_INVENTORY } from '../data/mockInventory';
import { recommendMenus, type MenuRecommendation } from '../services/menuRecommendations';

export function MenuRecommendationsScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  const insets = useSafeAreaInsets();
  const { household } = useHousehold();
  const { colors, spacing, borderWidth: bw, radii } = useTheme();
  const [menus, setMenus] = React.useState<MenuRecommendation[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    void recommendMenus({ householdId: household?.id, inventory: MOCK_INVENTORY }).then((results) => {
      if (!active) return;
      setMenus(results);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [household?.id]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}> 
      <View style={[styles.header, { paddingHorizontal: spacing.xl, paddingTop: spacing.md }]}> 
        <View>
          <Text variant="caption" color="textSubtle" mono tracking="widest">
            AI MENU ENGINE
          </Text>
          <Text variant="h1" weight="bold" uppercase style={{ marginTop: 4 }}>
            MENU PICKS
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: bw.medium, borderRadius: radii.md }]}
          onPress={() => navigation.navigate('Main')}
        >
          <Icon name="arrow-left" size={20} color="primary" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={menus}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: insets.bottom + BOTTOM_NAV_CLEARANCE }}
        ListHeaderComponent={
          <Card elevated style={{ marginBottom: spacing.lg, borderRadius: radii.lg }}>
            <Text variant="label" color="primary" mono tracking="widest" style={{ marginBottom: spacing.sm }}>
              BASED ON CURRENT STOCK
            </Text>
            <Text variant="body" color="textMuted">
              FreshTrack reviews your available pantry items and suggests dishes you can cook now or nearly cook with minimal shopping.
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, flexWrap: 'wrap' }}>
              <Chip label={`${MOCK_INVENTORY.length} ITEMS SCANNED`} variant="warning" />
              <Chip label={loading ? 'ANALYZING' : `${menus.length} MENUS READY`} variant={loading ? 'default' : 'success'} />
            </View>
          </Card>
        }
        renderItem={({ item }) => (
          <TouchableOpacity activeOpacity={0.88} onPress={() => navigation.navigate('MenuRecommendationDetail', { id: item.id })}>
            <Card elevated style={{ marginBottom: spacing.md, borderRadius: radii.lg, overflow: 'hidden', padding: 0 }}>
              <Image source={{ uri: item.imageUri }} style={styles.heroImage} resizeMode="cover" />
              <View style={{ padding: spacing.lg }}>
                <View style={[styles.rowBetween, { marginBottom: spacing.md }]}> 
                  <Chip label={item.canCook ? 'CAN COOK' : 'ALMOST READY'} variant={item.canCook ? 'success' : 'warning'} />
                  <Text variant="caption" color="textMuted" mono>
                    {item.matchScore}% MATCH
                  </Text>
                </View>
                <Text variant="h2" weight="bold" uppercase>
                  {item.name}
                </Text>
                <Text variant="body" color="textMuted" style={{ marginTop: spacing.sm }}>
                  {item.description}
                </Text>
                <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, flexWrap: 'wrap' }}>
                  <Chip label={item.prepTime} variant="default" />
                  <Chip label={item.servings} variant="default" />
                  <Chip label={item.difficulty.toUpperCase()} variant="default" />
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        )}
      />

      <BottomNav active="stock" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
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
  heroImage: {
    width: '100%',
    height: 190,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
