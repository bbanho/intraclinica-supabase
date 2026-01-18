import { createReducer, on } from '@ngrx/store';
import { Product } from '../../../core/models/types';
import * as InventoryActions from './inventory.actions';

export interface InventoryState {
  products: Product[];
  loading: boolean;
  error: string | null;
}

export const initialState: InventoryState = {
  products: [],
  loading: false,
  error: null
};

export const inventoryReducer = createReducer(
  initialState,
  on(InventoryActions.loadProducts, state => ({ ...state, loading: true })),
  on(InventoryActions.loadProductsSuccess, (state, { products }) => ({ ...state, products, loading: false })),
  on(InventoryActions.loadProductsFailure, (state, { error }) => ({ ...state, error, loading: false })),
  
  on(InventoryActions.addProduct, state => ({ ...state, loading: true })),
  on(InventoryActions.addProductSuccess, (state, { product }) => ({ 
    ...state, 
    products: [...state.products, product],
    loading: false 
  })),
  
  on(InventoryActions.deleteProductSuccess, (state, { id }) => ({
    ...state,
    products: state.products.filter(p => p.id !== id)
  })),

  on(InventoryActions.addTransaction, (state) => ({ ...state, loading: true })),
  on(InventoryActions.addTransactionSuccess, (state, { productId, newStock }) => {
     // If newStock is -1 (as returned by effect currently), we can try to calculate locally
     // But wait, the action payload defined in the Effect was passing -1.
     // Let's rely on re-fetching OR just use the params from the action?
     // Actually, let's fix the Effect to return the calculated stock properly 
     // or let's use the local state to calculate it here if newStock is -1?
     // No, let's trust that the Effect *should* return the correct newStock.
     // Since I can't change the effect in this call, I'll implement logic:
     // If newStock is -1, I won't update stock here (rely on reload), 
     // BUT ideally we update it.
     
     // Let's assume for now I will use what is passed.
     // To make this robust, I'll update the Effect in a future step to actually return the real stock.
     
     // Update: For this step, I'll implement the reducer to update the specific product.
     return {
         ...state,
         loading: false,
         products: state.products.map(p => 
            p.id === productId && newStock !== -1
                ? { ...p, stock: newStock } 
                : p
         )
     };
  }),
  on(InventoryActions.addTransactionFailure, (state, { error }) => ({ ...state, error, loading: false }))
);
