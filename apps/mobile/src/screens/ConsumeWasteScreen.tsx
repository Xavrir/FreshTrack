import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text, Button, TextInput, Icon, Card, Chip } from '../components';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootNavigationProp, RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/ThemeProvider';
import { SafeAreaView } from 'react-native-safe-area-context';

const ITEM_RECORD: Record<string, { name: string; unit: string; remaining: number }> = {
  '1': { name: 'Organic Strawberries', unit: 'g', remaining: 450 },
  '2': { name: 'Oat Milk', unit: 'carton', remaining: 1 },
  '3': { name: 'Greek Yogurt', unit: 'cup', remaining: 3 },
  '4': { name: 'Baby Spinach', unit: 'bag', remaining: 1 },
};

export function ConsumeWasteScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  const route = useRoute<RouteProp<RootStackParamList, 'ConsumeWaste'>>();
  const { colors, spacing, borderWidth: bw, radii } = useTheme();
  const currentItem = ITEM_RECORD[route.params?.id ?? '1'] ?? ITEM_RECORD['1'];
  const [amount, setAmount] = useState('150');
  const [error, setError] = useState('');
  const remaining = currentItem.remaining;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.overlay }]}> 
      <View style={styles.shell}>
        <Card elevated style={{ borderRadius: radii.xl, paddingTop: spacing.lg }}>
          <View style={[styles.handle, { backgroundColor: colors.borderStrong, borderRadius: radii.full, marginBottom: spacing.lg }]} />

          <View style={styles.header}>
            <View>
              <Text variant="label" color="primary" mono tracking="widest">
                RECORD USAGE
              </Text>
              <Text variant="h2" weight="bold" style={{ marginTop: spacing.xs }}>
                {currentItem.name}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: colors.backgroundAlt, borderRadius: radii.full, borderWidth: bw.medium, borderColor: colors.border }]}
              onPress={() => navigation.goBack()}
            >
              <Icon name="close" size={18} />
            </TouchableOpacity>
          </View>

          <View style={{ marginTop: spacing.md, marginBottom: spacing.lg }}>
            <Chip label={`AVAILABLE ${remaining}${currentItem.unit.toUpperCase()}`} variant="warning" />
          </View>

          <View style={[styles.amountPanel, { backgroundColor: colors.backgroundAlt, borderRadius: radii.lg, borderWidth: bw.medium, borderColor: colors.border, marginBottom: spacing.lg }]}> 
            <Text variant="label" color="textSubtle" mono tracking="widest">
              QUANTITY TO LOG
            </Text>
            <View style={styles.amountRow}>
              <Text variant="display" weight="bold">
                {amount || '0'}
              </Text>
              <Text variant="h3" color="textMuted" mono>
                {currentItem.unit.toUpperCase()}
              </Text>
            </View>
          </View>

          <TextInput
            label="AMOUNT"
            placeholder="150"
            value={amount}
            onChangeText={(text) => {
              setAmount(text);
              setError('');
            }}
            keyboardType="numeric"
            error={error}
            mono
          />

          <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.md }}>
            <Button variant="secondary" style={{ flex: 1 }} onPress={() => navigation.goBack()}>
              CANCEL
            </Button>
            <Button
              variant="primary"
              style={{ flex: 1 }}
              onPress={() => {
                const num = parseFloat(amount);
                if (isNaN(num) || num <= 0) {
                  setError('Amount must be greater than 0');
                  return;
                }
                if (num > remaining) {
                  setError(`Amount cannot exceed ${remaining}`);
                  return;
                }
                navigation.navigate('Main');
              }}
            >
              CONFIRM
            </Button>
          </View>

          <Button variant="danger" block style={{ marginTop: spacing.md }} onPress={() => navigation.navigate('Main')}>
            MARK AS WASTE
          </Button>
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  shell: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 16,
  },
  handle: {
    alignSelf: 'center',
    width: 48,
    height: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountPanel: {
    padding: 20,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: 10,
  },
});
