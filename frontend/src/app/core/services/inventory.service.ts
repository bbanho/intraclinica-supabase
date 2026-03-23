import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { ClinicContextService } from './clinic-context.service';

export interface Product {
  id: string;
  clinic_id: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  min_stock: number;
  current_stock: number;
  barcode: string | null;
  created_at?: string;
}

export type CreateProductDto = Omit<Product, 'id' | 'clinic_id' | 'created_at'>;

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private supabase = inject(SupabaseService).clientInstance;
  private clinicContext = inject(ClinicContextService);

  private requireClinicId(): string {
    const clinicId = this.clinicContext.selectedClinicId();
    if (!clinicId || clinicId === 'all') {
      throw new Error('Invalid or missing Clinic Context for Inventory feature.');
    }
    return clinicId;
  }

  async getProducts(): Promise<Product[]> {
    const clinicId = this.requireClinicId();
    const { data, error } = await this.supabase
      .from('product')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('name');

    if (error) throw error;
    
    // Map avg_cost_price (DB column) -> cost (interface property)
    return (data as any[]).map(p => ({
      ...p,
      cost: p.avg_cost_price ?? 0
    })) as Product[];
  }

  async createProduct(dto: CreateProductDto): Promise<Product> {
    const clinicId = this.requireClinicId();
    
    // insert product via RPC to guarantee atomicity of product + initial stock transaction
    const { data, error } = await this.supabase
      .rpc('create_product_with_stock', {
        p_clinic_id: clinicId,
        p_name: dto.name,
        p_category: dto.category,
        p_price: dto.price,
        p_cost: dto.cost || 0,
        p_min_stock: dto.min_stock || 0,
        p_current_stock: dto.current_stock || 0,
        p_barcode: dto.barcode
      });

    if (error) throw error;
    
    return data as Product;
  }
}
