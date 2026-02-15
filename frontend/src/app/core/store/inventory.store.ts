import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import * as InventoryActions from '../../features/inventory/store/inventory.actions';
import * as InventorySelectors from '../../features/inventory/store/inventory.selectors';

@Injectable({
  providedIn: 'root'
})
export class InventoryStore {
  private store = inject(Store);

  // Read-only Signals
  readonly products = this.store.selectSignal(InventorySelectors.selectAllProducts);
  readonly transactions = this.store.selectSignal(InventorySelectors.selectAllTransactions);
  readonly loading = this.store.selectSignal(InventorySelectors.selectInventoryLoading);

  loadProducts(clinicId: string) {
    this.store.dispatch(InventoryActions.loadProducts({ clinicId }));
  }

  loadTransactions(clinicId: string) {
    this.store.dispatch(InventoryActions.loadTransactions({ clinicId }));
  }
}
