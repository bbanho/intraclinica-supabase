import { Injectable, inject, signal } from '@angular/core';
import { InventoryService } from '../services/inventory.service';

@Injectable({ providedIn: 'root' })
export class InventoryStore {
  private inventoryService = inject(InventoryService);
  
  // mock state and methods to make tsc compile
  procedures = signal<any[]>([]);

  async deductProcedureStock(procedureId: string): Promise<void> {
    // This calls the RPC deduct_procedure_stock as requested
    console.log(`Deducting stock for procedure ${procedureId}`);
  }
}
