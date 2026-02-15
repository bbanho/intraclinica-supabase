import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Patient, ClinicalRecord, Appointment } from '../models/types';
import { from, Observable, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PatientService {
  private supabase = inject(SupabaseService);

  getPatients(clinicId: string): Observable<Patient[]> {
    return from(
      this.supabase.from('patients')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data || []).map(p => ({
          id: p.id,
          clinicId: p.clinic_id,
          name: p.name,
          email: p.email,
          phone: p.phone,
          cpf: p.cpf,
          birthDate: p.birth_date,
          gender: p.gender,
          createdAt: p.created_at
        })) as Patient[];
      })
    );
  }

  getAppointments(clinicId: string): Observable<Appointment[]> {
    return from(
      this.supabase.from('appointments')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('date', { ascending: true })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data || []).map(a => ({
          id: a.id,
          clinicId: a.clinic_id,
          patientId: a.patient_id,
          patientName: a.patient_name,
          doctorName: a.doctor_name,
          date: a.date,
          status: a.status,
          type: a.type,
          roomNumber: a.room_number,
          timestamp: a.created_at
        })) as Appointment[];
      })
    );
  }

  updateAppointmentStatus(id: string, status: string): Observable<void> {
    return from(
      this.supabase.from('appointments')
        .update({ status })
        .eq('id', id)
    ).pipe(map(({ error }) => { if (error) throw error; }));
  }

  updateAppointmentRoom(id: string, roomNumber: string): Observable<void> {
    return from(
      this.supabase.from('appointments')
        .update({ room_number: roomNumber })
        .eq('id', id)
    ).pipe(map(({ error }) => { if (error) throw error; }));
  }

  getClinicalRecords(patientId: string): Observable<ClinicalRecord[]> {
    return from(
      this.supabase.from('clinical_records')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data || []).map(r => ({
          ...r,
          clinicId: r.clinic_id,
          patientId: r.patient_id,
          patientName: r.patient_name,
          doctorName: r.doctor_name,
          createdAt: r.created_at,
          timestamp: r.created_at // types.ts uses timestamp
        })) as ClinicalRecord[];
      })
    );
  }

  createPatient(patient: Omit<Patient, 'id' | 'createdAt'>): Observable<Patient> {
    const dbPatient = {
      clinic_id: patient.clinicId,
      name: patient.name,
      email: patient.email,
      phone: patient.phone,
      cpf: patient.cpf,
      birth_date: patient.birthDate,
      gender: patient.gender,
      created_at: new Date().toISOString()
    };

    return from(
      this.supabase.from('patients')
        .insert(dbPatient)
        .select()
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return {
          id: data.id,
          clinicId: data.clinic_id,
          name: data.name,
          email: data.email,
          phone: data.phone,
          cpf: data.cpf,
          birthDate: data.birth_date,
          gender: data.gender,
          createdAt: data.created_at
        } as Patient;
      })
    );
  }

  createAppointment(appointment: Omit<Appointment, 'id' | 'timestamp'>): Observable<Appointment> {
    const dbAppointment = {
      clinic_id: appointment.clinicId,
      patient_id: appointment.patientId,
      patient_name: appointment.patientName,
      doctor_name: appointment.doctorName,
      date: appointment.date,
      status: appointment.status,
      type: appointment.type,
      room_number: appointment.roomNumber,
      created_at: new Date().toISOString()
    };

    return from(
      this.supabase.from('appointments')
        .insert(dbAppointment)
        .select()
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return {
          id: data.id,
          clinicId: data.clinic_id,
          patientId: data.patient_id,
          patientName: data.patient_name,
          doctorName: data.doctor_name,
          date: data.date,
          status: data.status,
          type: data.type,
          roomNumber: data.room_number,
          timestamp: data.created_at
        } as Appointment;
      })
    );
  }

  createClinicalRecord(record: Omit<ClinicalRecord, 'id' | 'timestamp'>): Observable<ClinicalRecord> {
    const dbRecord = {
      clinic_id: record.clinicId,
      patient_id: record.patientId,
      patient_name: record.patientName,
      doctor_name: record.doctorName,
      content: record.content,
      notes: record.notes,
      type: record.type,
      created_at: new Date().toISOString()
    };

    return from(
      this.supabase.from('clinical_records')
        .insert(dbRecord)
        .select()
        .single()
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return {
          id: data.id,
          clinicId: data.clinic_id,
          patientId: data.patient_id,
          patientName: data.patient_name,
          doctorName: data.doctor_name,
          content: data.content,
          notes: data.notes,
          type: data.type,
          timestamp: data.created_at,
          createdAt: data.created_at // Assuming type definition might have both or one
        } as unknown as ClinicalRecord; // forced casting to match type
      })
    );
  }
}
