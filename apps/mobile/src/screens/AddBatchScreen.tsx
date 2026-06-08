import React, { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { Container, Text, Button, Card, TextInput, Chip } from '../components';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList, RootNavigationProp } from '../navigation/types';
import { supabase } from '../lib/supabase';
import { refreshReminderNotifications } from '../services/reminders';
import { isValidExpiryDate } from '../utils/expiry';

export function AddBatchScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  const route = useRoute<RouteProp<RootStackParamList, 'AddBatch'>>();
  const barcode = route.params?.barcode;

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('pcs');
  const [expiryDate, setExpiryDate] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadBarcodeMapping() {
      if (!barcode) return;

      if (barcode === '8999999123456') {
        setName('Indomie Ayam Bawang');
        setBrand('Indofood');
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const { data: member } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', session.user.id)
        .maybeSingle();
      if (!member) return;

      const { data: mapping } = await supabase
        .from('barcode_mappings')
        .select('name, brand')
        .eq('household_id', member.household_id)
        .eq('barcode', barcode)
        .maybeSingle();

      if (mapping) {
        setName(mapping.name ?? '');
        setBrand(mapping.brand ?? '');
      }
    }

    loadBarcodeMapping();
  }, [barcode]);

  async function handleSaveBatch() {
    const trimmedName = name.trim();
    const trimmedUnit = unit.trim();
    const trimmedExpiry = expiryDate.trim();
    const quantityNumber = Number(quantity);

    if (!trimmedName) {
      Alert.alert('Missing item name', 'Enter a food item name before saving.');
      return;
    }

    if (!trimmedExpiry) {
      Alert.alert('Missing expiry date', 'Enter the expiry date in YYYY-MM-DD format.');
      return;
    }

    if (!isValidExpiryDate(trimmedExpiry)) {
      Alert.alert('Invalid expiry date', 'Use a valid date in YYYY-MM-DD format.');
      return;
    }

    if (!Number.isFinite(quantityNumber) || quantityNumber < 0) {
      Alert.alert('Invalid quantity', 'Quantity cannot be negative.');
      return;
    }

    if (!trimmedUnit) {
      Alert.alert('Missing unit', 'Enter a unit such as pcs, gram, bottle, or pack.');
      return;
    }

    try {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        Alert.alert('Not signed in', 'Please sign in again before saving inventory.');
        return;
      }

      const { data: member, error: memberError } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (memberError || !member) {
        Alert.alert('No household', 'Create or join a household before adding items.');
        return;
      }

      const { data, error } = await supabase
        .from('inventory_batches')
        .insert({
          household_id: member.household_id,
          created_by: session.user.id,
          name: trimmedName,
          brand: brand || null,
          quantity: quantityNumber,
          unit: trimmedUnit,
          expiry_date: trimmedExpiry,
          barcode: barcode || null,
        })
        .select()
        .maybeSingle();

      if (error || !data) {
        Alert.alert('Could not save item', error?.message ?? 'Please try again.');
        return;
      }

      const { error: historyError } = await supabase
        .from('inventory_history')
        .insert({
          inventory_batch_id: data.id,
          household_id: member.household_id,
          user_id: session.user.id,
          action: 'add',
          quantity: quantityNumber,
        });
      
      if (historyError) {
        console.log('History Insert Error:', historyError)
      }

      if (barcode) {
        await supabase
          .from('barcode_mappings')
          .upsert({
            household_id: member.household_id,
            barcode,
            name: trimmedName,
            brand: brand.trim() || null,
            source: 'manual',
            updated_at: new Date().toISOString(),
          });
      }

      await refreshReminderNotifications().catch((notificationError) => {
        console.log('Reminder refresh error:', notificationError);
      });
      navigation.goBack();

    } catch (err) {
      console.log('SAVE ERROR:', err);
      Alert.alert('Could not save item', 'Please check the form and try again.');
    }finally {
      setLoading(false);
    }


    
  }
  
  return (
    <Container scroll>
      <View style={{ padding: 16 }}>
        <Text variant="h2" weight="black" style={{ marginBottom: 24 }}>Add Item</Text>
        
        {barcode && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <Chip label="Scanned" variant="success" style={{ marginRight: 8 }} />
            <Text variant="body" mono color="textMuted">{barcode}</Text>
          </View>
        )}

        <Card elevated>
          <TextInput label="Product Name" placeholder="e.g. Susu UHT" value={name} onChangeText={setName} />
          <TextInput label="Brand (Optional)" placeholder="e.g. Indofood" value={brand} onChangeText={setBrand} />
          
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <TextInput label="Quantity" placeholder="1" keyboardType="numeric" style={{ flex: 1 }} value={quantity} onChangeText={setQuantity} />
            <TextInput label="Unit" placeholder="pcs" style={{ flex: 1 }} value={unit} onChangeText={setUnit} />
          </View>
          
          <TextInput label="Expiry Date" placeholder="YYYY-MM-DD" value={expiryDate} onChangeText={setExpiryDate} />
          
          <Button variant="primary" block style={{ marginTop: 24 }} onPress={handleSaveBatch}>
            {loading ? 'Saving...' : 'Save Batch'}
          </Button>
        </Card>
      </View>
    </Container>
  );
}
