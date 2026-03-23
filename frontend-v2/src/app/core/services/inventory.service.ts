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
    return data as Product[];
  }

  async createProduct(dto: CreateProductDto): Promise<Product> {
    const clinicId = this.requireClinicId();
    
    // insert product
    const { data, error } = await this.supabase
      .from('product')
      .insert({ ...dto, clinic_id: clinicId })
      .select()
      .single();

    if (error) throw error;
    
    // Create initial stock transaction if current_stock > 0
    if (dto.current_stock > 0) {
      const { error: txError } = await this.supabase
        .from('stock_transaction')
        .insert({
          clinic_id: clinicId,
          product_id: data.id,
          quantity: dto.current_stock,
          type: 'IN',
          notes: 'Initial stock setup'
        });
        
      if (txError) throw txError;
    }
    
    return data as Product;
  }
}
