import React, { useEffect, useState, useCallback } from 'react';
import { View, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Container, Text, Button, Card, Chip, TextInput } from '../components';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { RootNavigationProp } from '../navigation/types';
import { supabase } from '../lib/supabase'

function getExpiryInfo(expiryDate: string | null) {
  if (!expiryDate) {
    return {
      label: 'No Expiry',
      variant: 'default' as const,
      daysLeft: null,
    };
  }

  // Today's local date only
  const today = new Date();

  // Parse YYYY-MM-DD manually
  const [year, month, day] = expiryDate.split('-').map(Number);

  const expiry = new Date(year, month - 1, day);

  // Strip time
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);

  const diffMs = expiry.getTime() - today.getTime();

  const daysLeft = Math.floor(
    diffMs / (1000 * 60 * 60 * 24)
  );

  if (daysLeft < 0) {
    return {
      label: 'Expired',
      variant: 'danger' as const,
      daysLeft,
    };
  }

  if (daysLeft === 0) {
    return {
      label: 'Expires Today',
      variant: 'danger' as const,
      daysLeft,
    };
  }

  if (daysLeft <= 3) {
    return {
      label: `${daysLeft} Day${daysLeft !== 1 ? 's' : ''} Left`,
      variant: 'danger' as const,
      daysLeft,
    };
  }

  if (daysLeft <= 7) {
    return {
      label: `${daysLeft} Days Left`,
      variant: 'warning' as const,
      daysLeft,
    };
  }

  return {
    label: `${daysLeft} Days Left`,
    variant: 'success' as const,
    daysLeft,
  };
  
}

function getExpiringItems(items: any[]) {
  return items.filter((item) => {
    const expiryInfo = getExpiryInfo(item.expiry_date);

    return (
      expiryInfo.label === 'Expires Today' || expiryInfo.variant === 'danger'
    );
  });
}

export function InventoryHome() {
  const navigation = useNavigation<RootNavigationProp>();
  const [inventory, setInventory] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showExpiryWarning, setShowExpiryWarning] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [searchBy, setSearchBy] = useState<'name' | 'brand' | 'barcode'>('name');
  const [expiryFilter, setExpiryFilter] = useState<'all' | 'expired' | 'soon' | 'safe' | 'non-expiry'>('all');
  
  useEffect(() => {
    loadInventory();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadInventory();
    }, [])
  );

  async function loadInventory() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) return;

    const { data: member, error: memberError } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', session.user.id)
      .maybeSingle();

    console.log('MEMBER:', member);
    console.log('MEMBER ERROR:', memberError);

    if (!member) return;

    const { data: items, error } = await supabase
      .from('inventory_batches')
      .select('*')
      .eq('household_id', member.household_id)
      .is('deleted_at', null)
      .order('expiry_date', { ascending: true });

    console.log('ITEMS', items);
    console.log('ITEMS ERROR', error);

    if (items) {
      setInventory(items);
    }
    
  }

  async function onRefresh() {
    setRefreshing(true);

    await loadInventory();

    setShowExpiryWarning(true);

    setRefreshing(false);
    
  }

  const searchedInventory = inventory.filter((item) => {
    const query = searchQuery.toLowerCase();

    switch (searchBy) {
      case 'name':
        return item.name?.toLowerCase().includes(query);
      
      case 'brand':
        return item.brand?.toLowerCase().includes(query);

      case 'barcode':
        return item.barcode?.toLowerCase().includes(query);

      default:
        return true;
    }
  }
   
  );

  const filteredInventory = searchedInventory.filter((item) => {
    const expiryInfo = getExpiryInfo(item.expiry_date);

    switch (expiryFilter) {
      case 'expired':
        return (
          expiryInfo.daysLeft !== null &&
          expiryInfo.daysLeft < 0
        );

      case 'soon':
        return (
          expiryInfo.daysLeft !== null &&
          expiryInfo.daysLeft >= 0 &&
          expiryInfo.daysLeft <= 3
        );

      case 'safe':
        return (
          expiryInfo.daysLeft !== null &&
          expiryInfo.daysLeft > 3
        );

      case 'non-expiry':
        return expiryInfo.daysLeft === null;

      case 'all':
      default:
        return true;
    }
  });

  const expiringItems = getExpiringItems(filteredInventory);

  // const mockData = [
  //   { id: '1', name: 'Susu UHT Diamond', qty: '1', unit: 'pcs', exp: '2 Days Left', variant: 'danger' as const },
  //   { id: '2', name: 'Indomie Goreng', qty: '5', unit: 'pcs', exp: '14 Days Left', variant: 'success' as const },
  //   { id: '3', name: 'Telur Ayam', qty: '12', unit: 'pcs', exp: '5 Days Left', variant: 'warning' as const },
  // ];

  return (
    <Container safeArea>
      <View style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="h2" weight="black">Inventory</Text>
        <Button size="sm" variant="ghost" onPress={() => navigation.navigate('HouseholdSettings')}>
          Settings
        </Button>
        <Button size="sm" variant="secondary" onPress={() => navigation.navigate('History')}>
          History
        </Button>
      </View>

      <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
        <TextInput placeholder="Search Inventory..." value={searchQuery} onChangeText={setSearchQuery} />
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8,}}>
        <Button size="sm" variant={searchBy === 'name' ? 'primary' : 'secondary'} onPress={() => setSearchBy('name')}>
          Name 
        </Button>

        <Button size="sm" variant={searchBy === 'brand' ? 'primary' : 'secondary'} onPress={() => setSearchBy('brand')}>
          Brand  
        </Button>

        <Button size="sm" variant={searchBy === 'barcode' ? 'primary' : 'secondary'} onPress={() => setSearchBy('barcode')}>
          Barcode 
        </Button>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, }}>
        <Button size="sm" variant={expiryFilter === 'all' ? 'primary' : 'secondary'} onPress={() => setExpiryFilter('all')}>
          All 
        </Button>

        <Button size="sm" variant={expiryFilter === 'expired' ? 'primary' : 'secondary'} onPress={() => setExpiryFilter('expired')}>
          Expired 
        </Button>

        <Button size="sm" variant={expiryFilter === 'soon' ? 'primary' : 'secondary'} onPress={() => setExpiryFilter('soon')}>
          Nearing Expiry 
        </Button>

        <Button size="sm" variant={expiryFilter === 'safe' ? 'primary' : 'secondary'} onPress={() => setExpiryFilter('safe')}>
          Safe 
        </Button>

        <Button size="sm" variant={expiryFilter === 'non-expiry' ? 'primary' : 'secondary'} onPress={() => setExpiryFilter('non-expiry')}>
          No Expiry 
        </Button>
      </View>

      {showExpiryWarning && expiringItems.length > 0 && (
        <View style={{ paddingHorizontal: 16 }}>
          <Card elevated style={{marginBottom: 16, backgroundColor: '#FFF7ED',}}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, }}>
              <Text variant="h3" weight="bold" color="danger">
                ⚠ Expiring Items
              </Text>

              <TouchableOpacity onPress={() => setShowExpiryWarning(false)}>
                <Text variant="body" weight="bold" color="textMuted">
                  ✕
                </Text>
              </TouchableOpacity>
            </View>

            {expiringItems.map((item) => {
              const expiryInfo = getExpiryInfo(item.expiry_date);

              return (
                <View key={item.id} style={{ marginBottom: 8 }}>
                  <Text weight="bold">
                    {item.name}
                  </Text>

                  <Text variant="body" color="textMuted">
                    {expiryInfo.label}
                  </Text>
                </View>
              );
            })}
          </Card>
        </View>
      )}
      
      <FlatList
        style={{ flex: 1 }}
        data={filteredInventory}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32, }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => navigation.navigate('BatchDetail', { id: item.id })}>
            <Card elevated style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View>
                  <Text variant="h3" weight="bold" style={{ marginBottom: 4 }}>{item.name}</Text>
                  <Text variant="body" color="textMuted">{item.quantity} {item.unit}</Text>
                </View>
                <Chip label={getExpiryInfo(item.expiry_date).label} variant={getExpiryInfo(item.expiry_date).variant} />
              </View>
            </Card>
          </TouchableOpacity>
        )}

        ListEmptyComponent={
          <View style={{ paddingTop: 32 }}>
            <Text align="center" color="textMuted">
              No items found...
            </Text>
          </View>
        }

        ListFooterComponent={
          <View style={{ padding: 16, flexDirection: 'row', gap: 16 }}>
            <Button variant="secondary" style={{ flex: 1 }} onPress={() => navigation.navigate('AddBatch', {})}>
              Manual Add
            </Button>
            <Button variant="primary" style={{ flex: 1 }} onPress={() => navigation.navigate('Scanner')}>
              Scan Barcode
            </Button>
          </View>
        }
      />
    </Container>
  );
}
