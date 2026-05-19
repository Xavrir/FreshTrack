import { findMockInventoryByBarcode } from '../data/mockInventory';
import { authenticatedApiRequest, isApiConfigured } from './api';

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

  if (!isApiConfigured || !householdId) {
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

  try {
    const data = await authenticatedApiRequest<{ autofill?: ProductDetectionDraft }>('/v1/products/detect', {
      method: 'POST',
      body: JSON.stringify({ barcode }),
    });

    return data.autofill ?? null;
  } catch (error) {
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
    throw error instanceof Error ? error : new Error('Product detection failed');
  }
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
