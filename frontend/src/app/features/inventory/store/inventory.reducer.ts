import { createReducer, on } from '@ngrx/store';
import { Product, StockTransaction } from '../../../core/models/types';
import * as InventoryActions from './inventory.actions';

export interface InventoryState {
  products: Product[];
  transactions: StockTransaction[];
  loading: boolean;
  error: string | null;
}

export const initialState: InventoryState = {
  products: [],
  transactions: [],
  loading: false,
  error: null
};

export const inventoryReducer = createReducer(
  initialState,
  on(InventoryActions.loadProducts, state => ({ ...state, loading: true })),
  on(InventoryActions.loadProductsSuccess, (state, { products }) => ({ ...state, products, loading: false })),
  on(InventoryActions.loadProductsFailure, (state, { error }) => ({ ...state, error, loading: false })),
  
  on(InventoryActions.loadTransactions, state => ({ ...state, loading: true })),
  on(InventoryActions.loadTransactionsSuccess, (state, { transactions }) => ({ ...state, transactions, loading: false })),
  on(InventoryActions.loadTransactionsFailure, (state, { error }) => ({ ...state, error, loading: false })),
  
  on(InventoryActions.addProduct, state => ({ ...state, loading: true })),
  on(InventoryActions.addProductSuccess, (state, { product }) => ({ 
    ...state, 
    products: [...state.products, product],
    loading: false 
  })),
  
  on(InventoryActions.deleteProductSuccess, (state, { id }) => ({
    ...state,
    products: state.products.filter(p => p.id !== id)
  }))
);
