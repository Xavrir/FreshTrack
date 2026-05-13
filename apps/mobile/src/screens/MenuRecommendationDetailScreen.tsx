import React from 'react';
import { Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, Chip, Icon, Text } from '../components';
import { RootNavigationProp, RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/ThemeProvider';
import { SCREEN_EDGE_GUTTER } from '../theme/layout';
import { getFallbackMenuRecommendationById } from '../services/menuRecommendations';

export function MenuRecommendationDetailScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  const route = useRoute<RouteProp<RootStackParamList, 'MenuRecommendationDetail'>>();
  const insets = useSafeAreaInsets();
  const { colors, spacing, borderWidth: bw, radii } = useTheme();
  const menu = getFallbackMenuRecommendationById(route.params.id);

  if (!menu) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}> 
        <View style={[styles.center, { padding: spacing.xl }]}> 
          <Text variant="h2" weight="bold">Menu not found</Text>
          <Button variant="primary" style={{ marginTop: spacing.lg }} onPress={() => navigation.goBack()}>
            GO BACK
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={[styles.safe, { backgroundColor: colors.background }]}> 
      <View style={[styles.header, { borderBottomWidth: bw.medium, borderBottomColor: colors.border, paddingHorizontal: spacing.xl, paddingTop: Math.max(insets.top, spacing.sm), paddingBottom: spacing.md }]}> 
        <TouchableOpacity
          style={[styles.headerBtn, { borderWidth: bw.medium, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radii.md }]}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={20} />
        </TouchableOpacity>
        <Text variant="label" color="textSubtle" mono tracking="widest">
          MENU RECOMMENDATION
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.xl, paddingBottom: insets.bottom + SCREEN_EDGE_GUTTER + spacing.xxl }}>
        <Card elevated style={{ borderRadius: radii.lg, overflow: 'hidden', padding: 0, marginBottom: spacing.lg }}>
          <Image source={{ uri: menu.imageUri }} style={styles.heroImage} resizeMode="cover" />
          <View style={{ padding: spacing.lg }}>
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md, flexWrap: 'wrap' }}>
              <Chip label={menu.canCook ? 'CAN COOK' : 'ALMOST READY'} variant={menu.canCook ? 'success' : 'warning'} />
              <Chip label={menu.prepTime} variant="default" />
              <Chip label={menu.servings} variant="default" />
            </View>
            <Text variant="h1" weight="bold" uppercase>
              {menu.name}
            </Text>
            <Text variant="body" color="textMuted" style={{ marginTop: spacing.md }}>
              {menu.summary}
            </Text>
          </View>
        </Card>

        <Card style={{ borderRadius: radii.lg, marginBottom: spacing.md }}>
          <Text variant="label" color="primary" mono tracking="widest" style={{ marginBottom: spacing.md }}>
            INGREDIENT CHECKLIST
          </Text>
          <View style={{ gap: spacing.md }}>
            {menu.ingredients.map((ingredient) => (
              <View key={ingredient.name} style={[styles.ingredientRow, { backgroundColor: colors.backgroundAlt, borderColor: colors.border, borderWidth: bw.medium, borderRadius: radii.md, padding: spacing.md }]}> 
                <View style={{ flex: 1 }}>
                  <Text variant="body" weight="bold">
                    {ingredient.name}
                  </Text>
                  <Text variant="caption" color="textMuted" style={{ marginTop: spacing.xs }}>
                    Need {ingredient.quantity} · Have {ingredient.have}
                  </Text>
                </View>
                <Chip label={ingredient.status.toUpperCase()} variant={ingredient.status === 'enough' ? 'success' : ingredient.status === 'low' ? 'warning' : 'danger'} />
              </View>
            ))}
          </View>
        </Card>

        <Card style={{ borderRadius: radii.lg, marginBottom: spacing.md }}>
          <Text variant="label" color="primary" mono tracking="widest" style={{ marginBottom: spacing.md }}>
            COOKING FLOW
          </Text>
          <View style={{ gap: spacing.md }}>
            {menu.steps.map((step, index) => (
              <View key={step} style={styles.stepRow}>
                <View style={[styles.stepBadge, { backgroundColor: colors.primary, borderRadius: radii.full }]}> 
                  <Text variant="label" color="primaryText" mono>{index + 1}</Text>
                </View>
                <Text variant="body" color="textMuted" style={{ flex: 1 }}>
                  {step}
                </Text>
              </View>
            ))}
          </View>
        </Card>

        <Button variant="primary" block onPress={() => navigation.navigate('Main')}>
          BACK TO INVENTORY
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  heroImage: {
    width: '100%',
    height: 220,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepBadge: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
