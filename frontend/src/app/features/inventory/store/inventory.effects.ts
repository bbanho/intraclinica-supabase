import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { InventoryService } from '../../../core/services/inventory.service';
import { Product, StockTransaction } from '../../../core/models/types';
import * as InventoryActions from './inventory.actions';
import { catchError, map, switchMap, from, of } from 'rxjs';

/** Map a raw DB product row (or core service row) → NgRx Product shape */
function toProduct(row: any): Product {
  return {
    id: row.id,
    clinicId: row.clinic_id ?? row.clinicId ?? '',
    name: row.name ?? '',
    category: row.category ?? '',
    stock: row.current_stock ?? row.stock ?? 0,
    minStock: row.min_stock ?? row.minStock ?? 0,
    price: row.price ?? 0,
    costPrice: row.avg_cost_price ?? row.costPrice ?? 0,
    supplier: '',
    batchNumber: row.barcode ?? row.batchNumber ?? undefined,
    deleted: row.deleted ?? false,
  };
}

/** Map a raw DB stock_transaction row → NgRx StockTransaction shape */
function toTransaction(row: any): StockTransaction {
  return {
    id: row.id,
    clinicId: row.clinic_id ?? row.clinicId ?? '',
    productId: row.product_id ?? row.productId ?? '',
    productName: (row.product as any)?.name ?? row.productName ?? '',
    type: row.type as 'IN' | 'OUT',
    quantity: row.total_qty ?? row.quantity ?? 0,
    date: row.timestamp ?? row.date ?? '',
    notes: row.reason ?? row.notes ?? undefined,
  };
}

@Injectable()
export class InventoryEffects {
  private actions$ = inject(Actions);
  private service = inject(InventoryService);

  /** clinicId is handled internally by InventoryService via DatabaseService context */
  loadProducts$ = createEffect(() => this.actions$.pipe(
    ofType(InventoryActions.loadProducts),
    switchMap(() => from(this.service.getItems()).pipe(
      map(rows => InventoryActions.loadProductsSuccess({ products: rows.map(toProduct) })),
      catchError(error => of(InventoryActions.loadProductsFailure({ error: (error as Error).message })))
    ))
  ));

  loadTransactions$ = createEffect(() => this.actions$.pipe(
    ofType(InventoryActions.loadTransactions),
    switchMap(() => from(this.service.getMovements()).pipe(
      map(rows => InventoryActions.loadTransactionsSuccess({ transactions: rows.map(toTransaction) })),
      catchError(error => of(InventoryActions.loadTransactionsFailure({ error: (error as Error).message })))
    ))
  ));

  addProduct$ = createEffect(() => this.actions$.pipe(
    ofType(InventoryActions.addProduct),
    switchMap(({ product }) => from(this.service.createItem({
      name: product.name ?? '',
      category: product.category ?? undefined,
      current_stock: product.stock ?? 0,
      min_stock: product.minStock ?? 0,
      avg_cost_price: product.costPrice ?? 0,
      price: product.price ?? 0,
      barcode: product.batchNumber ?? undefined,
    })).pipe(
      map(row => InventoryActions.addProductSuccess({ product: toProduct(row) })),
      catchError(error => of(InventoryActions.addProductFailure({ error: (error as Error).message })))
    ))
  ));

  deleteProduct$ = createEffect(() => this.actions$.pipe(
    ofType(InventoryActions.deleteProduct),
    switchMap(({ id }) => from(this.service.deleteItem(id)).pipe(
      map(() => InventoryActions.deleteProductSuccess({ id })),
      catchError(error => of(InventoryActions.deleteProductFailure({ error: (error as Error).message })))
    ))
  ));
}
