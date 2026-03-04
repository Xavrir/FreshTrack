export interface InventoryBatch {
  id: string;
  name: string;
  brand?: string;
  barcode?: string;
  quantity: number;
  unit: string;
  expiryDate?: string;
  createdAt: string;
}

export interface InventoryEvent {
  id: string;
  batchId: string;
  type: 'consumed' | 'wasted' | 'adjust';
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

export const inventoryRepo = new MockInventoryRepository();
