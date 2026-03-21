import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import { Product, StockTransaction } from '../../../core/models/types';

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private supabase = inject(SupabaseService);

  private mapProductRow(row: any): Product {
    return {
      id: row.id,
      clinicId: row.clinic_id,
      name: row.name,
      category: row.category,
      stock: row.current_stock ?? 0,
      minStock: row.min_stock ?? 0,
      price: row.price,
      costPrice: row.avg_cost_price ?? 0,
      supplier: '',
      expiryDate: undefined,
      batchNumber: row.barcode ?? undefined,
      notes: undefined,
      deleted: row.deleted
    };
  }

  private mapTransactionRow(row: any): StockTransaction {
    return {
      id: row.id,
      clinicId: row.clinic_id,
      productId: row.product_id,
      productName: row.product?.name ?? '',
      type: row.type,
      quantity: row.total_qty,
      date: row.timestamp,
      notes: row.reason
    };
  }

  async getProducts(clinicId: string): Promise<Product[]> {
    const { data, error } = await this.supabase
      .from('product')
      .select('*')
      .eq('clinic_id', clinicId);

    if (error) throw error;

    return (data || []).map((p: any) => this.mapProductRow(p));
  }

  async getTransactions(clinicId: string): Promise<StockTransaction[]> {
    const { data, error } = await this.supabase
      .from('stock_transaction')
      .select(`
        *,
        product:product_id (
          name
        )
      `)
      .eq('clinic_id', clinicId)
      .order('timestamp', { ascending: false });

    if (error) throw error;

    return (data || []).map((t: any) => this.mapTransactionRow(t));
  }

  async addProduct(product: Partial<Product>): Promise<Product> {
    const dbPayload = {
      id: product.id,
      clinic_id: product.clinicId,
      barcode: product.batchNumber,
      name: product.name,
      category: product.category,
      current_stock: product.stock,
      min_stock: product.minStock,
      price: product.price,
      avg_cost_price: product.costPrice,
      deleted: false
    };

    const { data, error } = await this.supabase
      .from('product')
      .insert(dbPayload)
      .select()
      .single();

    if (error) throw error;

    return this.mapProductRow(data);
  }

  async deleteProduct(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('product')
      .update({ deleted: true })
      .eq('id', id);
    
    if (error) throw error;
  }
}
