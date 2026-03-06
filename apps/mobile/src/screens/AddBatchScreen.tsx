import React, { useEffect, useMemo, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView, Alert, Image } from 'react-native';
import { Text, Button, TextInput, Chip, Icon, Card } from '../components';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList, RootNavigationProp } from '../navigation/types';
import { useTheme } from '../theme/ThemeProvider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { findMockInventoryByBarcode } from '../data/mockInventory';
import type { ProductDetectionDraft } from '../services/productDetection';

export function AddBatchScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  const route = useRoute<RouteProp<RootStackParamList, 'AddBatch'>>();
  const { colors, spacing, borderWidth: bw, radii } = useTheme();
  const barcode = route.params?.barcode;
  const matchedItem = findMockInventoryByBarcode(barcode);
  const aiDetection = route.params?.aiDetection;

  const initialDraft = useMemo<ProductDetectionDraft | null>(() => {
    if (aiDetection) return aiDetection;
    if (!matchedItem) return null;
    return {
      barcode,
      name: matchedItem.name,
      brand: matchedItem.brand,
      quantityValue: matchedItem.quantityValue,
      unit: matchedItem.unit,
      category: matchedItem.category,
      storage: matchedItem.storage,
      storageDetail: matchedItem.storageDetail,
      expiryIso: matchedItem.expiryIso,
      imageUri: matchedItem.imageUri,
      notes: matchedItem.note,
      confidence: 0.85,
      sources: ['barcode-match'],
    };
  }, [aiDetection, barcode, matchedItem]);

  const [name, setName] = useState(initialDraft?.name ?? '');
  const [brand, setBrand] = useState(initialDraft?.brand ?? '');
  const [quantity, setQuantity] = useState(initialDraft?.quantityValue ?? '');
  const [unit, setUnit] = useState(initialDraft?.unit ?? '');
  const [expiryDate, setExpiryDate] = useState(initialDraft?.expiryIso ?? '');
  const [category, setCategory] = useState(initialDraft?.category ?? '');
  const [storageLocation, setStorageLocation] = useState(
    initialDraft ? [initialDraft.storage, initialDraft.storageDetail].filter(Boolean).join(' / ') : ''
  );

  useEffect(() => {
    setName(initialDraft?.name ?? '');
    setBrand(initialDraft?.brand ?? '');
    setQuantity(initialDraft?.quantityValue ?? '');
    setUnit(initialDraft?.unit ?? '');
    setExpiryDate(initialDraft?.expiryIso ?? '');
    setCategory(initialDraft?.category ?? '');
    setStorageLocation(initialDraft ? [initialDraft.storage, initialDraft.storageDetail].filter(Boolean).join(' / ') : '');
  }, [initialDraft]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}> 
      <View
        style={[
          styles.header,
          {
            borderBottomWidth: bw.medium,
            borderBottomColor: colors.border,
            paddingHorizontal: spacing.xl,
            paddingVertical: spacing.lg,
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
          ADD ITEM LOG
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing['4xl'] }}>
        {barcode && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg }}>
            <Chip label="SCANNED" variant="warning" />
            {aiDetection && <Chip label="AI PREFILL" variant="success" />}
            <Text variant="caption" color="textMuted" mono>
              {barcode}
            </Text>
          </View>
        )}

        <Card elevated style={{ borderRadius: radii.lg, marginBottom: spacing.lg }}>
          <TouchableOpacity activeOpacity={0.88} onPress={() => Alert.alert('Photo upload next', 'The product photo flow is the next frontend piece to wire after the inventory data integration pass.') }>
            <View style={[styles.captureArea, { borderRadius: radii.md, backgroundColor: colors.backgroundAlt, borderWidth: bw.medium, borderColor: colors.border }]}> 
              {matchedItem ? (
                <Image source={{ uri: aiDetection?.imageUri ?? matchedItem.imageUri }} style={[styles.captureImage, { borderRadius: radii.md }]} resizeMode="cover" />
              ) : (
                <View style={[styles.cameraIcon, { borderRadius: radii.full, backgroundColor: colors.surface, borderWidth: bw.medium, borderColor: colors.border }]}> 
                  <Icon name="camera-plus-outline" size={24} color="primary" />
                </View>
              )}
              <Text variant="body" weight="bold">
                {initialDraft?.imageUri ? 'AI product preview loaded' : matchedItem ? 'Photo matched from barcode' : 'Upload product photo'}
              </Text>
              <Text variant="caption" color="textMuted" align="center">
                {aiDetection
                  ? `AI confidence ${(aiDetection.confidence ?? 0) * 100 >> 0}% · review before saving.`
                  : matchedItem
                    ? 'Using a preview image for the scanned product.'
                    : 'Capture a quick label photo to help identify the item later.'}
              </Text>
            </View>
          </TouchableOpacity>
        </Card>

        <Card elevated style={{ borderRadius: radii.lg, marginBottom: spacing.lg }}>
          <Text variant="label" color="primary" mono tracking="widest" style={{ marginBottom: spacing.lg }}>
            ITEM ATTRIBUTES
          </Text>

          <TextInput
            label="ITEM NAME"
            placeholder="Organic Strawberries"
            value={name}
            onChangeText={setName}
          />

          <TextInput
            label="BRAND"
            placeholder="Fresh Farms"
            value={brand}
            onChangeText={setBrand}
          />

          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <TextInput label="QUANTITY" placeholder={matchedItem?.quantityValue ?? '450'} keyboardType="numeric" style={{ flex: 1 }} mono value={quantity} onChangeText={setQuantity} />
            <TextInput label="UNIT" placeholder={matchedItem?.unit ?? 'grams'} style={{ flex: 1 }} value={unit} onChangeText={setUnit} />
          </View>

          <TextInput label="EXPIRY DATE" placeholder={matchedItem?.expiryIso ?? '2026-10-24'} mono value={expiryDate} onChangeText={setExpiryDate} />
          <TextInput label="CATEGORY" placeholder={matchedItem?.category ?? 'Produce'} value={category} onChangeText={setCategory} />
          <TextInput label="STORAGE LOCATION" placeholder={matchedItem ? `${matchedItem.storage} / ${matchedItem.storageDetail}` : 'Main fridge / Shelf 2'} value={storageLocation} onChangeText={setStorageLocation} helperText={aiDetection?.sources?.length ? `Sources: ${aiDetection.sources.join(', ')}` : undefined} />
        </Card>

        <Button
          variant="primary"
          block
          size="lg"
          onPress={() => navigation.goBack()}
        >
          SAVE TO LOG
        </Button>
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
  captureArea: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 20,
    overflow: 'hidden',
  },
  cameraIcon: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureImage: {
    width: '100%',
    height: 132,
  },
});
