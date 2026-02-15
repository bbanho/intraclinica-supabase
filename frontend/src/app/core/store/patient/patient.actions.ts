import { createAction, props } from '@ngrx/store';
import { Patient, Appointment, ClinicalRecord } from '../../models/types';

export const loadPatients = createAction(
  '[Patient] Load Patients',
  props<{ clinicId: string }>()
);

export const loadPatientsSuccess = createAction(
  '[Patient] Load Patients Success',
  props<{ patients: Patient[] }>()
);

export const loadPatientsFailure = createAction(
  '[Patient] Load Patients Failure',
  props<{ error: string }>()
);

export const createPatient = createAction(
  '[Patient] Create Patient',
  props<{ patient: Omit<Patient, 'id' | 'createdAt'> }>()
);

export const createPatientSuccess = createAction(
  '[Patient] Create Patient Success',
  props<{ patient: Patient }>()
);

export const createPatientFailure = createAction(
  '[Patient] Create Patient Failure',
  props<{ error: string }>()
);

// Appointments
export const loadAppointments = createAction(
  '[Patient] Load Appointments',
  props<{ clinicId: string }>()
);

export const loadAppointmentsSuccess = createAction(
  '[Patient] Load Appointments Success',
  props<{ appointments: Appointment[] }>()
);

export const loadAppointmentsFailure = createAction(
  '[Patient] Load Appointments Failure',
  props<{ error: string }>()
);

export const createAppointment = createAction(
  '[Patient] Create Appointment',
  props<{ appointment: Omit<Appointment, 'id' | 'timestamp'> }>()
);

export const createAppointmentSuccess = createAction(
  '[Patient] Create Appointment Success',
  props<{ appointment: Appointment }>()
);

export const createAppointmentFailure = createAction(
  '[Patient] Create Appointment Failure',
  props<{ error: string }>()
);

export const updateAppointmentStatus = createAction(
  '[Patient] Update Appointment Status',
  props<{ id: string; status: string }>()
);

export const updateAppointmentStatusSuccess = createAction(
  '[Patient] Update Appointment Status Success',
  props<{ id: string; status: string }>()
);

export const updateAppointmentStatusFailure = createAction(
  '[Patient] Update Appointment Status Failure',
  props<{ error: string }>()
);

export const updateAppointmentRoom = createAction(
  '[Patient] Update Appointment Room',
  props<{ id: string; roomNumber: string }>()
);

export const updateAppointmentRoomSuccess = createAction(
  '[Patient] Update Appointment Room Success',
  props<{ id: string; roomNumber: string }>()
);

export const updateAppointmentRoomFailure = createAction(
  '[Patient] Update Appointment Room Failure',
  props<{ error: string }>()
);

// Clinical Records
export const loadClinicalRecords = createAction(
  '[Patient] Load Clinical Records',
  props<{ patientId: string }>()
);

export const loadClinicalRecordsSuccess = createAction(
  '[Patient] Load Clinical Records Success',
  props<{ records: ClinicalRecord[] }>()
);

export const loadClinicalRecordsFailure = createAction(
  '[Patient] Load Clinical Records Failure',
  props<{ error: string }>()
);

export const createClinicalRecord = createAction(
  '[Patient] Create Clinical Record',
  props<{ record: Omit<ClinicalRecord, 'id' | 'timestamp'> }>()
);

export const createClinicalRecordSuccess = createAction(
  '[Patient] Create Clinical Record Success',
  props<{ record: ClinicalRecord }>()
);

export const createClinicalRecordFailure = createAction(
  '[Patient] Create Clinical Record Failure',
  props<{ error: string }>()
);
