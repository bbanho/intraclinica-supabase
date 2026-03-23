import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { ClinicContextService } from './clinic-context.service';
import { AuthService } from './auth.service';

export type MedicalRecordType = 'EVOLUCAO' | 'RECEITA' | 'EXAME' | 'TRIAGEM';

export interface MedicalRecordContent {
  chief_complaint: string;
  observations: string;
  diagnosis: string;
  prescriptions: string;
}

export interface MedicalRecord {
  id: string;
  clinic_id: string;
  patient_id: string;
  doctor_id: string;
  content: MedicalRecordContent;
  type: MedicalRecordType;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class ClinicalService {
  private supabase = inject(SupabaseService);
  private context = inject(ClinicContextService);
  private auth = inject(AuthService);

  private get clinicId(): string {
    const id = this.context.selectedClinicId();
    if (!id || id === 'all') {
      throw new Error('Invalid Clinic Context');
    }
    return id;
  }

  async createRecord(
    patientId: string,
    content: MedicalRecordContent,
    type: MedicalRecordType = 'EVOLUCAO'
  ): Promise<MedicalRecord> {
    const doctorId = this.auth.currentUser()?.id;
    if (!doctorId) {
      throw new Error('No authenticated user');
    }

    const { data, error } = await this.supabase.clientInstance
      .rpc('create_medical_record', {
        p_clinic_id: this.clinicId,
        p_patient_id: patientId,
        p_doctor_id: doctorId,
        p_content: content as unknown as Record<string, unknown>,
        p_type: type
      });

    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error('Failed to create medical record');
    }
    return data[0] as MedicalRecord;
  }

  async getRecordsByPatient(patientId: string): Promise<MedicalRecord[]> {
    const { data, error } = await this.supabase.clientInstance
      .from('clinical_record')
      .select('*')
      .eq('clinic_id', this.clinicId)
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as MedicalRecord[]).map(r => {
      let parsed: MedicalRecordContent;
      try {
        parsed = typeof r.content === 'string' ? JSON.parse(r.content) : r.content;
      } catch (e) {
        console.error('Failed to parse medical record content:', r.content, e);
        parsed = { chief_complaint: '', observations: '', diagnosis: '', prescriptions: '' };
      }
      return { ...r, content: parsed };
    });
  }
}
