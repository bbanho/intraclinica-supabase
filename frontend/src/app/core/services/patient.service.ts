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

  private async fetchAppointments(clinicId: string) {
    const canonical = await this.supabase.from('appointment')
      .select(`
        *,
        patient:patient_id (
          actor:id (
            name
          )
        )
      `)
      .eq('clinic_id', clinicId)
      .order('appointment_date', { ascending: true });

    if (!canonical.error) return canonical;

    return this.supabase.from('appointments')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('date', { ascending: true });
  }

  private async updateAppointment(id: string, values: Record<string, unknown>) {
    const canonical = await this.supabase.from('appointment')
      .update(values)
      .eq('id', id);

    if (!canonical.error) return canonical;

    return this.supabase.from('appointments')
      .update(values)
      .eq('id', id);
  }

  private async fetchClinicalRecords(patientId: string) {
    const canonical = await this.supabase.from('clinical_record')
      .select(`
        *,
        patient:patient_id (
          actor:id (
            name
          )
        )
      `)
      .eq('patient_id', patientId)
      .order('timestamp', { ascending: false });

    if (!canonical.error) return canonical;

    return this.supabase.from('clinical_records')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });
  }

  private async insertAppointment(canonicalValues: Record<string, unknown>, legacyValues: Record<string, unknown>) {
    const canonical = await this.supabase.from('appointment')
      .insert(canonicalValues)
      .select()
      .single();

    if (!canonical.error) return canonical;

    return this.supabase.from('appointments')
      .insert(legacyValues)
      .select()
      .single();
  }

  private async insertClinicalRecord(canonicalValues: Record<string, unknown>, legacyValues: Record<string, unknown>) {
    const canonical = await this.supabase.from('clinical_record')
      .insert(canonicalValues)
      .select(`
        *,
        patient:patient_id (
          actor:id (
            name
          )
        )
      `)
      .single();

    if (!canonical.error) return canonical;

    return this.supabase.from('clinical_records')
      .insert(legacyValues)
      .select()
      .single();
  }

  private mapAppointmentRow(row: any): Appointment {
    return {
      id: row.id,
      clinicId: row.clinic_id,
      patientId: row.patient_id,
      doctorActorId: row.doctor_actor_id ?? undefined,
      patientName: row.patient_name ?? row.patient?.actor?.name ?? '',
      doctorName: row.doctor_name ?? 'Profissional',
      date: row.appointment_date ?? row.date,
      status: row.status,
      type: row.type ?? 'Consulta',
      roomNumber: row.room_number,
      timestamp: row.timestamp ?? row.created_at
    };
  }

  private mapClinicalRecordRow(row: any): ClinicalRecord {
    return {
      id: row.id,
      clinicId: row.clinic_id,
      patientId: row.patient_id,
      doctorActorId: row.doctor_actor_id ?? undefined,
      patientName: row.patient_name ?? row.patient?.actor?.name ?? '',
      doctorName: row.doctor_name ?? 'Profissional',
      content: row.content,
      notes: row.notes,
      type: row.type,
      timestamp: row.timestamp ?? row.created_at,
      createdAt: row.timestamp ?? row.created_at
    } as unknown as ClinicalRecord;
  }

  getPatients(clinicId: string): Observable<Patient[]> {
    // Perform manual JOIN using Supabase syntax to avoid reliance on Views
    return from(
      this.supabase.from('patient')
        .select(`
          id,
          cpf,
          birth_date,
          gender,
          actor:id (
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
      this.fetchAppointments(clinicId)
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data || []).map(a => this.mapAppointmentRow(a)) as Appointment[];
      })
    );
  }

  updateAppointmentStatus(id: string, status: string): Observable<void> {
    return from(
      this.updateAppointment(id, { status })
    ).pipe(map(({ error }) => { if (error) throw error; }));
  }

  updateAppointmentRoom(id: string, roomNumber: string): Observable<void> {
    return from(
      this.updateAppointment(id, { room_number: roomNumber })
    ).pipe(map(({ error }) => { if (error) throw error; }));
  }

  getClinicalRecords(patientId: string): Observable<ClinicalRecord[]> {
    return from(
      this.fetchClinicalRecords(patientId)
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data || []).map(r => this.mapClinicalRecordRow(r)) as ClinicalRecord[];
      })
    );
  }

  createPatient(patient: Omit<Patient, 'id' | 'createdAt'>): Observable<Patient> {
    // Atomic creation via RPC remains the best practice for Actor inheritance
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
    const doctorName = appointment.doctorName || this.db.currentUser()?.name || 'Profissional';
    const doctorActorId = this.db.currentUser()?.actor_id;
    const doctorId = this.db.currentUser()?.id;

    const canonicalAppointment = {
      clinic_id: appointment.clinicId,
      patient_id: appointment.patientId,
      patient_name: appointment.patientName,
      doctor_id: doctorId,
      doctor_actor_id: doctorActorId,
      doctor_name: doctorName,
      appointment_date: appointment.date,
      status: appointment.status,
      room_number: appointment.roomNumber,
      timestamp: new Date().toISOString()
    };

    const legacyAppointment = {
      clinic_id: appointment.clinicId,
      patient_id: appointment.patientId,
      patient_name: appointment.patientName,
      doctor_name: doctorName,
      date: appointment.date,
      status: appointment.status,
      type: appointment.type,
      room_number: appointment.roomNumber,
      created_at: new Date().toISOString()
    };

    return from(
      this.insertAppointment(canonicalAppointment, legacyAppointment)
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return this.mapAppointmentRow(data);
      })
    );
  }

  createClinicalRecord(record: Omit<ClinicalRecord, 'id' | 'timestamp'>): Observable<ClinicalRecord> {
    const doctorName = record.doctorName || this.db.currentUser()?.name || 'Profissional';
    const doctorActorId = this.db.currentUser()?.actor_id;
    const doctorId = this.db.currentUser()?.id;

    const canonicalRecord = {
      clinic_id: record.clinicId,
      patient_id: record.patientId,
      doctor_id: doctorId,
      doctor_actor_id: doctorActorId,
      content: record.content,
      type: record.type,
      timestamp: new Date().toISOString()
    };

    const legacyRecord = {
      clinic_id: record.clinicId,
      patient_id: record.patientId,
      patient_name: record.patientName,
      doctor_name: doctorName,
      content: record.content,
      notes: record.notes,
      type: record.type,
      created_at: new Date().toISOString()
    };

    return from(
      this.insertClinicalRecord(canonicalRecord, legacyRecord)
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return this.mapClinicalRecordRow(data);
      })
    );
  }
}
