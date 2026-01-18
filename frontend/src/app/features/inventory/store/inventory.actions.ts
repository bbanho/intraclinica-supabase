import { createAction, props } from '@ngrx/store';
import { Product } from '../../../core/models/types';

export const loadProducts = createAction('[Inventory] Load Products', props<{ clinicId: string }>());
export const loadProductsSuccess = createAction('[Inventory] Load Products Success', props<{ products: Product[] }>());
export const loadProductsFailure = createAction('[Inventory] Load Products Failure', props<{ error: string }>());

export const addProduct = createAction('[Inventory] Add Product', props<{ product: Partial<Product> }>());
export const addProductSuccess = createAction('[Inventory] Add Product Success', props<{ product: Product }>());
export const addProductFailure = createAction('[Inventory] Add Product Failure', props<{ error: string }>());

export const deleteProduct = createAction('[Inventory] Delete Product', props<{ id: string }>());
export const deleteProductSuccess = createAction('[Inventory] Delete Product Success', props<{ id: string }>());
export const deleteProductFailure = createAction('[Inventory] Delete Product Failure', props<{ error: string }>());

export const addTransaction = createAction('[Inventory] Add Transaction', props<{ transaction: { productId: string, clinicId: string, productName: string, type: 'IN' | 'OUT', quantity: number } }>());
export const addTransactionSuccess = createAction('[Inventory] Add Transaction Success', props<{ productId: string, newStock: number }>());
export const addTransactionFailure = createAction('[Inventory] Add Transaction Failure', props<{ error: string }>());
