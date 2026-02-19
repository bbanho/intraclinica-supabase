import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { DatabaseService } from './database.service';
import { InventoryItem, InventoryMovement, ProcedureType, ProcedureRecipe } from '../models/inventory.types';

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private supabase = inject(SupabaseService);
  private dbService = inject(DatabaseService);

  private get clinicId() {
    return this.dbService.selectedContextClinic();
  }

  private get actorId() {
    return this.dbService.currentUser()?.actor_id || this.dbService.currentUser()?.id;
  }

  // --- Inventory Items ---

  async getItems() {
    if (!this.clinicId) throw new Error('Clinic context is required');
    
    const { data, error } = await this.supabase
      .from('inventory_item')
      .select('*')
      .eq('clinic_id', this.clinicId)
      .order('name');
      
    if (error) throw error;
    return data as InventoryItem[];
  }

  async getItem(id: string) {
    const { data, error } = await this.supabase
      .from('inventory_item')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) throw error;
    return data as InventoryItem;
  }

  async createItem(item: Omit<InventoryItem, 'id' | 'clinic_id' | 'created_at' | 'updated_at'>) {
    if (!this.clinicId) throw new Error('Clinic context is required');

    const { data, error } = await this.supabase
      .from('inventory_item')
      .insert({ ...item, clinic_id: this.clinicId })
      .select()
      .single();
      
    if (error) throw error;
    return data as InventoryItem;
  }

  async updateItem(id: string, updates: Partial<InventoryItem>) {
    const { data, error } = await this.supabase
      .from('inventory_item')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    return data as InventoryItem;
  }

  async deleteItem(id: string) {
    const { error } = await this.supabase
      .from('inventory_item')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  }

  // --- Movements ---

  async recordMovement(movement: Omit<InventoryMovement, 'id' | 'clinic_id' | 'created_at' | 'actor_id'>) {
    if (!this.clinicId) throw new Error('Clinic context is required');

    // 1. Record movement
    const { error: moveError } = await this.supabase
      .from('inventory_movement')
      .insert({
        ...movement,
        clinic_id: this.clinicId,
        actor_id: this.actorId
      });
      
    if (moveError) throw moveError;

    // 2. Update item stock (Manual update as perform_procedure loop handles auto deduction)
    const item = await this.getItem(movement.item_id);
    const newStock = Number(item.current_stock) + Number(movement.qty_change);

    const { error: updateError } = await this.supabase
      .from('inventory_item')
      .update({ current_stock: newStock, updated_at: new Date().toISOString() })
      .eq('id', movement.item_id);

    if (updateError) throw updateError;
  }

  async getMovements(itemId?: string) {
    if (!this.clinicId) throw new Error('Clinic context is required');

    let query = this.supabase
      .from('inventory_movement')
      .select('*, actor:actor_id(name)') 
      .eq('clinic_id', this.clinicId)
      .order('created_at', { ascending: false });

    if (itemId) {
      query = query.eq('item_id', itemId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as (InventoryMovement & { actor?: { name: string } })[];
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

  // --- Procedure Recipes ---

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

  // --- RPC Calls & Audit ---
  
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
      return data; // returns procedure ID
  }

  async getProcedureAuditLog() {
    if (!this.clinicId) throw new Error('Clinic context is required');

    const { data, error } = await this.supabase
      .from('inventory_movement')
      .select('*, actor:actor_id(name)')
      .eq('clinic_id', this.clinicId)
      .eq('reason', 'PROCEDURE')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return data as (InventoryMovement & { actor?: { name: string } })[];
  }
}
