import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Container, Text, Button, Card, TextInput } from '../components';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootNavigationProp, RootStackParamList } from '../navigation/types';
import { supabase } from '../lib/supabase';
import { refreshReminderNotifications } from '../services/reminders';

export function ConsumeWasteScreen() {
  const navigation = useNavigation<RootNavigationProp>();

  const route = useRoute<RouteProp<RootStackParamList, 'ConsumeWaste'>>();

  const { id, type } = route.params;

  const [item, setItem] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  const loadItem = useCallback(async () => {
    const {data, error} = await supabase
      .from('inventory_batches')
      .select('*')
      .eq('id', id)
      .maybeSingle();
  
    console.log('ACTION ITEM:', data);
    console.log('ACTION ERROR:', error);

    if (data) {
      setItem(data);
      setAmount(String(data.quantity ?? ''));
    }
  }, [id]);

  useEffect(() => {
    loadItem();
  }, [loadItem]);

  async function handleConfirm() {
    if (!item) {
      return;
    }

    const amountNumber = Number(amount);

    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      alert('Invalid Amount!');
      return;
    }

    if (amountNumber > item.quantity) {
      alert('Amount exceeds available inventory');
      return;
    }

    const newQuantity = item.quantity - amountNumber;

    if (newQuantity <= 0) {
      const { error } = await supabase 
        .from('inventory_batches')
        .update({
          quantity: 0,
          deleted_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (error) {
        console.log(error);
        alert('Failed to update Inventory!');
        return;
      }
    }else {
      const { error } = await supabase
        .from('inventory_batches')
        .update({
          quantity: newQuantity,
        })
        .eq('id', id);

      if (error) {
        console.log(error);
        alert('Failed to update Inventory!');
        return;
      }
    }

    const { data: { user }, } = await supabase.auth.getUser();

    await supabase
      .from('inventory_history')
      .insert({
        inventory_batch_id: item.id,
        household_id: item.household_id,
        user_id: user?.id,
        action: type,
        quantity: amountNumber,
        reason: type === 'waste' ? reason : null,
      });

    await refreshReminderNotifications().catch((notificationError) => {
      console.log('Reminder refresh error:', notificationError);
    });

    navigation.navigate('Main');
    
  }

  if (!item) {
    return(
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
        <Text variant="h2" weight="black" style={{ marginBottom: 8 }}>{type === 'consume' ? 'Record Consumption' : 'Record Waste'}</Text>
        <Text variant="body" color="textMuted" style={{ marginBottom: 24 }}>{item.name} ({item.quantity} {item.unit} remaining)</Text>
        
        <Card elevated>
          <TextInput 
            label="Amount" 
            placeholder="1" 
            value={amount}
            onChangeText={setAmount} 
            keyboardType="numeric" 
            helperText={`Enter Amount ${
              type === 'consume' ? 'consumed' : 'wasted'
            }.`}
          />

          {type === 'waste' && (
            <TextInput
              label="Reason (Optional)"
              placeholder="Expired, Spoiled, Overcooked..."
              value={reason}
              onChangeText={setReason}
              multiline
            />
          )}
          
          <View style={{ marginTop: 24, flexDirection: 'row', gap: 16 }}>
            <Button variant="secondary" style={{ flex: 1 }} onPress={() => navigation.goBack()}>Cancel</Button>
            <Button variant="primary" style={{ flex: 1 }} onPress={handleConfirm}>Confirm</Button>
          </View>
        </Card>
      </View>
    </Container>
  );
}
