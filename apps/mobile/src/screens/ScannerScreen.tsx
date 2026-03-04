import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Container, Text, Button } from '../components';
import { useNavigation } from '@react-navigation/native';
import { RootNavigationProp } from '../navigation/types';

export function ScannerScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  
  return (
    <Container safeArea={false} style={{ backgroundColor: '#000' }}>
      <View style={styles.cameraFrame}>
        <View style={styles.focusBox} />
      </View>
      
      <View style={styles.controls}>
        <Text variant="body" color="surface" align="center" style={{ marginBottom: 24 }}>
          Position barcode in the frame
        </Text>
        <Button 
          variant="secondary" 
          block
          onPress={() => navigation.replace('AddBatch', { barcode: '8999999123456' })}
        >
          Simulate Scan Success
        </Button>
        <Button 
          variant="ghost" 
          block
          style={{ marginTop: 16 }}
          onPress={() => navigation.goBack()}
        >
          <Text color="surface" weight="medium">Cancel</Text>
        </Button>
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  cameraFrame: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  focusBox: {
    width: 250,
    height: 150,
    borderWidth: 2,
    borderColor: '#F59E0B',
    borderRadius: 8,
  },
  controls: {
    padding: 32,
    paddingBottom: 48,
    backgroundColor: 'rgba(0,0,0,0.8)',
  }
});
