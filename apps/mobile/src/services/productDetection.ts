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

const OPEN_FOOD_FACTS_UA = 'FreshTrack/1.0 (household inventory app)';

function parseQuantity(raw?: string): { quantityValue?: string; unit?: string } {
  if (!raw) return {};
  // e.g. "330 ml", "1.5 L", "500g", "2 x 1 l" -> take the first number + unit
  const match = raw.match(/([\d.,]+)\s*([a-zA-Z]+)/);
  if (!match) return {};
  let value = parseFloat(match[1].replace(',', '.'));
  if (Number.isNaN(value)) return {};
  const unitRaw = match[2].toLowerCase();
  // Centiliters -> milliliters (33 cl = 330 ml)
  if (unitRaw === 'cl') {
    value = value * 10;
    return { quantityValue: String(value), unit: 'ml' };
  }
  const unitMap: Record<string, string> = {
    g: 'grams', gr: 'grams', gram: 'grams', grams: 'grams',
    kg: 'kg', ml: 'ml', l: 'liters', lt: 'liters', liter: 'liters', litre: 'liters',
    pcs: 'pieces', pc: 'pieces', piece: 'pieces', pack: 'pack',
  };
  return { quantityValue: String(value), unit: unitMap[unitRaw] ?? unitRaw };
}

async function openFoodFactsDraft(barcode: string): Promise<ProductDetectionDraft | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json` +
        '?fields=product_name,product_name_en,brands,quantity,categories,image_url',
      { signal: controller.signal, headers: { 'User-Agent': OPEN_FOOD_FACTS_UA } },
    );
    if (!res.ok) return null;
    const json = await res.json();
    if (json?.status !== 1 || !json.product) return null;

    const p = json.product;
    const name: string | undefined = p.product_name || p.product_name_en;
    if (!name) return null;

    const brand: string | undefined = typeof p.brands === 'string' ? p.brands.split(',')[0]?.trim() : undefined;
    const category: string | undefined =
      typeof p.categories === 'string' ? p.categories.split(',')[0]?.trim() : undefined;
    const { quantityValue, unit } = parseQuantity(p.quantity);

    return {
      barcode,
      name,
      brand: brand || undefined,
      category: category || undefined,
      quantityValue,
      unit,
      imageUri: typeof p.image_url === 'string' ? p.image_url : undefined,
      confidence: 0.95,
      sources: ['open-food-facts'],
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
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

  // Look up the barcode against the global Open Food Facts catalog (foods & drinks).
  const offDraft = await openFoodFactsDraft(barcode);
  if (offDraft) return offDraft;

  // Last resort: local demo catalog.
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
