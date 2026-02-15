import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import { Product, StockTransaction } from '../../../core/models/types';

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private supabase = inject(SupabaseService);

  async getProducts(clinicId: string): Promise<Product[]> {
    const { data, error } = await this.supabase
      .from('products')
      .select('*')
      .eq('clinic_id', clinicId);

    if (error) throw error;
    
    // Mapeamento Snake Case (DB) -> Camel Case (App)
    // Assumindo que o DB retorna snake_case. Se o cliente supabase estiver tipado, isso pode ser ajustado.
    return (data || []).map((p: any) => ({
      ...p,
      clinicId: p.clinic_id,
      minStock: p.min_stock,
      costPrice: p.cost_price,
      expiryDate: p.expiry_date,
      batchNumber: p.batch_number
    })) as Product[];
  }

  async getTransactions(clinicId: string): Promise<StockTransaction[]> {
    const { data, error } = await this.supabase
      .from('stock_transactions')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('date', { ascending: false });

    if (error) throw error;
    
    return (data || []).map((t: any) => ({
      id: t.id,
      clinicId: t.clinic_id,
      productId: t.product_id,
      productName: t.product_name,
      type: t.type,
      quantity: t.quantity,
      date: t.date,
      notes: t.notes
    })) as StockTransaction[];
  }

  async addProduct(product: Partial<Product>): Promise<Product> {
    // Converter Camel -> Snake
    const dbPayload = {
      id: product.id,
      clinic_id: product.clinicId,
      name: product.name,
      category: product.category,
      stock: product.stock,
      min_stock: product.minStock,
      price: product.price,
      cost_price: product.costPrice,
      supplier: product.supplier,
      expiry_date: product.expiryDate,
      batch_number: product.batchNumber,
      notes: product.notes
    };

    const { data, error } = await this.supabase
      .from('products')
      .insert(dbPayload)
      .select()
      .single();

    if (error) throw error;

    const p: any = data;
    return {
      ...p,
      clinicId: p.clinic_id,
      minStock: p.min_stock,
      costPrice: p.cost_price,
      expiryDate: p.expiry_date,
      batchNumber: p.batch_number
    } as Product;
  }

  async deleteProduct(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('products')
      .update({ deleted: true })
      .eq('id', id);
    
    if (error) throw error;
  }
}
