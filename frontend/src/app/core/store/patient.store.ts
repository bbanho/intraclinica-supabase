import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { Patient, ClinicalRecord, Appointment } from '../models/types';
import * as PatientActions from './patient/patient.actions';
import * as PatientSelectors from './patient/patient.selectors';

@Injectable({
  providedIn: 'root'
})
export class PatientStore {
  private store = inject(Store);

  // Read-only Signals
  readonly patients = this.store.selectSignal(PatientSelectors.selectAllPatients);
  readonly records = this.store.selectSignal(PatientSelectors.selectAllClinicalRecords);
  readonly appointments = this.store.selectSignal(PatientSelectors.selectAllAppointments);
  readonly loading = this.store.selectSignal(PatientSelectors.selectPatientLoading);
  readonly error = this.store.selectSignal(PatientSelectors.selectPatientError);

  // Computed
  readonly patientCount = this.store.selectSignal(PatientSelectors.selectPatientCount);

  loadPatients(clinicId: string) {
    this.store.dispatch(PatientActions.loadPatients({ clinicId }));
  }

  loadAppointments(clinicId: string) {
    this.store.dispatch(PatientActions.loadAppointments({ clinicId }));
  }

  loadClinicalRecords(patientId: string) {
    this.store.dispatch(PatientActions.loadClinicalRecords({ patientId }));
  }

  createPatient(patient: Omit<Patient, 'id' | 'createdAt'>) {
    this.store.dispatch(PatientActions.createPatient({ patient }));
  }

  createAppointment(appointment: Omit<Appointment, 'id' | 'timestamp'>) {
    this.store.dispatch(PatientActions.createAppointment({ appointment }));
  }

  createRecord(record: Omit<ClinicalRecord, 'id' | 'timestamp'>) {
    this.store.dispatch(PatientActions.createClinicalRecord({ record }));
  }

  updateAppointmentStatus(id: string, status: string) {
    this.store.dispatch(PatientActions.updateAppointmentStatus({ id, status }));
  }

  updateAppointmentRoom(id: string, roomNumber: string) {
    this.store.dispatch(PatientActions.updateAppointmentRoom({ id, roomNumber }));
  }
}
