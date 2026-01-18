import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service';
import { Product, StockTransaction } from '../../../core/models/types';

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private supabase = inject(SupabaseService);

  async getProducts(clinicId: string): Promise<Product[]> {
    const { data, error } = await this.supabase.client
      .from('inventory_items')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('deleted', false);

    if (error) throw error;
    
    // Mapper for camelCase
    return (data || []).map((item: any) => ({
      id: item.id,
      clinicId: item.clinic_id,
      name: item.name,
      category: item.category,
      stock: item.stock,
      minStock: item.min_stock,
      price: item.price,
      costPrice: item.cost_price,
      supplier: item.supplier,
      expiryDate: item.expiry_date,
      batchNumber: item.batch_number,
      notes: item.notes
    }));
  }

  async addProduct(product: Partial<Product>): Promise<Product> {
    const dbPayload = {
        id: product.id || crypto.randomUUID(),
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
        notes: product.notes,
        deleted: false
    };

    const { data, error } = await this.supabase.client
      .from('inventory_items')
      .upsert(dbPayload)
      .select()
      .single();

    if (error) throw error;

    return {
        ...product,
        id: data.id,
        clinicId: data.clinic_id,
        stock: data.stock
    } as Product;
  }

  async deleteProduct(id: string): Promise<void> {
    const { error } = await this.supabase.client
        .from('inventory_items')
        .update({ deleted: true })
        .eq('id', id);

    if (error) throw error;
  }

    async addTransaction(transaction: Omit<StockTransaction, 'id'>): Promise<{ transaction: StockTransaction, newStock: number }> {

      // 1. Record Transaction

      const { data: txnData, error: txnError } = await this.supabase.client

          .from('inventory_transactions')

          .insert({

              clinic_id: transaction.clinicId,

              product_id: transaction.productId,

              product_name: transaction.productName,

              type: transaction.type,

              quantity: transaction.quantity,

              date: transaction.date || new Date().toISOString(),

              notes: transaction.notes

          })

          .select()

          .single();

  

      if (txnError) throw txnError;

  

      // 2. Update Stock

      const { data: prodData, error: prodFetchError } = await this.supabase.client

          .from('inventory_items')

          .select('stock')

          .eq('id', transaction.productId)

          .single();

  

      if (prodFetchError) throw prodFetchError;

  

      const newStock = transaction.type === 'IN' 

          ? prodData.stock + transaction.quantity 

          : prodData.stock - transaction.quantity;

  

      const { error: updateError } = await this.supabase.client

          .from('inventory_items')

          .update({ stock: newStock })

          .eq('id', transaction.productId);

  

      if (updateError) throw updateError;

  

      return {

          transaction: {

              id: txnData.id,

              clinicId: txnData.clinic_id,

              productId: txnData.product_id,

              productName: txnData.product_name,

              type: txnData.type,

              quantity: txnData.quantity,

              date: txnData.date,

              notes: txnData.notes

          },

          newStock

      };

    }

  }

  