import React from 'react';
import { View } from 'react-native';
import { Container, Text, Button, Card, TextInput } from '../components';
import { useNavigation } from '@react-navigation/native';
import { RootNavigationProp } from '../navigation/types';

export function ConsumeWasteScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  
  return (
    <Container scroll>
      <View style={{ padding: 16 }}>
        <Text variant="h2" weight="black" style={{ marginBottom: 8 }}>Record Usage</Text>
        <Text variant="body" color="textMuted" style={{ marginBottom: 24 }}>Indomie Goreng (5 pcs remaining)</Text>
        
        <Card elevated>
          <TextInput 
            label="Amount" 
            placeholder="1" 
            defaultValue="5" 
            keyboardType="numeric" 
            helperText="Enter the amount consumed or wasted."
          />
          
          <View style={{ marginTop: 24, flexDirection: 'row', gap: 16 }}>
            <Button variant="secondary" style={{ flex: 1 }} onPress={() => navigation.goBack()}>Cancel</Button>
            <Button variant="primary" style={{ flex: 1 }} onPress={() => navigation.navigate('Main')}>Confirm</Button>
          </View>
        </Card>
      </View>
    </Container>
  );
}
