import { Injectable, signal, computed } from '@angular/core';
import { Clinic } from '../models/types';

@Injectable({
  providedIn: 'root'
})
export class ClinicContextService {
  selectedClinic = signal<string | null>(null);
  accessibleClinics = signal<Clinic[]>([]);

  clinicId = computed(() => {
    const clinic = this.selectedClinic();
    return clinic === 'all' ? null : clinic;
  });
}
