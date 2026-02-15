import { createReducer, on } from '@ngrx/store';
import { Patient, Appointment, ClinicalRecord } from '../../models/types';
import * as PatientActions from './patient.actions';

export const PATIENT_FEATURE_KEY = 'patient';

export interface PatientState {
  patients: Patient[];
  appointments: Appointment[];
  records: ClinicalRecord[];
  loading: boolean;
  error: string | null;
}

export const initialState: PatientState = {
  patients: [],
  appointments: [],
  records: [],
  loading: false,
  error: null,
};

export const patientReducer = createReducer(
  initialState,
  
  // Load Patients
  on(PatientActions.loadPatients, (state) => ({ ...state, loading: true, error: null })),
  on(PatientActions.loadPatientsSuccess, (state, { patients }) => ({ ...state, patients, loading: false })),
  on(PatientActions.loadPatientsFailure, (state, { error }) => ({ ...state, error, loading: false })),

  // Create Patient
  on(PatientActions.createPatient, (state) => ({ ...state, loading: true, error: null })),
  on(PatientActions.createPatientSuccess, (state, { patient }) => ({ 
    ...state, 
    patients: [patient, ...state.patients], 
    loading: false 
  })),
  on(PatientActions.createPatientFailure, (state, { error }) => ({ ...state, error, loading: false })),

  // Load Appointments
  on(PatientActions.loadAppointments, (state) => ({ ...state, loading: true, error: null })),
  on(PatientActions.loadAppointmentsSuccess, (state, { appointments }) => ({ ...state, appointments, loading: false })),
  on(PatientActions.loadAppointmentsFailure, (state, { error }) => ({ ...state, error, loading: false })),

  // Create Appointment
  on(PatientActions.createAppointment, (state) => ({ ...state, loading: true, error: null })),
  on(PatientActions.createAppointmentSuccess, (state, { appointment }) => ({ 
    ...state, 
    appointments: [appointment, ...state.appointments], 
    loading: false 
  })),
  on(PatientActions.createAppointmentFailure, (state, { error }) => ({ ...state, error, loading: false })),

  // Update Appointment Status
  on(PatientActions.updateAppointmentStatus, (state) => ({ ...state, loading: true, error: null })),
  on(PatientActions.updateAppointmentStatusSuccess, (state, { id, status }) => ({
    ...state,
    appointments: state.appointments.map(a => a.id === id ? { ...a, status } : a),
    loading: false
  })),
  on(PatientActions.updateAppointmentStatusFailure, (state, { error }) => ({ ...state, error, loading: false })),

  // Update Appointment Room
  on(PatientActions.updateAppointmentRoom, (state) => ({ ...state, loading: true, error: null })),
  on(PatientActions.updateAppointmentRoomSuccess, (state, { id, roomNumber }) => ({
    ...state,
    appointments: state.appointments.map(a => a.id === id ? { ...a, roomNumber } : a),
    loading: false
  })),
  on(PatientActions.updateAppointmentRoomFailure, (state, { error }) => ({ ...state, error, loading: false })),

  // Load Clinical Records
  on(PatientActions.loadClinicalRecords, (state) => ({ ...state, loading: true, error: null })),
  on(PatientActions.loadClinicalRecordsSuccess, (state, { records }) => ({ ...state, records, loading: false })),
  on(PatientActions.loadClinicalRecordsFailure, (state, { error }) => ({ ...state, error, loading: false })),

  // Create Clinical Record
  on(PatientActions.createClinicalRecord, (state) => ({ ...state, loading: true, error: null })),
  on(PatientActions.createClinicalRecordSuccess, (state, { record }) => ({ 
    ...state, 
    records: [record, ...state.records], 
    loading: false 
  })),
  on(PatientActions.createClinicalRecordFailure, (state, { error }) => ({ ...state, error, loading: false }))
);
