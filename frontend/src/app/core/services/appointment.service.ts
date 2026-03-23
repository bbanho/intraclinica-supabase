import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { ClinicContextService } from './clinic-context.service';

export interface Appointment {
  id: string;
  clinic_id: string;
  patient_id: string;
  patient_name: string;
  appointment_date: string;
  status: string;
  priority: string;
  room_number: string | null;
  timestamp: string;
  doctor_id: string | null;
  duration_minutes: number;
}

export interface AppointmentPayload {
  patient_id: string;
  patient_name: string;
  appointment_date: string;
  doctor_id?: string;
  duration_minutes?: number;
}

@Injectable({ providedIn: 'root' })
export class AppointmentService {
  private supabase = inject(SupabaseService);
  private context = inject(ClinicContextService);

  private get clinicId(): string {
    const id = this.context.selectedClinicId();
    if (!id || id === 'all') {
      throw new Error('Invalid Clinic Context');
    }
    return id;
  }

  async getWaitlistForToday(): Promise<Appointment[]> {
    const clinicId = this.clinicId;
    
    // Get today's start and end in ISO format to query Supabase
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfDay = today.toISOString();
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const endOfDay = tomorrow.toISOString();

    const { data, error } = await this.supabase.clientInstance
      .from('appointment')
      .select('*')
      .eq('clinic_id', clinicId)
      .gte('appointment_date', startOfDay)
      .lt('appointment_date', endOfDay)
      .order('appointment_date', { ascending: true });

    if (error) {
      console.error('Waitlist Fetch Error', error);
      throw error;
    }
    return data as Appointment[];
  }

  async getDoctors(): Promise<{id: string, name: string}[]> {
    const clinicId = this.clinicId;
    // We now fetch from app_user and filter by iam_bindings containing 'roles/doctor' for this clinic
    const { data, error } = await this.supabase.clientInstance
      .from('app_user')
      .select('id, name')
      .contains('iam_bindings', { [clinicId]: ['roles/doctor'] })
      .order('name', { ascending: true });
      
    if (error) throw error;
    return data || [];
  }

  async getRecentAppointments(): Promise<Appointment[]> {
    const clinicId = this.clinicId;
    
    // Fallback if we just want the latest 100 for dev purposes
    const { data, error } = await this.supabase.clientInstance
      .from('appointment')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('appointment_date', { ascending: true })
      .limit(100);

    if (error) {
      throw error;
    }
    return data as Appointment[];
  }

  async createAppointment(payload: AppointmentPayload): Promise<Appointment> {
    const clinicId = this.clinicId;

    const { data, error } = await this.supabase.clientInstance
      .from('appointment')
      .insert({
        clinic_id: clinicId,
        patient_id: payload.patient_id,
        patient_name: payload.patient_name,
        appointment_date: payload.appointment_date,
        doctor_id: payload.doctor_id,
        duration_minutes: payload.duration_minutes ?? 60,
        status: 'Agendado',
        priority: 'Normal'
      })
      .select('*')
      .single();

    if (error) throw error;
    return data as Appointment;
  }

  async updateAppointmentStatus(id: string, status: string): Promise<Appointment> {
    const clinicId = this.clinicId;

    const { data, error } = await this.supabase.clientInstance
      .from('appointment')
      .update({ status })
      .eq('id', id)
      .eq('clinic_id', clinicId)
      .select('*')
      .single();

    if (error) throw error;
    return data as Appointment;
  }
}
