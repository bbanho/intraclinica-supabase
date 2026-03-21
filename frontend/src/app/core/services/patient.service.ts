import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { DatabaseService } from './database.service';
import { Patient, ClinicalRecord, Appointment } from '../models/types';
import { from, Observable, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PatientService {
  private supabase = inject(SupabaseService);
  private db = inject(DatabaseService);

  private mapAppointmentRow(row: any): Appointment {
    return {
      id: row.id,
      clinicId: row.clinic_id,
      patientId: row.patient_id,
      doctorActorId: row.doctor_actor_id ?? undefined,
      patientName: row.patient_name ?? row.patient?.actor?.name ?? '',
      doctorName: 'Profissional',
      date: row.appointment_date,
      status: row.status,
      type: row.type ?? 'Consulta',
      roomNumber: row.room_number,
      timestamp: row.timestamp
    };
  }

  private mapClinicalRecordRow(row: any): ClinicalRecord {
    return {
      id: row.id,
      clinicId: row.clinic_id,
      patientId: row.patient_id,
      doctorActorId: row.doctor_actor_id ?? undefined,
      patientName: row.patient?.actor?.name ?? '',
      doctorName: 'Profissional',
      content: row.content,
      type: row.type,
      timestamp: row.timestamp,
      createdAt: row.timestamp
    } as unknown as ClinicalRecord;
  }

  getPatients(clinicId: string): Observable<Patient[]> {
    return from(
      this.supabase.from('patient')
        .select(`
          id,
          cpf,
          birth_date,
          gender,
          actor:actor!patient_id_fkey (
            name,
            clinic_id,
            created_at
          )
        `)
        .eq('clinic_id', clinicId)
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data || []).map((p: any) => ({
          id: p.id,
          clinicId: p.actor.clinic_id,
          name: p.actor.name,
          createdAt: p.actor.created_at,
          cpf: p.cpf,
          birthDate: p.birth_date,
          gender: p.gender
        })) as Patient[];
      })
    );
  }

  getAppointments(clinicId: string): Observable<Appointment[]> {
    return from(
      this.supabase.from('appointment')
        .select(`
          *,
          patient:patient_id (
            actor:id (
              name
            )
          )
        `)
        .eq('clinic_id', clinicId)
        .order('appointment_date', { ascending: true })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data || []).map((a: any) => this.mapAppointmentRow(a)) as Appointment[];
      })
    );
  }

  updateAppointmentStatus(id: string, status: string): Observable<void> {
    return from(
      this.supabase.from('appointment').update({ status }).eq('id', id)
    ).pipe(map(({ error }) => { if (error) throw error; }));
  }

  updateAppointmentRoom(id: string, roomNumber: string): Observable<void> {
    return from(
      this.supabase.from('appointment').update({ room_number: roomNumber }).eq('id', id)
    ).pipe(map(({ error }) => { if (error) throw error; }));
  }

  getClinicalRecords(patientId: string): Observable<ClinicalRecord[]> {
    return from(
      this.supabase.from('clinical_record')
        .select(`
          *,
          patient:patient_id (
            actor:id (
              name
            )
          )
        `)
        .eq('patient_id', patientId)
        .order('timestamp', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data || []).map((r: any) => this.mapClinicalRecordRow(r)) as ClinicalRecord[];
      })
    );
  }

  createPatient(patient: Omit<Patient, 'id' | 'createdAt'>): Observable<Patient> {
    return from(
      this.supabase.rpc('create_patient_with_actor', {
        p_clinic_id: patient.clinicId,
        p_name: patient.name,
        p_cpf: patient.cpf,
        p_birth_date: patient.birthDate,
        p_gender: patient.gender
      })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return data as Patient;
      })
    );
  }

  createAppointment(appointment: Omit<Appointment, 'id' | 'timestamp'>): Observable<Appointment> {
    return from(
      this.supabase.rpc('add_appointment', {
        p_clinic_id: appointment.clinicId,
        p_patient_id: appointment.patientId,
        p_doctor_actor_id: this.db.currentUser()?.actor_id,
        p_date: appointment.date,
        p_status: appointment.status ?? 'Agendado',
        p_room_number: appointment.roomNumber ?? null,
        p_priority: null
      })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return this.mapAppointmentRow(Array.isArray(data) ? data[0] : data);
      })
    );
  }

  createClinicalRecord(record: Omit<ClinicalRecord, 'id' | 'timestamp'>): Observable<ClinicalRecord> {
    return from(
      this.supabase.rpc('add_clinical_record', {
        p_clinic_id: record.clinicId,
        p_patient_id: record.patientId,
        p_doctor_actor_id: this.db.currentUser()?.actor_id,
        p_content: record.content,
        p_type: (record.type || 'EVOLUCAO').toUpperCase()
      })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return this.mapClinicalRecordRow(Array.isArray(data) ? data[0] : data);
      })
    );
  }
}
