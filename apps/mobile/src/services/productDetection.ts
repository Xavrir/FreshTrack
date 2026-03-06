import { findMockInventoryByBarcode } from '../data/mockInventory';
import { supabase, isSupabaseConfigured } from './supabase';

export interface ProductDetectionDraft {
  name?: string;
  brand?: string;
  quantityValue?: string;
  unit?: string;
  category?: string;
  storage?: string;
  storageDetail?: string;
  expiryIso?: string;
  barcode?: string;
  imageUri?: string;
  notes?: string;
  confidence?: number;
  sources?: string[];
}

interface DetectProductParams {
  barcode?: string;
  householdId?: string;
}

export async function detectProductDraft({ barcode, householdId }: DetectProductParams): Promise<ProductDetectionDraft | null> {
  if (!barcode) return null;

  const mock = findMockInventoryByBarcode(barcode);

  if (!isSupabaseConfigured || !householdId) {
    return mock
      ? {
          barcode,
          name: mock.name,
          brand: mock.brand,
          quantityValue: mock.quantityValue,
          unit: mock.unit,
          category: mock.category,
          storage: mock.storage,
          storageDetail: mock.storageDetail,
          expiryIso: mock.expiryIso,
          imageUri: mock.imageUri,
          notes: mock.note,
          confidence: 0.92,
          sources: ['mock'],
        }
      : null;
  }

  const { data, error } = await supabase.functions.invoke('product-detect', {
    body: {
      household_id: householdId,
      barcode,
    },
  });

  if (error) {
    if (mock) {
      return {
        barcode,
        name: mock.name,
        brand: mock.brand,
        quantityValue: mock.quantityValue,
        unit: mock.unit,
        category: mock.category,
        storage: mock.storage,
        storageDetail: mock.storageDetail,
        expiryIso: mock.expiryIso,
        imageUri: mock.imageUri,
        notes: mock.note,
        confidence: 0.55,
        sources: ['mock-fallback'],
      };
    }
    throw new Error(error.message);
  }

  return (data?.autofill as ProductDetectionDraft | undefined) ?? null;
}
