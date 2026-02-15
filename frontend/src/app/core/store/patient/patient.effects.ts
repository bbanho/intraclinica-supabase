import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap, mergeMap } from 'rxjs/operators';
import { PatientService } from '../../services/patient.service';
import * as PatientActions from './patient.actions';

@Injectable()
export class PatientEffects {
  private actions$ = inject(Actions);
  private patientService = inject(PatientService);

  loadPatients$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PatientActions.loadPatients),
      switchMap(({ clinicId }) =>
        this.patientService.getPatients(clinicId).pipe(
          map(patients => PatientActions.loadPatientsSuccess({ patients })),
          catchError(error => of(PatientActions.loadPatientsFailure({ error: error.message })))
        )
      )
    )
  );

  createPatient$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PatientActions.createPatient),
      mergeMap(({ patient }) =>
        this.patientService.createPatient(patient).pipe(
          map(newPatient => PatientActions.createPatientSuccess({ patient: newPatient })),
          catchError(error => of(PatientActions.createPatientFailure({ error: error.message })))
        )
      )
    )
  );

  loadAppointments$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PatientActions.loadAppointments),
      switchMap(({ clinicId }) =>
        this.patientService.getAppointments(clinicId).pipe(
          map(appointments => PatientActions.loadAppointmentsSuccess({ appointments })),
          catchError(error => of(PatientActions.loadAppointmentsFailure({ error: error.message })))
        )
      )
    )
  );

  createAppointment$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PatientActions.createAppointment),
      mergeMap(({ appointment }) =>
        this.patientService.createAppointment(appointment).pipe(
          map(newAppointment => PatientActions.createAppointmentSuccess({ appointment: newAppointment })),
          catchError(error => of(PatientActions.createAppointmentFailure({ error: error.message })))
        )
      )
    )
  );

  updateAppointmentStatus$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PatientActions.updateAppointmentStatus),
      mergeMap(({ id, status }) =>
        this.patientService.updateAppointmentStatus(id, status).pipe(
          map(() => PatientActions.updateAppointmentStatusSuccess({ id, status })),
          catchError(error => of(PatientActions.updateAppointmentStatusFailure({ error: error.message })))
        )
      )
    )
  );

  updateAppointmentRoom$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PatientActions.updateAppointmentRoom),
      mergeMap(({ id, roomNumber }) =>
        this.patientService.updateAppointmentRoom(id, roomNumber).pipe(
          map(() => PatientActions.updateAppointmentRoomSuccess({ id, roomNumber })),
          catchError(error => of(PatientActions.updateAppointmentRoomFailure({ error: error.message })))
        )
      )
    )
  );

  loadClinicalRecords$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PatientActions.loadClinicalRecords),
      switchMap(({ patientId }) =>
        this.patientService.getClinicalRecords(patientId).pipe(
          map(records => PatientActions.loadClinicalRecordsSuccess({ records })),
          catchError(error => of(PatientActions.loadClinicalRecordsFailure({ error: error.message })))
        )
      )
    )
  );

  createClinicalRecord$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PatientActions.createClinicalRecord),
      mergeMap(({ record }) =>
        this.patientService.createClinicalRecord(record).pipe(
          map(newRecord => PatientActions.createClinicalRecordSuccess({ record: newRecord })),
          catchError(error => of(PatientActions.createClinicalRecordFailure({ error: error.message })))
        )
      )
    )
  );
}
