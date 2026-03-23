import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ClinicContextService {
  // Sentinel: 'all' = Super Admin global view. 'null' = No clinic selected. UUID = specific clinic.
  public selectedClinicId = signal<string | null>(null);

  setContext(clinicId: string | 'all' | null) {
    this.selectedClinicId.set(clinicId);
  }
}