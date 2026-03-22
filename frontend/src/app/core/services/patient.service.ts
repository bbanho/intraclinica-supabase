import { Injectable, inject, signal, effect, computed } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { ClinicContextService } from './clinic-context.service';
import { AuthStateService } from './auth-state.service';
import { Patient, Appointment, ClinicalRecord, UserProfile } from '../models/types';

@Injectable({
  providedIn: 'root'
})
export class PatientService {
  private supabase = inject(SupabaseService);
  private context = inject(ClinicContextService);
  private auth = inject(AuthStateService);

  // State Signals
  patients = signal<Patient[]>([]);
  appointments = signal<Appointment[]>([]);
  clinicalRecords = signal<ClinicalRecord[]>([]);

  constructor() {
    // Auto-sync when clinic context changes
    effect(() => {
      const clinicId = this.context.clinicId();
      if (clinicId) {
        this.syncForClinic(clinicId);
      } else {
        this.patients.set([]);
        this.appointments.set([]);
        this.clinicalRecords.set([]);
      }
    });
  }

  private resolveDoctorName(actorId: string | undefined, users: UserProfile[]): string {
    if (!actorId) return 'Profissional';
    const match = users.find(u => u.actor_id === actorId);
    return match?.name ?? 'Profissional';
  }

  private async syncForClinic(clinicId: string) {
    // We need users to resolve doctor names. We'll fetch them inline or rely on AuthStateService.
    // For now, let's fetch users for this clinic to be safe.
    const { data: usersData } = await this.supabase
      .from('app_user')
      .select('id, actor:actor_id!inner(id, name, clinic_id)')
      .eq('actor.clinic_id', clinicId);

    const users: UserProfile[] = (usersData || []).map((u: any) => ({
      id: u.id,
      actor_id: u.actor?.id,
      name: u.actor?.name || 'Profissional',
      clinicId: u.actor?.clinic_id,
      email: '', role: 'USER' // Partial just for name resolution
    }));

    const [patientsRes, apptRes, recordsRes] = await Promise.all([
      this.supabase
        .from('patient')
        .select('id, cpf, birth_date, gender, actor:actor!patient_id_fkey(name, clinic_id, created_at)')
        .eq('clinic_id', clinicId),
      
      this.supabase
        .from('appointment')
        .select('*, patient:patient_id(actor:actor!patient_id_fkey(name))')
        .eq('clinic_id', clinicId)
        .order('appointment_date', { ascending: true }),
        
      this.supabase
        .from('clinical_record')
        .select('*, patient:patient_id(actor:actor!patient_id_fkey(name))')
        .eq('clinic_id', clinicId)
        .order('timestamp', { ascending: false })
    ]);

    if (patientsRes.data) {
      this.patients.set(patientsRes.data.map((p: any) => ({
        id: p.id,
        clinicId: p.actor?.clinic_id,
        name: p.actor?.name || '',
        createdAt: p.actor?.created_at,
        cpf: p.cpf,
        birthDate: p.birth_date,
        gender: p.gender
      })));
    }

    if (apptRes.data) {
      this.appointments.set(apptRes.data.map((a: any) => ({
        id: a.id,
        clinicId: a.clinic_id,
        patientId: a.patient_id,
        doctorActorId: a.doctor_actor_id ?? undefined,
        patientName: a.patient?.actor?.name ?? '',
        doctorName: this.resolveDoctorName(a.doctor_actor_id, users),
        date: a.appointment_date ?? a.date,
        status: a.status,
        type: a.type ?? 'Consulta',
        roomNumber: a.room_number,
        timestamp: a.timestamp ?? a.created_at
      })));
    }

    if (recordsRes.data) {
      this.clinicalRecords.set(recordsRes.data.map((r: any) => ({
        id: r.id,
        clinicId: r.clinic_id,
        patientId: r.patient_id,
        doctorActorId: r.doctor_actor_id ?? undefined,
        patientName: r.patient?.actor?.name ?? '',
        doctorName: this.resolveDoctorName(r.doctor_actor_id, users),
        content: r.content,
        type: r.type,
        timestamp: r.timestamp ?? r.created_at
      })));
    }
  }

  // --- Patients ---
  async createPatient(patient: Partial<Patient>) {
    const clinicId = patient.clinicId || this.context.clinicId();
    if (!clinicId) throw new Error("Clinic ID is required.");

    const { data, error } = await this.supabase.rpc('create_patient_with_actor', {
      p_clinic_id: clinicId,
      p_name: patient.name,
      p_cpf: patient.cpf,
      p_birth_date: patient.birthDate,
      p_gender: patient.gender
    });

    if (error) throw error;
    
    // Add to local state
    if (data) {
       const newPatient: Patient = {
         id: data.id,
         clinicId,
         name: patient.name!,
         createdAt: new Date().toISOString(),
         cpf: patient.cpf,
         birthDate: patient.birthDate,
         gender: patient.gender
       };
       this.patients.update(list => [...list, newPatient]);
    }
    return data;
  }

  // --- Appointments ---
  async createAppointment(apt: Partial<Appointment>) {
    const clinicId = apt.clinicId || this.context.clinicId();
    if (!clinicId) throw new Error("Clinic ID is required.");

    const { data, error } = await this.supabase.rpc('add_appointment', {
      p_clinic_id: clinicId,
      p_patient_id: apt.patientId,
      p_doctor_actor_id: this.auth.currentUser()?.actor_id,
      p_date: apt.date,
      p_status: apt.status || 'Agendado',
      p_room_number: apt.roomNumber ?? null,
      p_priority: null
    });

    if (error) throw error;
    
    // Force refresh or append
    if (data) {
       const newApt: Appointment = {
         id: data.id,
         clinicId,
         patientId: apt.patientId,
         doctorActorId: this.auth.currentUser()?.actor_id,
         patientName: apt.patientName || 'Paciente',
         doctorName: this.auth.currentUser()?.name || 'Profissional',
         date: apt.date!,
         status: apt.status || 'Agendado',
         type: apt.type || 'Consulta',
         roomNumber: apt.roomNumber,
         timestamp: new Date().toISOString()
       };
       this.appointments.update(list => [...list, newApt].sort((a,b) => a.date.localeCompare(b.date)));
    }
    return data;
  }

  async updateAppointmentStatus(id: string, status: string) {
    const { error } = await this.supabase.from('appointment').update({ status }).eq('id', id);
    if (error) throw error;
    
    this.appointments.update(list => list.map(a => a.id === id ? { ...a, status } : a));
  }

  async updateAppointmentRoom(id: string, roomNumber: string) {
    const { error } = await this.supabase.from('appointment').update({ room_number: roomNumber }).eq('id', id);
    if (error) throw error;
    
    this.appointments.update(list => list.map(a => a.id === id ? { ...a, roomNumber } : a));
  }

  async transitionAppointmentStatus(id: string, newStatus: string): Promise<void> {
    const apt = this.appointments().find(a => a.id === id);
    if (!apt) throw new Error(`Appointment not found: ${id}`);

    const currentStatus = apt.status;
    if (currentStatus === newStatus) return;

    let isValid = false;
    if (newStatus === 'Cancelado') {
      if (currentStatus !== 'Realizado') isValid = true;
    } else {
      switch (currentStatus) {
        case 'Agendado': if (newStatus === 'Aguardando') isValid = true; break;
        case 'Aguardando': if (newStatus === 'Chamado') isValid = true; break;
        case 'Chamado': if (newStatus === 'Em Atendimento') isValid = true; break;
        case 'Em Atendimento': if (newStatus === 'Realizado') isValid = true; break;
      }
    }

    if (!isValid) throw new Error(`Invalid status transition from '${currentStatus}' to '${newStatus}'`);

    await this.updateAppointmentStatus(id, newStatus);
  }

  // --- Clinical Records ---
  async createClinicalRecord(rec: Partial<ClinicalRecord>) {
    const clinicId = rec.clinicId || this.context.clinicId();
    if (!clinicId) throw new Error("Clinic ID is required for clinical records");

    const { data, error } = await this.supabase.rpc('add_clinical_record', {
      p_clinic_id: clinicId,
      p_patient_id: rec.patientId,
      p_doctor_actor_id: this.auth.currentUser()?.actor_id,
      p_content: rec.content,
      p_type: (rec.type || 'EVOLUCAO').toUpperCase()
    });

    if (error) throw error;

    if (data) {
      const newRec: ClinicalRecord = {
        id: data.id,
        clinicId,
        patientId: rec.patientId!,
        doctorActorId: this.auth.currentUser()?.actor_id,
        patientName: rec.patientName || 'Paciente',
        doctorName: this.auth.currentUser()?.name || 'Profissional',
        content: rec.content!,
        type: data.type || rec.type,
        timestamp: data.created_at || new Date().toISOString()
      };
      this.clinicalRecords.update(list => [newRec, ...list]);
    }
    return data;
  }
}
