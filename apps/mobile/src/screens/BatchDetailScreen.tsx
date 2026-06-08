import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Container, Text, Button, Card, Chip } from '../components';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootNavigationProp, RootStackParamList } from '../navigation/types';
import { supabase } from '../lib/supabase';
import { formatExpiryDetail, getExpiryInfo } from '../utils/expiry';

export function BatchDetailScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  const route = useRoute<RouteProp<RootStackParamList, 'BatchDetail'>>();
  const { id } = route.params;

  const [item, setItem] = useState<any>(null);

  const loadItem = useCallback(async () => {
    const {data, error} = await supabase
      .from('inventory_batches')
      .select(`
        *,
        created_by`)
      .eq('id', id)
      .maybeSingle();

    console.log('DETAIL ITEM:', data);
    console.log('DETAIL ERROR:', error);

    if (data) {
      const { data: userData } = await supabase.auth.getUser();

      setItem({
        ...data,
        creatorEmail: userData.user?.email,
      });
    }

    
  }, [id]);

  useEffect(() => {
    loadItem();
  }, [loadItem]);

  const expiryInfo = item.expiry_date ? getExpiryInfo(item.expiry_date) : null;

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
        <Text variant="h2" weight="black" style={{ marginBottom: 24 }}>Item Detail</Text>
        
        <Card elevated style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text variant="h3" weight="bold">{item.name}</Text>
            <Chip label={expiryInfo?.label ?? 'NO EXPIRY'} variant={expiryInfo?.variant ?? 'default'} />
          </View>
          
          <View style={{ flexDirection: 'row', gap: 32, marginBottom: 16 }}>
            <View>
              <Text variant="label" color="textMuted">Quantity</Text>
              <Text variant="body" weight="medium">{item.quantity} {item.unit}</Text>
            </View>
            <View>
              <Text variant="label" color="textMuted">Expiry Date</Text>
              <Text variant="body" weight="medium">{item.expiry_date || 'No Expiry'}</Text>
              {item.expiry_date && (
                <Text variant="caption" color="textMuted">
                  {formatExpiryDetail(item.expiry_date)}
                </Text>
              )}
            </View>
          </View>
          
          <View>
            <Text variant="label" color="textMuted">Added By</Text>
            <Text variant="body">{item.creatorEmail || 'Unknown User'}</Text>
          </View>
        </Card>

        <Text variant="h3" weight="bold" style={{ marginBottom: 16 }}>Actions</Text>
        <Card>
          <Button
            variant="secondary"
            block
            style={{ marginBottom: 12 }}
            onPress={() => navigation.navigate('EditBatch', { id: item.id })}
          >
            Edit / Delete Item
          </Button>
          <Button 
            variant="success" 
            block 
            style={{ marginBottom: 12 }}
            onPress={() => navigation.navigate('ConsumeWaste', { id: item.id, type: 'consume' })}
          >
            Mark Consumed / Used
          </Button>
          <Button 
            variant="danger" 
            block 
            onPress={() => navigation.navigate('ConsumeWaste', { id: item.id, type: 'waste' })}
          >
            Mark Wasted / Expired
          </Button>
        </Card>
      </View>
    </Container>
  );
}
