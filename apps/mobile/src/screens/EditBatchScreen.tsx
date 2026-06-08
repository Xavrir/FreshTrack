import React, { useCallback, useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { Container, Text, Button, Card, TextInput } from '../components';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootNavigationProp, RootStackParamList } from '../navigation/types';
import { supabase } from '../lib/supabase';
import { refreshReminderNotifications } from '../services/reminders';
import { isValidExpiryDate } from '../utils/expiry';

export function EditBatchScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  const route = useRoute<RouteProp<RootStackParamList, 'EditBatch'>>();
  const { id } = route.params;

  const [item, setItem] = useState<any>(null);
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [saving, setSaving] = useState(false);

  const loadItem = useCallback(async () => {
    const { data, error } = await supabase
      .from('inventory_batches')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (error || !data) {
      Alert.alert('Item not found', error?.message ?? 'This item may have been deleted.');
      navigation.goBack();
      return;
    }

    setItem(data);
    setName(data.name ?? '');
    setBrand(data.brand ?? '');
    setQuantity(String(data.quantity ?? ''));
    setUnit(data.unit ?? '');
    setExpiryDate(data.expiry_date ?? '');
  }, [id, navigation]);

  useEffect(() => {
    loadItem();
  }, [loadItem]);

  function validateForm() {
    const quantityNumber = Number(quantity);

    if (!name.trim()) {
      Alert.alert('Missing item name', 'Enter a food item name before saving.');
      return null;
    }

    if (!expiryDate.trim()) {
      Alert.alert('Missing expiry date', 'Enter the expiry date in YYYY-MM-DD format.');
      return null;
    }

    if (!isValidExpiryDate(expiryDate.trim())) {
      Alert.alert('Invalid expiry date', 'Use a valid date in YYYY-MM-DD format.');
      return null;
    }

    if (!Number.isFinite(quantityNumber) || quantityNumber < 0) {
      Alert.alert('Invalid quantity', 'Quantity cannot be negative.');
      return null;
    }

    if (!unit.trim()) {
      Alert.alert('Missing unit', 'Enter a unit such as pcs, gram, bottle, or pack.');
      return null;
    }

    return {
      name: name.trim(),
      brand: brand.trim() || null,
      quantity: quantityNumber,
      unit: unit.trim(),
      expiry_date: expiryDate.trim(),
    };
  }

  async function insertHistory(action: 'edit' | 'delete', amount: number) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !item) return;

    const { error } = await supabase
      .from('inventory_history')
      .insert({
        inventory_batch_id: item.id,
        household_id: item.household_id,
        user_id: user.id,
        action,
        quantity: amount,
      });

    if (error) {
      console.log('History insert error:', error);
    }
  }

  async function handleSave() {
    if (!item) return;
    const payload = validateForm();
    if (!payload) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('inventory_batches')
        .update({
          ...payload,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id);

      if (error) {
        Alert.alert('Could not update item', error.message);
        return;
      }

      await insertHistory('edit', payload.quantity);
      await refreshReminderNotifications().catch((notificationError) => {
        console.log('Reminder refresh error:', notificationError);
      });
      navigation.navigate('BatchDetail', { id: item.id });
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!item) return;

    Alert.alert('Delete item', `Delete ${item.name} from inventory?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setSaving(true);
          try {
            const { error } = await supabase
              .from('inventory_batches')
              .update({
                deleted_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', item.id);

            if (error) {
              Alert.alert('Could not delete item', error.message);
              return;
            }

            await insertHistory('delete', Number(item.quantity) || 0);
            await refreshReminderNotifications().catch((notificationError) => {
              console.log('Reminder refresh error:', notificationError);
            });
            navigation.navigate('Main');
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  }

  if (!item) {
    return (
      <Container>
        <View style={{ padding: 16 }}>
          <Text>Loading Item...</Text>
        </View>
      </Container>
    );
  }

  return (
    <Container scroll>
      <View style={{ padding: 16 }}>
        <Text variant="h2" weight="black" style={{ marginBottom: 24 }}>
          Edit Item
        </Text>

        <Card elevated>
          <TextInput label="Product Name" placeholder="e.g. Susu UHT" value={name} onChangeText={setName} />
          <TextInput label="Brand (Optional)" placeholder="e.g. Indofood" value={brand} onChangeText={setBrand} />

          <View style={{ flexDirection: 'row', gap: 16 }}>
            <TextInput label="Quantity" placeholder="1" keyboardType="numeric" style={{ flex: 1 }} value={quantity} onChangeText={setQuantity} />
            <TextInput label="Unit" placeholder="pcs" style={{ flex: 1 }} value={unit} onChangeText={setUnit} />
          </View>

          <TextInput label="Expiry Date" placeholder="YYYY-MM-DD" value={expiryDate} onChangeText={setExpiryDate} />

          <Button variant="primary" block loading={saving} style={{ marginTop: 24 }} onPress={handleSave}>
            Save Changes
          </Button>

          <Button variant="danger" block disabled={saving} style={{ marginTop: 12 }} onPress={handleDelete}>
            Delete Item
          </Button>
        </Card>
      </View>
    </Container>
  );
}
