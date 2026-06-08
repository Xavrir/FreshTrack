import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Container, Text, Button } from '../components';
import { useNavigation } from '@react-navigation/native';
import { RootNavigationProp } from '../navigation/types';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';

export function ScannerScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = React.useState(false);

  function handleBarcodeScanned(result: BarcodeScanningResult) {
    if (scanned || !result.data) return;
    setScanned(true);
    navigation.replace('AddBatch', { barcode: result.data });
  }

  if (!permission) {
    return (
      <Container safeArea={false} style={{ backgroundColor: '#000' }}>
        <View style={styles.centered}>
          <Text variant="body" color="surface" align="center">
            Loading camera...
          </Text>
        </View>
      </Container>
    );
  }

  if (!permission.granted) {
    return (
      <Container safeArea={false} style={{ backgroundColor: '#000' }}>
        <View style={styles.centered}>
          <Text variant="body" color="surface" align="center" style={{ marginBottom: 24 }}>
            Camera permission is required to scan barcodes.
          </Text>
          <Button variant="secondary" block onPress={requestPermission}>
            Allow Camera
          </Button>
          <Button variant="ghost" block style={{ marginTop: 16 }} onPress={() => navigation.goBack()}>
            <Text color="surface" weight="medium">Cancel</Text>
          </Button>
        </View>
      </Container>
    );
  }
  
  return (
    <Container safeArea={false} style={{ backgroundColor: '#000' }}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />
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
          Use Demo Barcode
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    padding: 32,
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
