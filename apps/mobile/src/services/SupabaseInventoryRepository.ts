import { supabase } from './supabase';
import { IInventoryRepository, InventoryBatch, InventoryEvent } from './InventoryRepository';

export class SupabaseInventoryRepository implements IInventoryRepository {
  constructor(private householdId: string, private userId: string) {}

  async getBatches(): Promise<InventoryBatch[]> {
    const { data, error } = await supabase
      .from('inventory_batches')
      .select('*')
      .eq('household_id', this.householdId)
      .is('deleted_at', null)
      .gt('quantity', 0)
      .order('expiry_date', { ascending: true, nullsFirst: false });

    if (error) throw new Error(error.message);

    return (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      brand: row.brand ?? undefined,
      barcode: row.barcode ?? undefined,
      quantity: Number(row.quantity),
      unit: row.unit,
      expiryDate: row.expiry_date ?? undefined,
      createdAt: row.created_at,
    }));
  }

  async getBatch(id: string): Promise<InventoryBatch | null> {
    const { data, error } = await supabase
      .from('inventory_batches')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      name: data.name,
      brand: data.brand ?? undefined,
      barcode: data.barcode ?? undefined,
      quantity: Number(data.quantity),
      unit: data.unit,
      expiryDate: data.expiry_date ?? undefined,
      createdAt: data.created_at,
    };
  }

  async addBatch(batch: Omit<InventoryBatch, 'id' | 'createdAt'>): Promise<InventoryBatch> {
    const { data, error } = await supabase
      .from('inventory_batches')
      .insert({
        household_id: this.householdId,
        name: batch.name,
        brand: batch.brand ?? null,
        barcode: batch.barcode ?? null,
        quantity: batch.quantity,
        unit: batch.unit,
        expiry_date: batch.expiryDate ?? null,
        created_by: this.userId,
      })
      .select()
      .single();

    if (error || !data) throw new Error(error?.message ?? 'Failed to insert batch');

    return {
      id: data.id,
      name: data.name,
      brand: data.brand ?? undefined,
      barcode: data.barcode ?? undefined,
      quantity: Number(data.quantity),
      unit: data.unit,
      expiryDate: data.expiry_date ?? undefined,
      createdAt: data.created_at,
    };
  }

  async recordAction(batchId: string, type: 'consumed' | 'wasted', amount: number): Promise<void> {
    const batch = await this.getBatch(batchId);
    if (!batch) throw new Error('Batch not found');

    const newQuantity = Math.max(0, batch.quantity - amount);

    const [eventResult, updateResult] = await Promise.all([
      supabase.from('inventory_events').insert({
        batch_id: batchId,
        household_id: this.householdId,
        actor_user_id: this.userId,
        event_type: type,
        amount,
        unit: batch.unit,
      }),
      supabase
        .from('inventory_batches')
        .update({
          quantity: newQuantity,
          updated_at: new Date().toISOString(),
          ...(newQuantity === 0 ? { deleted_at: new Date().toISOString() } : {}),
        })
        .eq('id', batchId),
    ]);

    if (eventResult.error) throw new Error(eventResult.error.message);
    if (updateResult.error) throw new Error(updateResult.error.message);
  }
}
