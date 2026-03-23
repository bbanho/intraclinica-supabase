import { Injectable, inject, signal } from '@angular/core';
import { DatabaseService } from '../services/database.service';

@Injectable({
  providedIn: 'root'
})
export class InventoryStore {
  private db = inject(DatabaseService);

  // Expose signals from DatabaseService
  readonly products = this.db.products;
  readonly transactions = this.db.transactions;
  
  // Loading state kept for backward compatibility with components
  readonly loading = signal(false);

  // Data is loaded automatically by ClinicContextService in DatabaseService
  loadProducts(clinicId: string) { }
  loadTransactions(clinicId: string) { }
}
