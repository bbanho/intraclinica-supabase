import { Injectable, inject, computed, signal } from '@angular/core';
import { Patient, ClinicalRecord, Appointment } from '../models/types';
import { PatientService } from '../services/patient.service';

@Injectable({
  providedIn: 'root'
})
export class PatientStore {
  private patientService = inject(PatientService);

  // Read-only Signals from PatientService
  readonly patients = computed(() => this.patientService.patients());
  readonly records = computed(() => this.patientService.clinicalRecords());
  readonly appointments = computed(() => this.patientService.appointments());
  
  // Faking loading and error for backwards compatibility with components
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  // Computed
  readonly patientCount = computed(() => this.patients().length);

  // Data is auto-synced by context now. 
  // We keep these methods to prevent components from breaking.
  loadPatients(clinicId: string) { }
  loadAppointments(clinicId: string) { }
  loadClinicalRecords(patientId: string) { }

  async createPatient(patient: Omit<Patient, 'id' | 'createdAt'>) {
    this.loading.set(true);
    try {
      await this.patientService.createPatient(patient);
      this.error.set(null);
    } catch (e: any) {
      this.error.set(e.message);
    } finally {
      this.loading.set(false);
    }
  }

  async createAppointment(appointment: Omit<Appointment, 'id' | 'timestamp'>) {
    this.loading.set(true);
    try {
      await this.patientService.createAppointment(appointment);
      this.error.set(null);
    } catch (e: any) {
      this.error.set(e.message);
    } finally {
      this.loading.set(false);
    }
  }

  async createRecord(record: Omit<ClinicalRecord, 'id' | 'timestamp'>) {
    this.loading.set(true);
    try {
      await this.patientService.createClinicalRecord(record);
      this.error.set(null);
    } catch (e: any) {
      this.error.set(e.message);
    } finally {
      this.loading.set(false);
    }
  }

  async updateAppointmentStatus(id: string, status: string) {
    // Uses the transition validator!
    await this.patientService.transitionAppointmentStatus(id, status);
  }

  async updateAppointmentRoom(id: string, roomNumber: string) {
    await this.patientService.updateAppointmentRoom(id, roomNumber);
  }
}
