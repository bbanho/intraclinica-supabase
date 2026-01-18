import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { InventoryService } from '../data/inventory.service';
import * as InventoryActions from './inventory.actions';
import { catchError, map, switchMap, from, of } from 'rxjs';

@Injectable()
export class InventoryEffects {
  private actions$ = inject(Actions);
  private service = inject(InventoryService);

  loadProducts$ = createEffect(() => this.actions$.pipe(
    ofType(InventoryActions.loadProducts),
    switchMap(({ clinicId }) => from(this.service.getProducts(clinicId)).pipe(
      map(products => InventoryActions.loadProductsSuccess({ products })),
      catchError(error => of(InventoryActions.loadProductsFailure({ error: error.message })))
    ))
  ));

  addProduct$ = createEffect(() => this.actions$.pipe(
    ofType(InventoryActions.addProduct),
    switchMap(({ product }) => from(this.service.addProduct(product)).pipe(
      map(newProduct => InventoryActions.addProductSuccess({ product: newProduct })),
      catchError(error => of(InventoryActions.addProductFailure({ error: error.message })))
    ))
  ));

  deleteProduct$ = createEffect(() => this.actions$.pipe(
    ofType(InventoryActions.deleteProduct),
    switchMap(({ id }) => from(this.service.deleteProduct(id)).pipe(
      map(() => InventoryActions.deleteProductSuccess({ id })),
      catchError(error => of(InventoryActions.deleteProductFailure({ error: error.message })))
    ))
  ));

  addTransaction$ = createEffect(() => this.actions$.pipe(
    ofType(InventoryActions.addTransaction),
    switchMap(({ transaction }) => from(this.service.addTransaction({
        ...transaction,
        date: new Date().toISOString()
    })).pipe(
      map(({ newStock }) => InventoryActions.addTransactionSuccess({ 
        productId: transaction.productId, 
        newStock 
      })),
      catchError(error => of(InventoryActions.addTransactionFailure({ error: error.message })))
    ))
  ));
}
