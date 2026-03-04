import React from 'react';
import { View } from 'react-native';
import { Container, Text, Button, Card, Chip } from '../components';
import { useNavigation } from '@react-navigation/native';
import { RootNavigationProp } from '../navigation/types';

export function BatchDetailScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  
  return (
    <Container scroll>
      <View style={{ padding: 16 }}>
        <Text variant="h2" weight="black" style={{ marginBottom: 24 }}>Item Detail</Text>
        
        <Card elevated style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text variant="h3" weight="bold">Indomie Goreng</Text>
            <Chip label="Dry Good" />
          </View>
          
          <View style={{ flexDirection: 'row', gap: 32, marginBottom: 16 }}>
            <View>
              <Text variant="label" color="textMuted">Quantity</Text>
              <Text variant="body" weight="medium">5 pcs</Text>
            </View>
            <View>
              <Text variant="label" color="textMuted">Expiry Date</Text>
              <Text variant="body" weight="medium">2026-10-12</Text>
            </View>
          </View>
          
          <View>
            <Text variant="label" color="textMuted">Added By</Text>
            <Text variant="body">Xavrir (Today)</Text>
          </View>
        </Card>

        <Text variant="h3" weight="bold" style={{ marginBottom: 16 }}>Actions</Text>
        <Card>
          <Button 
            variant="success" 
            block 
            style={{ marginBottom: 12 }}
            onPress={() => navigation.navigate('ConsumeWaste', { id: '1' })}
          >
            Mark Consumed / Used
          </Button>
          <Button 
            variant="danger" 
            block 
            onPress={() => navigation.navigate('ConsumeWaste', { id: '1' })}
          >
            Mark Wasted / Expired
          </Button>
        </Card>
      </View>
    </Container>
  );
}
