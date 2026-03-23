import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { ClinicContextService } from './clinic-context.service';

export interface PatientActor {
  id: string;
  name: string;
  type: string;
}

export interface Patient {
  id: string;
  clinic_id: string;
  cpf: string | null;
  birth_date: string | null;
  gender: string | null;
  phone: string | null;
  actor?: PatientActor;
}

export interface PatientFormDto {
  name: string;
  cpf: string | null;
  phone: string | null;
  birth_date: string | null;
}

@Injectable({ providedIn: 'root' })
export class PatientService {
  private supabase = inject(SupabaseService);
  private context = inject(ClinicContextService);

  private get clinicId(): string {
    const id = this.context.selectedClinicId();
    if (!id || id === 'all') {
      throw new Error('Invalid Clinic Context');
    }
    return id;
  }

  async getPatients(): Promise<Patient[]> {
    const { data, error } = await this.supabase.clientInstance
      .from('patient')
      .select('*, actor!inner(id, name, type)')
      .eq('clinic_id', this.clinicId)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data as Patient[];
  }

  async getPatientById(id: string): Promise<Patient> {
    const { data, error } = await this.supabase.clientInstance
      .from('patient')
      .select('*, actor!inner(id, name, type)')
      .eq('clinic_id', this.clinicId)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Patient;
  }

  async createPatient(payload: PatientFormDto): Promise<Patient> {
    const clinicId = this.clinicId;

    const { data: actor, error: actorError } = await this.supabase.clientInstance
      .from('actor')
      .insert({
        clinic_id: clinicId,
        type: 'PATIENT',
        name: payload.name
      })
      .select('id')
      .single();

    if (actorError) throw actorError;

    const { data: patient, error: patientError } = await this.supabase.clientInstance
      .from('patient')
      .insert({
        id: actor.id,
        clinic_id: clinicId,
        cpf: payload.cpf,
        birth_date: payload.birth_date,
        phone: payload.phone
      })
      .select('*, actor!inner(id, name, type)')
      .single();

    if (patientError) {
      throw patientError;
    }

    return patient as Patient;
  }

  async updatePatient(id: string, payload: PatientFormDto): Promise<Patient> {
    const clinicId = this.clinicId;

    const { error: actorError } = await this.supabase.clientInstance
      .from('actor')
      .update({ name: payload.name })
      .eq('id', id)
      .eq('clinic_id', clinicId);

    if (actorError) throw actorError;

    const { data: patient, error: patientError } = await this.supabase.clientInstance
      .from('patient')
      .update({
        cpf: payload.cpf,
        birth_date: payload.birth_date,
        phone: payload.phone,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('clinic_id', clinicId)
      .select('*, actor!inner(id, name, type)')
      .single();

    if (patientError) throw patientError;

    return patient as Patient;
  }

  async deletePatient(id: string): Promise<void> {
    const clinicId = this.clinicId;

    const { error: patientError } = await this.supabase.clientInstance
      .from('patient')
      .delete()
      .eq('id', id)
      .eq('clinic_id', clinicId);

    if (patientError) throw patientError;

    const { error: actorError } = await this.supabase.clientInstance
      .from('actor')
      .delete()
      .eq('id', id)
      .eq('clinic_id', clinicId);

    if (actorError) throw actorError;
  }
}
