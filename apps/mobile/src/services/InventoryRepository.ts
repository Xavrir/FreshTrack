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
  amount?: number;
  unit?: string;
  batchName?: string;
  createdAt: string;
}

export interface IInventoryRepository {
  getBatches(): Promise<InventoryBatch[]>;
  getBatch(id: string): Promise<InventoryBatch | null>;
  addBatch(batch: Omit<InventoryBatch, 'id' | 'createdAt'>): Promise<InventoryBatch>;
  updateBatch(id: string, batch: Omit<InventoryBatch, 'id' | 'createdAt'>): Promise<InventoryBatch>;
  deleteBatch(id: string): Promise<void>;
  recordAction(batchId: string, type: 'consumed' | 'wasted', amount: number): Promise<void>;
  getEvents(batchId: string): Promise<InventoryEvent[]>;
  getHistory(): Promise<InventoryEvent[]>;
}

export class MockInventoryRepository implements IInventoryRepository {
  private batches: InventoryBatch[] = [
    { id: '1', name: 'Susu UHT Diamond', quantity: 1, unit: 'pcs', expiryDate: '2026-10-10', createdAt: new Date().toISOString() },
    { id: '2', name: 'Indomie Goreng', quantity: 5, unit: 'pcs', expiryDate: '2026-10-24', createdAt: new Date().toISOString() },
  ];
  private events: InventoryEvent[] = [];

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
    this.events.unshift({ id: `${newBatch.id}-created`, batchId: newBatch.id, type: 'created', amount: newBatch.quantity, unit: newBatch.unit, batchName: newBatch.name, createdAt: new Date().toISOString() });
    return newBatch;
  }

  async updateBatch(id: string, batch: Omit<InventoryBatch, 'id' | 'createdAt'>) {
    const index = this.batches.findIndex((item) => item.id === id);
    if (index === -1) throw new Error('Inventory item not found');
    const updated = { ...this.batches[index], ...batch };
    this.batches[index] = updated;
    this.events.unshift({ id: `${id}-adjusted-${Date.now()}`, batchId: id, type: 'adjusted', amount: updated.quantity, unit: updated.unit, batchName: updated.name, createdAt: new Date().toISOString() });
    return updated;
  }

  async deleteBatch(id: string) {
    const batch = this.batches.find((item) => item.id === id);
    this.batches = this.batches.filter((item) => item.id !== id);
    if (batch) {
      this.events.unshift({ id: `${id}-deleted-${Date.now()}`, batchId: id, type: 'deleted', unit: batch.unit, batchName: batch.name, createdAt: new Date().toISOString() });
    }
  }

  async recordAction(batchId: string, type: 'consumed' | 'wasted', amount: number) {
    const batch = this.batches.find(b => b.id === batchId);
    if (batch) {
      batch.quantity = Math.max(0, batch.quantity - amount);
      this.events.unshift({ id: `${batchId}-${type}-${Date.now()}`, batchId, type, amount, unit: batch.unit, batchName: batch.name, createdAt: new Date().toISOString() });
    }
  }

  async getEvents(batchId: string) {
    return this.events.filter((event) => event.batchId === batchId);
  }

  async getHistory() {
    return [...this.events];
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

interface ApiInventoryEvent {
  id: string;
  batchId: string;
  eventType: InventoryEvent['type'];
  amount?: number | null;
  unit?: string | null;
  batchName?: string | null;
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

function mapApiEvent(event: ApiInventoryEvent): InventoryEvent {
  return {
    id: event.id,
    batchId: event.batchId,
    type: event.eventType,
    amount: event.amount ?? undefined,
    unit: event.unit ?? undefined,
    batchName: event.batchName ?? undefined,
    createdAt: event.createdAt,
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

  async updateBatch(id: string, batch: Omit<InventoryBatch, 'id' | 'createdAt'>): Promise<InventoryBatch> {
    const updated = await authenticatedApiRequest<ApiInventoryBatch>(`/v1/inventory/${id}`, {
      method: 'PATCH',
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
    return mapApiBatch(updated);
  }

  async deleteBatch(id: string): Promise<void> {
    await authenticatedApiRequest(`/v1/inventory/${id}`, { method: 'DELETE' });
  }

  async recordAction(batchId: string, type: 'consumed' | 'wasted', amount: number): Promise<void> {
    await authenticatedApiRequest(`/v1/inventory/${batchId}/${type === 'consumed' ? 'consume' : 'waste'}`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }

  async getEvents(batchId: string): Promise<InventoryEvent[]> {
    const events = await authenticatedApiRequest<ApiInventoryEvent[]>(`/v1/inventory/${batchId}/events`);
    return events.map(mapApiEvent);
  }

  async getHistory(): Promise<InventoryEvent[]> {
    const events = await authenticatedApiRequest<ApiInventoryEvent[]>('/v1/history');
    return events.map(mapApiEvent);
  }
}

export const inventoryRepo = isApiConfigured ? new ApiInventoryRepository() : new MockInventoryRepository();
