import React, { useState } from 'react';
import { View, Alert, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native';
import { Text, Button, TextInput, Icon, Card } from '../components';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootNavigationProp, RootStackParamList } from '../navigation/types';
import { useTheme } from '../theme/ThemeProvider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getMockInventoryItem } from '../data/mockInventory';

export function EditBatchScreen() {
  const navigation = useNavigation<RootNavigationProp>();
  const route = useRoute<RouteProp<RootStackParamList, 'EditBatch'>>();
  const { colors, spacing, borderWidth: bw, radii } = useTheme();
  const record = getMockInventoryItem(route.params?.id);

  const [name, setName] = useState(record.name);
  const [brand, setBrand] = useState(record.brand);
  const [qty, setQty] = useState(record.quantityValue);
  const [unit, setUnit] = useState(record.unit);
  const [expiry, setExpiry] = useState(record.expiry);

  const handleDelete = () => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this item? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => navigation.navigate('Main'),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}> 
      <View style={[styles.header, { borderBottomWidth: bw.medium, borderBottomColor: colors.border, paddingHorizontal: spacing.xl, paddingVertical: spacing.lg }]}> 
        <TouchableOpacity
          style={[styles.headerBtn, { borderWidth: bw.medium, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radii.md }]}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={20} />
        </TouchableOpacity>
        <Text variant="label" color="textSubtle" mono tracking="widest">
          EDIT ITEM
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing['4xl'] }}>
        <Card elevated style={{ borderRadius: radii.lg, marginBottom: spacing.lg }}>
          <Text variant="label" color="primary" mono tracking="widest" style={{ marginBottom: spacing.lg }}>
            PRODUCT INFO
          </Text>
          <View style={[styles.previewShell, { backgroundColor: colors.backgroundAlt, borderRadius: radii.md, borderWidth: bw.medium, borderColor: colors.border }]}> 
            <Image source={{ uri: record.imageUri }} style={[styles.previewImage, { borderRadius: radii.md }]} resizeMode="cover" />
          </View>
          <TextInput label="NAME" placeholder="e.g. Susu UHT" value={name} onChangeText={setName} />
          <TextInput label="BRAND" placeholder="e.g. Indofood" value={brand} onChangeText={setBrand} />

          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <TextInput label="QTY" placeholder="1" keyboardType="numeric" value={qty} onChangeText={setQty} style={{ flex: 1 }} mono />
            <TextInput label="UNIT" placeholder="pcs" value={unit} onChangeText={setUnit} style={{ flex: 1 }} />
          </View>

          <TextInput label="EXPIRY" placeholder="YYYY-MM-DD" mono value={expiry} onChangeText={setExpiry} />

          <Button variant="primary" block style={{ marginTop: spacing.md }} onPress={() => navigation.goBack()}>
            SAVE CHANGES
          </Button>
          <Button variant="danger" block style={{ marginTop: spacing.md }} onPress={handleDelete}>
            DELETE ITEM
          </Button>
        </Card>
      </ScrollView>
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
  previewShell: {
    height: 180,
    overflow: 'hidden',
    marginBottom: 16,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
});
