import React, { useCallback, useState } from 'react';
import { View, Alert, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native';
import { Text, Button, TextInput, Icon, Card } from '../components';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootNavigationProp, RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/ThemeProvider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { inventoryRepo, type InventoryBatch } from '../services/InventoryRepository';

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80';

export function EditBatchScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  const route = useRoute<RouteProp<RootStackParamList, 'EditBatch'>>();
  const { colors, spacing, borderWidth: bw, radii } = useTheme();
  const [record, setRecord] = useState<InventoryBatch | null>(null);
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('');
  const [expiry, setExpiry] = useState('');
  const [category, setCategory] = useState('');
  const [storageLocation, setStorageLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      inventoryRepo.getBatch(route.params.id).then((batch) => {
        if (!active || !batch) return;
        setRecord(batch);
        setName(batch.name);
        setBrand(batch.brand ?? '');
        setQty(String(batch.quantity));
        setUnit(batch.unit);
        setExpiry(batch.expiryDate ?? '');
        setCategory(batch.category ?? '');
        setStorageLocation([batch.storage, batch.storageDetail].filter(Boolean).join(' / '));
        setNotes(batch.notes ?? '');
      });
      return () => {
        active = false;
      };
    }, [route.params.id])
  );

  const handleDelete = () => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this item? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await inventoryRepo.deleteBatch(route.params.id);
              navigation.navigate('Main');
            } catch (error) {
              Alert.alert('Could not delete item', error instanceof Error ? error.message : 'Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    const parsedQuantity = qty.trim() ? Number(qty.trim()) : 1;
    if (!name.trim()) {
      Alert.alert('Missing item name', 'Enter an item name before saving.');
      return;
    }
    if (!expiry.trim()) {
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
      await inventoryRepo.updateBatch(route.params.id, {
        name: name.trim(),
        brand: brand.trim() || undefined,
        barcode: record?.barcode,
        quantity: parsedQuantity,
        unit: unit.trim() || 'pcs',
        category: category.trim() || undefined,
        storage: storage || undefined,
        storageDetail: storageDetail || undefined,
        expiryDate: expiry.trim(),
        imageUrl: record?.imageUrl,
        notes: notes.trim() || undefined,
      });
      navigation.navigate('BatchDetail', { id: route.params.id });
    } catch (error) {
      Alert.alert('Could not save item', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!record) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.emptyState}>
          <Text variant="h2" weight="bold" uppercase>
            Loading Item
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}> 
      <View style={[styles.header, { borderBottomWidth: bw.medium, borderBottomColor: colors.border, paddingHorizontal: spacing.xl, paddingVertical: spacing.lg }]}> 
        <TouchableOpacity
          style={[styles.headerBtn, { borderWidth: bw.medium, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radii.md }]}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={20} />
        </TouchableOpacity>
        <Text variant="label" color="textSubtle" mono tracking="widest">
          EDIT ITEM
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing['4xl'] }}>
        <Card elevated style={{ borderRadius: radii.lg, marginBottom: spacing.lg }}>
          <Text variant="label" color="primary" mono tracking="widest" style={{ marginBottom: spacing.lg }}>
            PRODUCT INFO
          </Text>
          <View style={[styles.previewShell, { backgroundColor: colors.backgroundAlt, borderRadius: radii.md, borderWidth: bw.medium, borderColor: colors.border }]}> 
            <Image source={{ uri: record.imageUrl ?? PLACEHOLDER_IMAGE }} style={[styles.previewImage, { borderRadius: radii.md }]} resizeMode="cover" />
          </View>
          <TextInput label="NAME" placeholder="e.g. Susu UHT" value={name} onChangeText={setName} />
          <TextInput label="BRAND" placeholder="e.g. Indofood" value={brand} onChangeText={setBrand} />

          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <TextInput label="QTY" placeholder="1" keyboardType="numeric" value={qty} onChangeText={setQty} style={{ flex: 1 }} mono />
            <TextInput label="UNIT" placeholder="pcs" value={unit} onChangeText={setUnit} style={{ flex: 1 }} />
          </View>

          <TextInput label="EXPIRY" placeholder="YYYY-MM-DD" mono value={expiry} onChangeText={setExpiry} />
          <TextInput label="CATEGORY" placeholder="e.g. Produce" value={category} onChangeText={setCategory} />
          <TextInput label="STORAGE LOCATION" placeholder="e.g. Main fridge / Shelf 2" value={storageLocation} onChangeText={setStorageLocation} />
          <TextInput label="NOTES" placeholder="Optional household note" value={notes} onChangeText={setNotes} />

          <Button variant="primary" block loading={saving} style={{ marginTop: spacing.md }} onPress={handleSave}>
            SAVE CHANGES
          </Button>
          <Button variant="danger" block style={{ marginTop: spacing.md }} onPress={handleDelete}>
            DELETE ITEM
          </Button>
        </Card>
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
  previewShell: {
    height: 180,
    overflow: 'hidden',
    marginBottom: 16,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
