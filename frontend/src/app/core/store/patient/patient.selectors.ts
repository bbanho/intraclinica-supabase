import { createFeatureSelector, createSelector } from '@ngrx/store';
import { PATIENT_FEATURE_KEY, PatientState } from './patient.reducer';

export const selectPatientState = createFeatureSelector<PatientState>(PATIENT_FEATURE_KEY);

export const selectAllPatients = createSelector(
  selectPatientState,
  (state: PatientState) => state.patients
);

export const selectAllAppointments = createSelector(
  selectPatientState,
  (state: PatientState) => state.appointments
);

export const selectAllClinicalRecords = createSelector(
  selectPatientState,
  (state: PatientState) => state.records
);

export const selectPatientLoading = createSelector(
  selectPatientState,
  (state: PatientState) => state.loading
);

export const selectPatientError = createSelector(
  selectPatientState,
  (state: PatientState) => state.error
);

export const selectPatientCount = createSelector(
    selectAllPatients,
    (patients) => patients.length
);
