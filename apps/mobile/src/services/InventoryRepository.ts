import { supabase } from '../lib/supabase';

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

type HistoryAction = 'add' | 'edit' | 'consume' | 'waste' | 'delete';

const ACTION_TO_TYPE: Record<HistoryAction, InventoryEvent['type']> = {
  add: 'created',
  edit: 'adjusted',
  consume: 'consumed',
  waste: 'wasted',
  delete: 'deleted',
};

interface BatchRow {
  id: string;
  name: string;
  brand: string | null;
  barcode: string | null;
  quantity: number;
  unit: string;
  expiry_date: string | null;
  created_at: string;
}

interface HistoryRow {
  id: string;
  inventory_batch_id: string;
  action: HistoryAction;
  quantity: number | null;
  created_at: string;
  inventory_batches?: { name?: string | null } | null;
}

function mapBatch(row: BatchRow): InventoryBatch {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand ?? undefined,
    barcode: row.barcode ?? undefined,
    quantity: Number(row.quantity),
    unit: row.unit,
    expiryDate: row.expiry_date ?? undefined,
    createdAt: row.created_at,
  };
}

function mapHistory(row: HistoryRow, unit?: string): InventoryEvent {
  return {
    id: row.id,
    batchId: row.inventory_batch_id,
    type: ACTION_TO_TYPE[row.action] ?? 'adjusted',
    amount: row.quantity ?? undefined,
    unit,
    batchName: row.inventory_batches?.name ?? undefined,
    createdAt: row.created_at,
  };
}

async function requireContext(): Promise<{ userId: string; householdId: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) throw new Error('Not authenticated');
  const { data: membership } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (!membership?.household_id) throw new Error('No household');
  return { userId, householdId: membership.household_id as string };
}

export class SupabaseInventoryRepository implements IInventoryRepository {
  async getBatches(): Promise<InventoryBatch[]> {
    const { householdId } = await requireContext();
    const { data, error } = await supabase
      .from('inventory_batches')
      .select('id, name, brand, barcode, quantity, unit, expiry_date, created_at')
      .eq('household_id', householdId)
      .is('deleted_at', null)
      .order('expiry_date', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapBatch);
  }

  async getBatch(id: string): Promise<InventoryBatch | null> {
    const { data, error } = await supabase
      .from('inventory_batches')
      .select('id, name, brand, barcode, quantity, unit, expiry_date, created_at')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();
    if (error || !data) return null;
    return mapBatch(data);
  }

  async addBatch(batch: Omit<InventoryBatch, 'id' | 'createdAt'>): Promise<InventoryBatch> {
    const { userId, householdId } = await requireContext();
    const { data, error } = await supabase
      .from('inventory_batches')
      .insert({
        household_id: householdId,
        created_by: userId,
        name: batch.name,
        brand: batch.brand ?? null,
        barcode: batch.barcode ?? null,
        quantity: batch.quantity,
        unit: batch.unit,
        expiry_date: batch.expiryDate ?? null,
      })
      .select('id, name, brand, barcode, quantity, unit, expiry_date, created_at')
      .maybeSingle();
    if (error || !data) throw new Error(error?.message ?? 'Could not add item');

    await supabase.from('inventory_history').insert({
      inventory_batch_id: data.id,
      household_id: householdId,
      user_id: userId,
      action: 'add',
      quantity: batch.quantity,
    });

    if (batch.barcode) {
      await supabase.from('barcode_mappings').upsert({
        household_id: householdId,
        barcode: batch.barcode,
        name: batch.name,
        brand: batch.brand ?? null,
        source: 'manual',
        updated_at: new Date().toISOString(),
      });
    }

    return mapBatch(data);
  }

  async updateBatch(id: string, batch: Omit<InventoryBatch, 'id' | 'createdAt'>): Promise<InventoryBatch> {
    const { userId, householdId } = await requireContext();
    const { data, error } = await supabase
      .from('inventory_batches')
      .update({
        name: batch.name,
        brand: batch.brand ?? null,
        barcode: batch.barcode ?? null,
        quantity: batch.quantity,
        unit: batch.unit,
        expiry_date: batch.expiryDate ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, name, brand, barcode, quantity, unit, expiry_date, created_at')
      .maybeSingle();
    if (error || !data) throw new Error(error?.message ?? 'Could not update item');

    await supabase.from('inventory_history').insert({
      inventory_batch_id: id,
      household_id: householdId,
      user_id: userId,
      action: 'edit',
      quantity: batch.quantity,
    });

    return mapBatch(data);
  }

  async deleteBatch(id: string): Promise<void> {
    const { userId, householdId } = await requireContext();
    const { data: existing } = await supabase
      .from('inventory_batches')
      .select('quantity')
      .eq('id', id)
      .maybeSingle();

    await supabase.from('inventory_history').insert({
      inventory_batch_id: id,
      household_id: householdId,
      user_id: userId,
      action: 'delete',
      quantity: existing?.quantity ?? 0,
    });

    const { error } = await supabase
      .from('inventory_batches')
      .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(error.message);
  }

  async recordAction(batchId: string, type: 'consumed' | 'wasted', amount: number): Promise<void> {
    const { userId, householdId } = await requireContext();
    const { data: existing, error: fetchError } = await supabase
      .from('inventory_batches')
      .select('quantity')
      .eq('id', batchId)
      .maybeSingle();
    if (fetchError || !existing) throw new Error(fetchError?.message ?? 'Item not found');

    // History first, so a failed soft-delete cannot silently drop the record.
    const { error: historyError } = await supabase.from('inventory_history').insert({
      inventory_batch_id: batchId,
      household_id: householdId,
      user_id: userId,
      action: type === 'consumed' ? 'consume' : 'waste',
      quantity: amount,
    });
    if (historyError) throw new Error(historyError.message);

    const newQuantity = Number(existing.quantity) - amount;
    if (newQuantity <= 0) {
      const { error } = await supabase
        .from('inventory_batches')
        .update({ quantity: 0, deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', batchId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase
        .from('inventory_batches')
        .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
        .eq('id', batchId);
      if (error) throw new Error(error.message);
    }
  }

  async getEvents(batchId: string): Promise<InventoryEvent[]> {
    const { data, error } = await supabase
      .from('inventory_history')
      .select('id, inventory_batch_id, action, quantity, created_at, inventory_batches(name)')
      .eq('inventory_batch_id', batchId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => mapHistory(row as HistoryRow));
  }

  async getHistory(): Promise<InventoryEvent[]> {
    const { householdId } = await requireContext();
    const { data, error } = await supabase
      .from('inventory_history')
      .select('id, inventory_batch_id, action, quantity, created_at, inventory_batches(name)')
      .eq('household_id', householdId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => mapHistory(row as HistoryRow));
  }
}

export const inventoryRepo: IInventoryRepository = new SupabaseInventoryRepository();
