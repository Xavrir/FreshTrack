import React, { useState } from 'react';
import { View } from 'react-native';
import { Container, Text, Button, Card, TextInput, Chip } from '../components';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList, RootNavigationProp } from '../navigation/types';
import { supabase } from '../lib/supabase';

export function AddBatchScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  const route = useRoute<RouteProp<RootStackParamList, 'AddBatch'>>();
  const barcode = route.params?.barcode;

  const [name, setName] = useState(barcode ? 'Indomie Ayam Bawang' : '');
  const [brand, setBrand] = useState(barcode ? 'Indofood' : '');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('pcs');
  const [expiryDate, setExpiryDate] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSaveBatch() {
    try {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        console.log('No Session Active');
        return;
      }

      const { data: member, error: memberError } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', session.user.id)
        .maybeSingle();

        if (memberError || !member) {
          console.log('Member Error');
          return;
        }

      const { data, error } = await supabase
        .from('inventory_batches')
        .insert({
          household_id: member.household_id,
          created_by: session.user.id,
          name,
          brand: brand || null,
          quantity: Number(quantity),
          unit,
          expiry_date: expiryDate || null,
          barcode: barcode || null,
        })
        .select()
        .maybeSingle();

      console.log('INSERT DATA:', data);
      console.log('INSERT ERROR:', error);

      const { error: historyError } = await supabase
        .from('inventory_history')
        .insert({
          inventory_batch_id: data.id,
          household_id: member.household_id,
          user_id: session.user.id,
          action: 'add',
          quantity: Number(quantity),
        });
      
      if (historyError) {
        console.log('History Insert Error:', historyError)
      }

      if (!error) {
        navigation.goBack();
      }

    } catch (err) {
      console.log('SAVE ERROR:', err);
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
