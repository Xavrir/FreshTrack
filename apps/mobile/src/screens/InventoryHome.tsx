import React from 'react';
import { View, FlatList, TouchableOpacity } from 'react-native';
import { Container, Text, Button, Card, Chip } from '../components';
import { useNavigation } from '@react-navigation/native';
import { RootNavigationProp } from '../navigation/types';

export function InventoryHome() {
  const navigation = useNavigation<RootNavigationProp>();
  
  const mockData = [
    { id: '1', name: 'Susu UHT Diamond', qty: '1', unit: 'pcs', exp: '2 Days Left', variant: 'danger' as const },
    { id: '2', name: 'Indomie Goreng', qty: '5', unit: 'pcs', exp: '14 Days Left', variant: 'success' as const },
    { id: '3', name: 'Telur Ayam', qty: '12', unit: 'pcs', exp: '5 Days Left', variant: 'warning' as const },
  ];

  return (
    <Container safeArea>
      <View style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="h2" weight="black">Inventory</Text>
        <Button size="sm" variant="ghost" onPress={() => navigation.navigate('HouseholdSettings')}>
          Settings
        </Button>
      </View>
      
      <FlatList
        data={mockData}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => navigation.navigate('BatchDetail', { id: item.id })}>
            <Card elevated style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View>
                  <Text variant="h3" weight="bold" style={{ marginBottom: 4 }}>{item.name}</Text>
                  <Text variant="body" color="textMuted">{item.qty} {item.unit}</Text>
                </View>
                <Chip label={item.exp} variant={item.variant} />
              </View>
            </Card>
          </TouchableOpacity>
        )}
      />

      <View style={{ padding: 16, flexDirection: 'row', gap: 16 }}>
        <Button 
          variant="secondary" 
          style={{ flex: 1 }}
          onPress={() => navigation.navigate('AddBatch', {})}
        >
          Manual Add
        </Button>
        <Button 
          variant="primary" 
          style={{ flex: 1 }}
          onPress={() => navigation.navigate('Scanner')}
        >
          Scan Barcode
        </Button>
      </View>
    </Container>
  );
}
