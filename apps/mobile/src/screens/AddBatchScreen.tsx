import React from 'react';
import { View } from 'react-native';
import { Container, Text, Button, Card, TextInput, Chip } from '../components';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList, RootNavigationProp } from '../navigation/types';

export function AddBatchScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  const route = useRoute<RouteProp<RootStackParamList, 'AddBatch'>>();
  const barcode = route.params?.barcode;
  
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
          <TextInput label="Product Name" placeholder="e.g. Susu UHT" defaultValue={barcode ? 'Indomie Ayam Bawang' : ''} />
          <TextInput label="Brand (Optional)" placeholder="e.g. Indofood" defaultValue={barcode ? 'Indofood' : ''} />
          
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <TextInput label="Quantity" placeholder="1" keyboardType="numeric" style={{ flex: 1 }} />
            <TextInput label="Unit" placeholder="pcs" style={{ flex: 1 }} />
          </View>
          
          <TextInput label="Expiry Date" placeholder="YYYY-MM-DD" />
          
          <Button variant="primary" block style={{ marginTop: 24 }} onPress={() => navigation.goBack()}>
            Save Batch
          </Button>
        </Card>
      </View>
    </Container>
  );
}
