import { Injectable, signal, inject } from '@angular/core';
import { SupabaseService } from '../services/supabase.service';
import { ClinicContextService } from '../services/clinic-context.service';
import { Product } from '../services/inventory.service';

export interface Procedure {
  id: string;
  clinic_id: string;
  name: string;
  price: number;
  created_at?: string;
}

export interface Recipe {
  id: string;
  clinic_id: string;
  name: string;
  description?: string;
  created_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class InventoryStore {
  private supabase = inject(SupabaseService).clientInstance;
  private clinicContext = inject(ClinicContextService);

  private _products = signal<Product[]>([]);
  private _procedures = signal<Procedure[]>([]);
  private _recipes = signal<Recipe[]>([]);
  private _isLoading = signal<boolean>(false);
  private _error = signal<string | null>(null);

  readonly products = this._products.asReadonly();
  readonly procedures = this._procedures.asReadonly();
  readonly recipes = this._recipes.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  private requireClinicId(): string {
    const clinicId = this.clinicContext.selectedClinicId();
    if (!clinicId || clinicId === 'all') {
      throw new Error('Contexto de clínica inválido ou ausente para o Inventário.');
    }
    return clinicId;
  }

  async loadProducts(): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const clinicId = this.requireClinicId();

      const { data, error } = await this.supabase
        .from('product')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('name');

      if (error) throw error;

      const mappedData = (data as any[]).map(({ avg_cost_price, ...rest }) => ({
        ...rest,
        cost: avg_cost_price ?? 0
      })) as Product[];

      this._products.set(mappedData);
    } catch (e: any) {
      this._error.set(e.message || 'Erro ao carregar produtos');
      this._products.set([]);
    } finally {
      this._isLoading.set(false);
    }
  }

  async loadProcedures(): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const clinicId = this.requireClinicId();

      const { data, error } = await this.supabase
        .from('procedure')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('name');

      if (error) throw error;

      this._procedures.set(data as Procedure[]);
    } catch (e: any) {
      this._error.set(e.message || 'Erro ao carregar procedimentos');
      this._procedures.set([]);
    } finally {
      this._isLoading.set(false);
    }
  }

  async loadRecipes(): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const clinicId = this.requireClinicId();

      const { data, error } = await this.supabase
        .from('recipe')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('name');

      if (error) throw error;

      this._recipes.set(data as Recipe[]);
    } catch (e: any) {
      this._error.set(e.message || 'Erro ao carregar receitas');
      this._recipes.set([]);
    } finally {
      this._isLoading.set(false);
    }
  }
}
