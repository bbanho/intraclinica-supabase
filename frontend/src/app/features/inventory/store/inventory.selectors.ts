import { createFeatureSelector, createSelector } from '@ngrx/store';
import { InventoryState } from './inventory.reducer';

export const selectInventoryState = createFeatureSelector<InventoryState>('inventory');

export const selectAllProducts = createSelector(
  selectInventoryState,
  (state) => state.products
);

export const selectInventoryLoading = createSelector(
  selectInventoryState,
  (state) => state.loading
);
