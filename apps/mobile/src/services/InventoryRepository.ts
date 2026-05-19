import { authenticatedApiRequest, isApiConfigured } from './api';

export interface InventoryBatch {
  id: string;
  name: string;
  brand?: string;
  barcode?: string;
  quantity: number;
  unit: string;
  category?: string;
  storage?: string;
  storageDetail?: string;
  expiryDate?: string;
  imageUrl?: string;
  notes?: string;
  createdAt: string;
}

export interface InventoryEvent {
  id: string;
  batchId: string;
  type: 'created' | 'consumed' | 'wasted' | 'adjusted' | 'deleted';
  amount: number;
  unit: string;
  createdAt: string;
}

export interface IInventoryRepository {
  getBatches(): Promise<InventoryBatch[]>;
  getBatch(id: string): Promise<InventoryBatch | null>;
  addBatch(batch: Omit<InventoryBatch, 'id' | 'createdAt'>): Promise<InventoryBatch>;
  recordAction(batchId: string, type: 'consumed' | 'wasted', amount: number): Promise<void>;
}

export class MockInventoryRepository implements IInventoryRepository {
  private batches: InventoryBatch[] = [
    { id: '1', name: 'Susu UHT Diamond', quantity: 1, unit: 'pcs', expiryDate: '2026-10-10', createdAt: new Date().toISOString() },
    { id: '2', name: 'Indomie Goreng', quantity: 5, unit: 'pcs', expiryDate: '2026-10-24', createdAt: new Date().toISOString() },
  ];

  async getBatches() {
    return [...this.batches];
  }

  async getBatch(id: string) {
    return this.batches.find(b => b.id === id) || null;
  }

  async addBatch(batch: Omit<InventoryBatch, 'id' | 'createdAt'>) {
    const newBatch: InventoryBatch = {
      ...batch,
      id: Math.random().toString(36).substring(7),
      createdAt: new Date().toISOString()
    };
    this.batches.push(newBatch);
    return newBatch;
  }

  async recordAction(batchId: string, type: 'consumed' | 'wasted', amount: number) {
    const batch = this.batches.find(b => b.id === batchId);
    if (batch) {
      batch.quantity = Math.max(0, batch.quantity - amount);
    }
  }
}

interface ApiInventoryBatch {
  id: string;
  name: string;
  brand?: string | null;
  barcode?: string | null;
  quantity: number;
  unit: string;
  category?: string | null;
  storage?: string | null;
  storageDetail?: string | null;
  expiryDate?: string | null;
  imageUrl?: string | null;
  notes?: string | null;
  createdAt: string;
}

function mapApiBatch(batch: ApiInventoryBatch): InventoryBatch {
  return {
    id: batch.id,
    name: batch.name,
    brand: batch.brand ?? undefined,
    barcode: batch.barcode ?? undefined,
    quantity: batch.quantity,
    unit: batch.unit,
    category: batch.category ?? undefined,
    storage: batch.storage ?? undefined,
    storageDetail: batch.storageDetail ?? undefined,
    expiryDate: batch.expiryDate ?? undefined,
    imageUrl: batch.imageUrl ?? undefined,
    notes: batch.notes ?? undefined,
    createdAt: batch.createdAt,
  };
}

export class ApiInventoryRepository implements IInventoryRepository {
  async getBatches(): Promise<InventoryBatch[]> {
    const batches = await authenticatedApiRequest<ApiInventoryBatch[]>('/v1/inventory');
    return batches.map(mapApiBatch);
  }

  async getBatch(id: string): Promise<InventoryBatch | null> {
    try {
      const batch = await authenticatedApiRequest<ApiInventoryBatch>(`/v1/inventory/${id}`);
      return mapApiBatch(batch);
    } catch {
      return null;
    }
  }

  async addBatch(batch: Omit<InventoryBatch, 'id' | 'createdAt'>): Promise<InventoryBatch> {
    const created = await authenticatedApiRequest<ApiInventoryBatch>('/v1/inventory', {
      method: 'POST',
      body: JSON.stringify({
        name: batch.name,
        brand: batch.brand,
        barcode: batch.barcode,
        quantity: batch.quantity,
        unit: batch.unit,
        category: batch.category,
        storage: batch.storage,
        storageDetail: batch.storageDetail,
        expiryDate: batch.expiryDate,
        imageUrl: batch.imageUrl,
        notes: batch.notes,
      }),
    });
    return mapApiBatch(created);
  }

  async recordAction(batchId: string, type: 'consumed' | 'wasted', amount: number): Promise<void> {
    await authenticatedApiRequest(`/v1/inventory/${batchId}/${type === 'consumed' ? 'consume' : 'waste'}`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }
}

export const inventoryRepo = isApiConfigured ? new ApiInventoryRepository() : new MockInventoryRepository();
