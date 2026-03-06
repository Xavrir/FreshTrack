import React from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { Button, Text, Icon, Chip } from '../components';
import { RootNavigationProp } from '../navigation/types';
import { useTheme } from '../theme/ThemeProvider';
import { useHousehold } from '../providers/HouseholdProvider';
import { detectProductDraft } from '../services/productDetection';

type Candidate = {
  label: string;
  product: string;
};

const FALLBACK_CANDIDATES: Candidate[] = [
  { label: '8999999123456', product: 'Organic Strawberries' },
  { label: '8999999345678', product: 'Oat Milk' },
];

export function ScannerScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const { household } = useHousehold();
  const { colors, spacing, borderWidth: bw, radii } = useTheme();
  const [flashEnabled, setFlashEnabled] = React.useState(false);
  const [scannedCode, setScannedCode] = React.useState<string | null>(null);
  const [detecting, setDetecting] = React.useState(false);

  const handleBarcodeScanned = React.useCallback(
    async ({ data }: { data: string }) => {
      if (scannedCode) return;
      setScannedCode(data);
      setDetecting(true);

      try {
        const aiDetection = await detectProductDraft({ barcode: data, householdId: household?.id });
        navigation.replace('AddBatch', { barcode: data, aiDetection });
      } catch (error) {
        Alert.alert('AI detection unavailable', error instanceof Error ? error.message : 'Unable to detect product details right now.');
        navigation.replace('AddBatch', { barcode: data });
      } finally {
        setDetecting(false);
      }
    },
    [household?.id, navigation, scannedCode]
  );

  const candidates = scannedCode ? [{ label: scannedCode, product: 'Detected Item' }] : FALLBACK_CANDIDATES;

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={[styles.safe, { backgroundColor: colors.background }]}> 
      <View style={[styles.header, { paddingHorizontal: spacing.xl, paddingTop: Math.max(insets.top, spacing.sm), paddingBottom: spacing.md }]}> 
        <TouchableOpacity
          style={[styles.headerBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: bw.medium, borderRadius: radii.md }]}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={20} />
        </TouchableOpacity>
        <Text variant="label" color="textSubtle" mono tracking="widest">
          BARCODE SCANNER
        </Text>
        <TouchableOpacity
          style={[styles.headerBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: bw.medium, borderRadius: radii.md }]}
          onPress={() => setFlashEnabled((current) => !current)}
        >
          <Icon name={flashEnabled ? 'flash' : 'flash-outline'} size={20} color="primary" />
        </TouchableOpacity>
      </View>

      <View style={[styles.cameraStage, { marginHorizontal: spacing.xl, borderRadius: radii.lg, backgroundColor: '#151515' }]}> 
        {permission == null ? (
          <View style={styles.permissionState}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : permission.granted ? (
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            enableTorch={flashEnabled}
            barcodeScannerSettings={{
              barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'],
            }}
            onBarcodeScanned={scannedCode ? undefined : handleBarcodeScanned}
          />
        ) : (
          <View style={[styles.permissionState, { padding: spacing.xl }]}> 
            <Icon name="camera-off-outline" size={38} color="primary" />
            <Text variant="h3" weight="bold" uppercase style={{ marginTop: spacing.lg }}>
              Camera Access Required
            </Text>
            <Text variant="body" color="textMuted" align="center" style={{ marginTop: spacing.sm, marginBottom: spacing.xl }}>
              Enable camera access to scan product barcodes from this screen.
            </Text>
            <Button variant="primary" onPress={requestPermission}>
              ENABLE CAMERA
            </Button>
          </View>
        )}

        <View style={[styles.cameraShade, { backgroundColor: 'rgba(9,9,9,0.28)' }]} />

        {detecting && (
          <View style={[styles.detectingOverlay, { backgroundColor: colors.overlay }]}> 
            <ActivityIndicator size="large" color={colors.primary} />
            <Text variant="label" color="text" mono tracking="widest" style={{ marginTop: spacing.md }}>
              ANALYZING PRODUCT
            </Text>
          </View>
        )}

        <View style={[styles.frame, { borderColor: colors.primary }]}> 
          <View style={[styles.scanLine, { backgroundColor: colors.primary }]} />
          <View style={[styles.cornerTopLeft, { borderColor: colors.primary }]} />
          <View style={[styles.cornerTopRight, { borderColor: colors.primary }]} />
          <View style={[styles.cornerBottomLeft, { borderColor: colors.primary }]} />
          <View style={[styles.cornerBottomRight, { borderColor: colors.primary }]} />
        </View>

        <View style={[styles.hintBox, { backgroundColor: 'rgba(9,9,9,0.82)', borderColor: colors.border, borderRadius: radii.full, borderWidth: bw.medium }]}> 
          <Text variant="label" color="text" mono tracking="widest">
            {permission?.granted ? 'ALIGN BARCODE WITHIN FRAME' : 'CAMERA PERMISSION REQUIRED'}
          </Text>
        </View>
      </View>

      <View style={[styles.footerSheet, { backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: bw.medium, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, padding: spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}> 
        <View style={[styles.handle, { backgroundColor: colors.borderStrong, borderRadius: radii.full, marginBottom: spacing.lg }]} />
        <View style={[styles.footerHeader, { marginBottom: spacing.md }]}> 
          <View>
            <Text variant="label" color="primary" mono tracking="widest">
              LIVE RECOGNITION
            </Text>
            <Text variant="body" weight="bold" style={{ marginTop: 4 }}>
              {scannedCode ? 'Barcode captured' : 'Barcode candidates detected'}
            </Text>
          </View>
          <Chip label={permission?.granted ? 'READY' : 'PENDING'} variant={permission?.granted ? 'success' : 'warning'} />
        </View>

        <View style={{ gap: spacing.md }}>
          {candidates.map((candidate) => (
            <TouchableOpacity
              key={candidate.label}
              style={[styles.candidateRow, { backgroundColor: colors.backgroundAlt, borderColor: colors.border, borderWidth: bw.medium, borderRadius: radii.md, padding: spacing.md }]}
              onPress={async () => {
                setDetecting(true);
                try {
                  const aiDetection = await detectProductDraft({ barcode: candidate.label, householdId: household?.id });
                  navigation.replace('AddBatch', { barcode: candidate.label, aiDetection });
                } catch (error) {
                  Alert.alert('AI detection unavailable', error instanceof Error ? error.message : 'Unable to detect product details right now.');
                  navigation.replace('AddBatch', { barcode: candidate.label });
                } finally {
                  setDetecting(false);
                }
              }}
            >
              <View style={{ flex: 1 }}>
                <Text variant="body" weight="bold">
                  {candidate.product}
                </Text>
                <Text variant="caption" color="textMuted" mono style={{ marginTop: 4 }}>
                  {candidate.label}
                </Text>
              </View>
              <Icon name="arrow-right" size={20} color="primary" />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  permissionState: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraShade: {
    ...StyleSheet.absoluteFillObject,
  },
  detectingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: 270,
    height: 172,
    position: 'relative',
    borderWidth: 1,
  },
  scanLine: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: '50%',
    height: 2,
  },
  cornerTopLeft: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 28,
    height: 28,
    borderLeftWidth: 4,
    borderTopWidth: 4,
  },
  cornerTopRight: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRightWidth: 4,
    borderTopWidth: 4,
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    width: 28,
    height: 28,
    borderLeftWidth: 4,
    borderBottomWidth: 4,
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRightWidth: 4,
    borderBottomWidth: 4,
  },
  hintBox: {
    position: 'absolute',
    top: 32,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  footerSheet: {
    paddingBottom: 28,
  },
  handle: {
    alignSelf: 'center',
    width: 52,
    height: 5,
  },
  footerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  candidateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
