import React, { useEffect, useMemo, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView, Alert, Image } from 'react-native';
import { Text, Button, TextInput, Chip, Icon, Card } from '../components';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList, RootNavigationProp } from '../navigation/types';
import { useTheme } from '../theme/ThemeProvider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { findMockInventoryByBarcode } from '../data/mockInventory';
import type { ProductDetectionDraft } from '../services/productDetection';
import { inventoryRepo } from '../services/InventoryRepository';
import { uploadInventoryImage } from '../services/imageUpload';

function compactStorageLocation(draft: ProductDetectionDraft | null) {
  if (!draft) return '';
  return [draft.storage, draft.storageDetail].filter(Boolean).join(' / ');
}

function draftFromBarcodeFallback(barcode?: string): ProductDetectionDraft | null {
  const matchedItem = findMockInventoryByBarcode(barcode);
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
}

function mergeDrafts(fallback: ProductDetectionDraft | null, detected?: ProductDetectionDraft | null): ProductDetectionDraft | null {
  if (!fallback) return detected ?? null;
  if (!detected) return fallback;

  return {
    ...fallback,
    ...detected,
    name: detected.name || fallback.name,
    brand: detected.brand || fallback.brand,
    quantityValue: detected.quantityValue || fallback.quantityValue,
    unit: detected.unit || fallback.unit,
    category: detected.category || fallback.category,
    storage: detected.storage || fallback.storage,
    storageDetail: detected.storageDetail || fallback.storageDetail,
    expiryIso: detected.expiryIso || fallback.expiryIso,
    imageUri: detected.imageUri || fallback.imageUri,
    notes: detected.notes || fallback.notes,
    sources: Array.from(new Set([...(detected.sources ?? []), ...(fallback.sources ?? [])])),
  };
}

export function AddBatchScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  const route = useRoute<RouteProp<RootStackParamList, 'AddBatch'>>();
  const { colors, spacing, borderWidth: bw, radii } = useTheme();
  const barcode = route.params?.barcode;
  const capturedImageUri = route.params?.imageUri;
  const aiDetection = route.params?.aiDetection;
  const isPhotoCaptureFlow = !!capturedImageUri && !barcode;

  const initialDraft = useMemo<ProductDetectionDraft | null>(() => {
    return mergeDrafts(draftFromBarcodeFallback(barcode), aiDetection);
  }, [aiDetection, barcode]);

  const [name, setName] = useState(initialDraft?.name ?? '');
  const [brand, setBrand] = useState(initialDraft?.brand ?? '');
  const [quantity, setQuantity] = useState(initialDraft?.quantityValue ?? '');
  const [unit, setUnit] = useState(initialDraft?.unit ?? '');
  const [expiryDate, setExpiryDate] = useState(initialDraft?.expiryIso ?? '');
  const [category, setCategory] = useState(initialDraft?.category ?? '');
  const [storageLocation, setStorageLocation] = useState(compactStorageLocation(initialDraft));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(initialDraft?.name ?? '');
    setBrand(initialDraft?.brand ?? '');
    setQuantity(initialDraft?.quantityValue ?? '');
    setUnit(initialDraft?.unit ?? '');
    setExpiryDate(initialDraft?.expiryIso ?? '');
    setCategory(initialDraft?.category ?? '');
    setStorageLocation(compactStorageLocation(initialDraft));
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

        {isPhotoCaptureFlow && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg }}>
            <Chip label="AI IDENTIFIED" variant="success" />
            <Text variant="caption" color="textMuted" mono>
              PHOTO CAPTURED
            </Text>
          </View>
        )}

        <Card elevated style={{ borderRadius: radii.lg, marginBottom: spacing.lg }}>
          <TouchableOpacity activeOpacity={0.88} onPress={() => Alert.alert('Photo upload next', 'The product photo flow is the next frontend piece to wire after the inventory data integration pass.') }>
            <View style={[styles.captureArea, { borderRadius: radii.md, backgroundColor: colors.backgroundAlt, borderWidth: bw.medium, borderColor: colors.border }]}> 
              {capturedImageUri || initialDraft?.imageUri ? (
                <Image source={{ uri: capturedImageUri ?? initialDraft?.imageUri }} style={[styles.captureImage, { borderRadius: radii.md }]} resizeMode="cover" />
              ) : (
                <View style={[styles.cameraIcon, { borderRadius: radii.full, backgroundColor: colors.surface, borderWidth: bw.medium, borderColor: colors.border }]}> 
                  <Icon name="camera-plus-outline" size={24} color="primary" />
                </View>
              )}
              <Text variant="body" weight="bold">
                {capturedImageUri ? 'Captured item photo ready' : initialDraft?.imageUri ? 'Product photo captured' : 'Upload product photo'}
              </Text>
              <Text variant="caption" color="textMuted" align="center">
                {aiDetection
                  ? `AI confidence ${(aiDetection.confidence ?? 0) * 100 >> 0}% · review before saving.`
                  : capturedImageUri
                    ? 'Using the captured photo while AI item recognition is still in phase-one preview.'
                    : initialDraft?.imageUri
                    ? 'Using captured photo for this item.'
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
            placeholder="e.g. Organic Strawberries"
            value={name}
            onChangeText={setName}
          />

          <TextInput
            label="BRAND"
            placeholder="e.g. Fresh Farms"
            value={brand}
            onChangeText={setBrand}
          />

          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <TextInput label="QUANTITY" placeholder="e.g. 450" keyboardType="numeric" style={{ flex: 1 }} mono value={quantity} onChangeText={setQuantity} />
            <TextInput label="UNIT" placeholder="e.g. grams" style={{ flex: 1 }} value={unit} onChangeText={setUnit} />
          </View>

          <TextInput label="EXPIRY DATE" placeholder="YYYY-MM-DD" mono value={expiryDate} onChangeText={setExpiryDate} />
          <TextInput label="CATEGORY" placeholder="e.g. Produce" value={category} onChangeText={setCategory} />
          <TextInput label="STORAGE LOCATION" placeholder="e.g. Main fridge / Shelf 2" value={storageLocation} onChangeText={setStorageLocation} helperText={initialDraft?.sources?.length ? `Sources: ${initialDraft.sources.join(', ')}` : undefined} />
        </Card>

        <Button
          variant="primary"
          block
          size="lg"
          onPress={async () => {
            const trimmedExpiryDate = expiryDate.trim();
            const trimmedQuantity = quantity.trim();
            const parsedQuantity = trimmedQuantity ? Number(trimmedQuantity) : 1;
            if (!name.trim()) {
              Alert.alert('Missing item name', 'Enter an item name before saving.');
              return;
            }
            if (!trimmedExpiryDate) {
              Alert.alert('Missing expiry date', 'Enter an expiry date before saving.');
              return;
            }
            if (!Number.isFinite(parsedQuantity) || parsedQuantity < 0) {
              Alert.alert('Invalid quantity', 'Enter a valid quantity before saving.');
              return;
            }
            setSaving(true);
            try {
              const [storage, storageDetail] = storageLocation.split('/').map((part) => part.trim());
              const localImage = capturedImageUri ?? initialDraft?.imageUri;
              // Persist the photo to object storage when configured; otherwise keep
              // the local URI (client-only image, current MVP behavior).
              const uploadedImage = await uploadInventoryImage(localImage);
              await inventoryRepo.addBatch({
                name: name.trim(),
                brand: brand.trim() || undefined,
                barcode,
                quantity: parsedQuantity,
                unit: unit.trim() || 'pcs',
                category: category.trim() || undefined,
                storage: storage || undefined,
                storageDetail: storageDetail || undefined,
                expiryDate: trimmedExpiryDate,
                imageUrl: uploadedImage ?? localImage,
                notes: initialDraft?.notes,
              });
              navigation.navigate('Main');
            } catch (error) {
              Alert.alert('Could not save item', error instanceof Error ? error.message : 'Please try again.');
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? 'SAVING…' : 'SAVE TO LOG'}
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
