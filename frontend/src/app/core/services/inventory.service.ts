import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { DatabaseService } from './database.service';
import { ProcedureType, ProcedureRecipe } from '../models/inventory.types';

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private supabase = inject(SupabaseService);
  private dbService = inject(DatabaseService);

  private get clinicId() {
    const ctx = this.dbService.selectedContextClinic();
    // 'all' is the SUPER_ADMIN global sentinel — not a valid UUID for clinic-scoped queries
    return ctx === 'all' ? null : ctx;
  }

  private get actorId() {
    return this.dbService.currentUser()?.actor_id ?? null;
  }

  // --- Products (canonical inventory) ---

  async getItems() {
    if (!this.clinicId) throw new Error('Clinic context is required');

    const { data, error } = await this.supabase
      .from('product')
      .select('*')
      .eq('clinic_id', this.clinicId)
      .eq('deleted', false)
      .order('name');

    if (error) throw error;
    return data;
  }

  async getItem(id: string) {
    const { data, error } = await this.supabase
      .from('product')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async createItem(item: { name: string; description?: string; unit?: string; current_stock?: number; min_stock?: number; avg_cost_price?: number; price?: number; barcode?: string; category?: string }) {
    if (!this.clinicId) throw new Error('Clinic context is required');

    const { data, error } = await this.supabase
      .from('product')
      .insert({
        clinic_id: this.clinicId,
        name: item.name,
        unit: item.unit ?? 'un',
        description: item.description ?? null,
        current_stock: item.current_stock ?? 0,
        min_stock: item.min_stock ?? 0,
        avg_cost_price: item.avg_cost_price ?? 0,
        price: item.price ?? 0,
        barcode: item.barcode ?? null,
        category: item.category ?? null,
        deleted: false
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateItem(id: string, updates: Partial<{ name: string; description: string; unit: string; min_stock: number; avg_cost_price: number; price: number; barcode: string; category: string }>) {
    const { data, error } = await this.supabase
      .from('product')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteItem(id: string) {
    const { error } = await this.supabase
      .from('product')
      .update({ deleted: true })
      .eq('id', id);

    if (error) throw error;
  }

  // --- Stock movements (via RPC — trigger keeps product.current_stock in sync) ---

  async recordMovement(movement: { item_id: string; qty_change: number; reason?: string; notes?: string }) {
    if (!this.clinicId) throw new Error('Clinic context is required');

    const type = movement.qty_change >= 0 ? 'IN' : 'OUT';
    const qty = Math.abs(movement.qty_change);

    const { data, error } = await this.supabase.rpc('add_stock_movement', {
      p_clinic_id: this.clinicId,
      p_product_id: movement.item_id,
      p_type: type,
      p_qty: qty,
      p_reason: movement.reason ?? 'MANUAL',
      p_notes: movement.notes ?? null,
      p_actor_id: this.actorId
    });

    if (error) throw error;
    return data;
  }

  async getMovements(productId?: string) {
    if (!this.clinicId) throw new Error('Clinic context is required');

    let query = this.supabase
      .from('stock_transaction')
      .select('*, product:product_id(name), actor:actor_id(name)')
      .eq('clinic_id', this.clinicId)
      .order('timestamp', { ascending: false });

    if (productId) {
      query = query.eq('product_id', productId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  // --- Procedure Types ---

  async getProcedureTypes() {
    if (!this.clinicId) throw new Error('Clinic context is required');

    const { data, error } = await this.supabase
      .from('procedure_type')
      .select('*')
      .eq('clinic_id', this.clinicId)
      .order('name');

    if (error) throw error;
    return data as ProcedureType[];
  }

  async createProcedureType(proc: Omit<ProcedureType, 'id' | 'clinic_id' | 'created_at'>) {
    if (!this.clinicId) throw new Error('Clinic context is required');

    const { data, error } = await this.supabase
      .from('procedure_type')
      .insert({ ...proc, clinic_id: this.clinicId })
      .select()
      .single();

    if (error) throw error;
    return data as ProcedureType;
  }

  async updateProcedureType(id: string, updates: Partial<ProcedureType>) {
    const { data, error } = await this.supabase
      .from('procedure_type')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as ProcedureType;
  }

  // --- Procedure Recipes (item_id now references product) ---

  async getRecipes(procedureTypeId: string) {
    const { data, error } = await this.supabase
      .from('procedure_recipe')
      .select(`
        *,
        item:item_id (
          name,
          unit
        )
      `)
      .eq('procedure_type_id', procedureTypeId);

    if (error) throw error;

    return data.map((r: any) => ({
      ...r,
      item_name: r.item?.name,
      unit: r.item?.unit
    })) as ProcedureRecipe[];
  }

  async addRecipeItem(recipe: Omit<ProcedureRecipe, 'id' | 'created_at'>) {
    const { data, error } = await this.supabase
      .from('procedure_recipe')
      .insert(recipe)
      .select()
      .single();

    if (error) throw error;
    return data as ProcedureRecipe;
  }

  async removeRecipeItem(id: string) {
    const { error } = await this.supabase
      .from('procedure_recipe')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // --- Perform Procedure RPC ---

  async performProcedure(procedureTypeId: string, patientId: string | null, notes: string = '') {
    if (!this.clinicId) throw new Error('Clinic context is required');

    const { data, error } = await this.supabase.rpc('perform_procedure', {
      p_clinic_id: this.clinicId,
      p_patient_id: patientId,
      p_professional_id: this.actorId,
      p_procedure_type_id: procedureTypeId,
      p_notes: notes
    });

    if (error) throw error;
    return data; // returns procedure ID (uuid)
  }

  async getProcedureAuditLog() {
    if (!this.clinicId) throw new Error('Clinic context is required');

    const { data, error } = await this.supabase
      .from('stock_transaction')
      .select('*, product:product_id(name), actor:actor_id(name)')
      .eq('clinic_id', this.clinicId)
      .eq('reason', 'PROCEDURE')
      .order('timestamp', { ascending: false })
      .limit(20);

    if (error) throw error;
    return data;
  }
}
