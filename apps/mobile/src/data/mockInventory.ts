export type MockInventoryStatus = 'good' | 'soon' | 'expired';

export interface MockInventoryItem {
  id: string;
  barcode?: string;
  name: string;
  brand: string;
  qtyLabel: string;
  quantityValue: string;
  unit: string;
  category: string;
  expiry: string;
  expiryIso: string;
  daysLeft: number;
  status: MockInventoryStatus;
  isLowStock: boolean;
  storage: string;
  storageDetail: string;
  addedAt: string;
  note: string;
  imageUri: string;
}

export const MOCK_INVENTORY: MockInventoryItem[] = [
  {
    id: '1',
    barcode: '8999999123456',
    name: 'Organic Strawberries',
    brand: 'Fresh Farms',
    qtyLabel: '450g',
    quantityValue: '450',
    unit: 'grams',
    category: 'Produce',
    expiry: 'Oct 24',
    expiryIso: '2026-10-24',
    daysLeft: 4,
    status: 'soon',
    isLowStock: true,
    storage: 'Main Fridge',
    storageDetail: 'Shelf 2, Bin A',
    addedAt: 'Oct 18, 2023',
    note: 'Sweet, fresh, and ready for breakfast prep. Rotate to the front shelf before tomorrow evening.',
    imageUri: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: '2',
    barcode: '8999999345678',
    name: 'Oat Milk',
    brand: 'Oatly',
    qtyLabel: '1 carton',
    quantityValue: '1',
    unit: 'carton',
    category: 'Dairy Alt',
    expiry: 'Oct 28',
    expiryIso: '2026-10-28',
    daysLeft: 8,
    status: 'good',
    isLowStock: false,
    storage: 'Pantry Door',
    storageDetail: 'Upper Shelf',
    addedAt: 'Oct 19, 2023',
    note: 'Open carton currently in rotation. Keep the backup chilled after opening.',
    imageUri: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: '3',
    name: 'Greek Yogurt',
    brand: 'Nature Valley',
    qtyLabel: '3 cups',
    quantityValue: '3',
    unit: 'cups',
    category: 'Dairy',
    expiry: 'Oct 22',
    expiryIso: '2026-10-22',
    daysLeft: 2,
    status: 'expired',
    isLowStock: true,
    storage: 'Main Fridge',
    storageDetail: 'Back Shelf',
    addedAt: 'Oct 16, 2023',
    note: 'Check seal before use. This batch is now outside the preferred freshness window.',
    imageUri: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: '4',
    name: 'Baby Spinach',
    brand: 'Green Basket',
    qtyLabel: '1 bag',
    quantityValue: '1',
    unit: 'bag',
    category: 'Produce',
    expiry: 'Oct 27',
    expiryIso: '2026-10-27',
    daysLeft: 7,
    status: 'good',
    isLowStock: false,
    storage: 'Crisper Drawer',
    storageDetail: 'Vegetable Bin',
    addedAt: 'Oct 20, 2023',
    note: 'Best used for salads this week. Store dry to extend shelf life.',
    imageUri: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=1200&q=80',
  },
];

export function getMockInventoryItem(id?: string) {
  return MOCK_INVENTORY.find((item) => item.id === id) ?? MOCK_INVENTORY[0];
}

export function findMockInventoryByBarcode(barcode?: string) {
  return MOCK_INVENTORY.find((item) => item.barcode === barcode);
}
