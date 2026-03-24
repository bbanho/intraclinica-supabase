import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { ClinicContextService } from './clinic-context.service';

export interface ProcedureType {
  id: string;
  clinic_id: string;
  name: string;
  code: string | null;
  price: number;
  active: boolean;
  created_at?: string;
}

export interface ProcedureRecipe {
  id: string;
  procedure_type_id: string;
  item_id: string;
  quantity: number;
  created_at?: string;
  item_name?: string;
  unit?: string;
}

export interface CreateProcedureDto {
  name: string;
  code?: string | null;
  price: number;
  active?: boolean;
}

export interface UpdateProcedureDto extends Partial<CreateProcedureDto> {}

export interface AddRecipeItemDto {
  procedure_type_id: string;
  item_id: string;
  quantity: number;
}

@Injectable({
  providedIn: 'root'
})
export class ProcedureService {
  private supabase = inject(SupabaseService).clientInstance;
  private clinicContext = inject(ClinicContextService);

  private requireClinicId(): string {
    const clinicId = this.clinicContext.selectedClinicId();
    if (!clinicId || clinicId === 'all') {
      throw new Error('Invalid or missing Clinic Context for Procedure feature.');
    }
    return clinicId;
  }

  async getProcedureTypes(): Promise<ProcedureType[]> {
    const clinicId = this.requireClinicId();
    const { data, error } = await this.supabase
      .from('procedure_type')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('name');

    if (error) throw error;
    return data as ProcedureType[];
  }

  async createProcedureType(dto: CreateProcedureDto): Promise<ProcedureType> {
    const clinicId = this.requireClinicId();
    const { data, error } = await this.supabase
      .from('procedure_type')
      .insert({
        clinic_id: clinicId,
        name: dto.name,
        code: dto.code || null,
        price: dto.price,
        active: dto.active ?? true
      })
      .select()
      .single();

    if (error) throw error;
    return data as ProcedureType;
  }

  async updateProcedureType(id: string, dto: UpdateProcedureDto): Promise<ProcedureType> {
    const { data, error } = await this.supabase
      .from('procedure_type')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as ProcedureType;
  }

  async getRecipeForProcedure(procedureId: string): Promise<ProcedureRecipe[]> {
    const { data, error } = await this.supabase
      .from('procedure_recipe')
      .select(`
        *,
        item:product(id, name, unit)
      `)
      .eq('procedure_type_id', procedureId);

    if (error) throw error;
    
    return (data as any[]).map(recipe => ({
      ...recipe,
      item_name: recipe.item?.name,
      unit: recipe.item?.unit
    })) as ProcedureRecipe[];
  }

  async addRecipeItem(dto: AddRecipeItemDto): Promise<ProcedureRecipe> {
    const { data, error } = await this.supabase
      .from('procedure_recipe')
      .insert({
        procedure_type_id: dto.procedure_type_id,
        item_id: dto.item_id,
        quantity: dto.quantity
      })
      .select()
      .single();

    if (error) throw error;
    return data as ProcedureRecipe;
  }

  async removeRecipeItem(recipeId: string): Promise<void> {
    const { error } = await this.supabase
      .from('procedure_recipe')
      .delete()
      .eq('id', recipeId);

    if (error) throw error;
  }
}
