import { findMockInventoryByBarcode } from '../data/mockInventory';
import { supabase } from '../lib/supabase';

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

function mockDraft(barcode: string, confidence: number, source: string): ProductDetectionDraft | null {
  const mock = findMockInventoryByBarcode(barcode);
  if (!mock) return null;
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
    confidence,
    sources: [source],
  };
}

export async function detectProductDraft({ barcode, householdId }: DetectProductParams): Promise<ProductDetectionDraft | null> {
  if (!barcode) return null;

  // Prefer a household-known barcode mapping persisted from a previous add.
  if (householdId) {
    try {
      const { data: mapping } = await supabase
        .from('barcode_mappings')
        .select('name, brand')
        .eq('household_id', householdId)
        .eq('barcode', barcode)
        .maybeSingle();
      if (mapping?.name) {
        return {
          barcode,
          name: mapping.name,
          brand: mapping.brand ?? undefined,
          confidence: 0.9,
          sources: ['barcode-mapping'],
        };
      }
    } catch {
      // fall through to local catalog
    }
  }

  return mockDraft(barcode, 0.92, 'catalog');
}

export async function detectProductFromImage(imageUri: string): Promise<ProductDetectionDraft> {
  // Phase 1: Mock implementation. Real backend vision AI to come later.
  // For now, we return a draft that just carries the image forward.
  return {
    imageUri,
    name: 'Review captured item',
    brand: '',
    category: 'Unsorted',
    storage: 'Review storage',
    notes: 'Phase 1 photo capture saved the image. Update item details before saving.',
    confidence: 0,
    sources: ['camera-capture'],
  };
}
