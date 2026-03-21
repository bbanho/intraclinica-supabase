import { Injectable, signal, computed, effect } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { 
  Product, StockTransaction, UserProfile, Clinic, 
  Appointment, Patient, ClinicalRecord, SocialPost
} from '../models/types';
import { IAM_ROLES } from '../config/iam-roles';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private supabase: SupabaseClient;

  // Signals
  products = signal<Product[]>([]);
  transactions = signal<StockTransaction[]>([]);
  users = signal<UserProfile[]>([]);
  clinics = signal<Clinic[]>([]);
  appointments = signal<Appointment[]>([]);
  patients = signal<Patient[]>([]);
  clinicalRecords = signal<ClinicalRecord[]>([]);
  socialPosts = signal<SocialPost[]>([]);
  accessRequests = signal<any[]>([]);

  currentUser = signal<UserProfile | null>(null);
  selectedContextClinic = signal<string | null>(null);

  // SaaS global metrics (static placeholders — no billing backend yet)
  globalArr = signal<number>(0);
  globalUptime = signal<number>(99.9);

  accessibleClinics = computed(() => this.clinics());

  private resolveDoctorName(actorId: string | undefined): string {
    if (!actorId) return 'Profissional';
    const match = this.users().find(u => u.actor_id === actorId);
    return match?.name ?? 'Profissional';
  }

  private mapAppointmentRow(row: any): Appointment {
    const doctorActorId: string | undefined = row.doctor_actor_id ?? undefined;
    return {
      id: row.id,
      clinicId: row.clinic_id,
      patientId: row.patient_id,
      doctorActorId,
      patientName: row.patient_name ?? row.patient?.actor?.name ?? '',
      doctorName: this.resolveDoctorName(doctorActorId),
      date: row.appointment_date ?? row.date,
      status: row.status,
      type: row.type ?? 'Consulta',
      roomNumber: row.room_number,
      timestamp: row.timestamp ?? row.created_at
    };
  }

  private mapClinicalRecordRow(row: any): ClinicalRecord {
    const doctorActorId: string | undefined = row.doctor_actor_id ?? undefined;
    return {
      id: row.id,
      clinicId: row.clinic_id,
      patientId: row.patient_id,
      doctorActorId,
      patientName: row.patient?.actor?.name ?? '',
      doctorName: this.resolveDoctorName(doctorActorId),
      content: row.content,
      type: row.type,
      timestamp: row.timestamp ?? row.created_at
    };
  }

  private mapAccessRequestRow(row: any) {
    return {
      id: row.id,
      requesterUserId: row.requester_user_id,
      clinicId: row.clinic_id,
      clinicName: row.clinic_name,
      reason: row.reason,
      status: row.status,
      createdAt: row.created_at,
      requestedRoleId: row.requested_role_id
    };
  }

  constructor(private router: Router) {
    this.supabase = createClient(
      environment['supabaseUrl'] || '',
      environment['supabaseKey'] || ''
    );
    this.initSession();
    effect(() => {
      const clinicId = this.selectedContextClinic();
      // 'all' is the SUPER_ADMIN global sentinel — only load all clinics, not clinic-specific data
      if (clinicId && clinicId !== 'all') {
        this.syncDataForClinic(clinicId);
      } else if (clinicId === 'all') {
        // Load all clinics for the global SaaS governance view
        this.supabase.from('clinic').select('*').then(({ data }) => {
          if (data) this.clinics.set(data as any[]);
        });
      }
    });
  }

  private async initSession() {
    const { data } = await this.supabase.auth.getSession();
    if (data.session?.user) await this.loadUserProfile(data.session.user.id);

    this.supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) await this.loadUserProfile(session.user.id);
      else {
        this.currentUser.set(null);
        this.selectedContextClinic.set(null);
      }
    });
  }

  async loadUserProfile(uid: string) {
    const { data, error } = await this.supabase
      .from('app_user')
      .select(`
        id,
        email,
        role,
        iam_bindings,
        assigned_room,
        actor:actor_id (
          id,
          name,
          clinic_id
        )
      `)
      .eq('id', uid)
      .single();
      
    if (data) {
      const u = data as any; 
      const profile: UserProfile = { 
        id: u.id,
        actor_id: u.actor?.id,
        name: u.actor?.name,
        clinicId: u.actor?.clinic_id,
        email: u.email,
        role: u.role,
        iam: u.iam_bindings || [],
        assignedRoom: u.assigned_room
      };
      this.currentUser.set(profile);
      
      // AUTO-SELECT CLINIC (FIX FOR ADMINS)
      if (profile.role === 'SUPER_ADMIN') {
          // SUPER_ADMIN always defaults to global SaaS view ('all'), regardless of actor.clinic_id
          this.selectedContextClinic.set('all');
      } else if (profile.clinicId) {
          this.selectedContextClinic.set(profile.clinicId);
      } else if (profile.role === 'ADMIN') {
          // ADMIN with no specific clinic: auto-select first available
          setTimeout(async () => {
              const { data: clinics } = await this.supabase.from('clinic').select('id').limit(1);
              if (clinics && clinics.length > 0) {
                  console.log('Auto-selecting clinic for Admin:', clinics[0].id);
                  this.selectedContextClinic.set(clinics[0].id);
              }
          }, 500);
      }
    }
  }

  private async fetchAppointmentsForClinic(clinicId: string) {
    const { data, error } = await this.supabase
      .from('appointment')
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

    if (error) throw error;
    return data || [];
  }

  private async fetchClinicalRecordsForClinic(clinicId: string) {
    const { data, error } = await this.supabase
      .from('clinical_record')
      .select(`
        *,
        patient:patient_id (
          actor:id (
            name
          )
        )
      `)
      .eq('clinic_id', clinicId)
      .order('timestamp', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  private async fetchAccessRequestsForClinic(clinicId: string) {
    const result = await this.supabase
      .from('access_request')
      .select('*')
      .eq('clinic_id', clinicId);

    if (result.error) throw result.error;
    return result.data || [];
  }

  private async updateAppointmentFields(id: string, values: Record<string, unknown>) {
    return this.supabase
      .from('appointment')
      .update(values)
      .eq('id', id);
  }

  private async syncDataForClinic(clinicId: string) {
    const [
      usersRes, clinicsRes, productsRes, txRes,
      appointmentRows, patientsRes, recordRows, postsRes, requestRows
    ] = await Promise.all([
      // Users with Actor JOIN (filter by actor's clinic)
      this.supabase
        .from('app_user')
        .select(`
          id, email, role, iam_bindings, assigned_room,
          actor:actor_id!inner ( id, name, clinic_id )
        `)
        .eq('actor.clinic_id', clinicId),

      // Clinics (all accessible)
      this.supabase.from('clinic').select('*'),

      // Products (active only)
      this.supabase
        .from('product')
        .select('*')
        .eq('clinic_id', clinicId)
        .eq('deleted', false),

      // Stock Transactions
      this.supabase
        .from('stock_transaction')
        .select(`
          *,
          product:product_id (
            name
          )
        `)
        .eq('clinic_id', clinicId)
        .order('timestamp', { ascending: false }),

      // Appointments
      this.fetchAppointmentsForClinic(clinicId),

      // Patients with Actor JOIN
      this.supabase
        .from('patient')
        .select(`
          id, cpf, birth_date, gender,
          actor:id ( name, clinic_id, created_at )
        `)
        .eq('clinic_id', clinicId),

      // Clinical Records
      this.fetchClinicalRecordsForClinic(clinicId),

      // Social Posts
      this.supabase
        .from('social_post')
        .select('*')
        .eq('clinic_id', clinicId),

      // Access Requests
      this.fetchAccessRequestsForClinic(clinicId)
    ]);

    if (usersRes.data) {
      this.users.set(usersRes.data.map((u: any) => ({
        id: u.id,
        actor_id: u.actor?.id,
        name: u.actor?.name || '',
        clinicId: u.actor?.clinic_id,
        email: u.email,
        role: u.role,
        iam: u.iam_bindings || [],
        assignedRoom: u.assigned_room
      })));
    }

    if (clinicsRes.data) {
      this.clinics.set(clinicsRes.data.map((c: any) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        plan: c.plan,
        status: c.status,
        nextBilling: '',
        createdAt: c.created_at
      })));
    }

    if (productsRes.data) {
      this.products.set(productsRes.data.map((p: any) => ({
        id: p.id,
        clinicId: p.clinic_id,
        name: p.name,
        category: p.category,
        stock: p.current_stock ?? 0,
        minStock: p.min_stock,
        price: p.price,
        costPrice: p.avg_cost_price ?? 0,
        supplier: '',
        expiryDate: undefined,
        batchNumber: p.barcode ?? undefined,
        notes: undefined,
        deleted: p.deleted
      })));
    }

    if (txRes.data) {
      this.transactions.set(txRes.data.map((t: any) => ({
        id: t.id,
        clinicId: t.clinic_id,
        productId: t.product_id,
        productName: t.product?.name ?? '',
        type: t.type,
        quantity: t.total_qty,
        date: t.timestamp,
        notes: t.reason
      })));
    }

    if (appointmentRows) {
      this.appointments.set(appointmentRows.map((a: any) => this.mapAppointmentRow(a)));
    }

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

    if (recordRows) {
      this.clinicalRecords.set(recordRows.map((r: any) => this.mapClinicalRecordRow(r)));
    }

    if (postsRes.data) {
      this.socialPosts.set(postsRes.data.map((p: any) => ({
        id: p.id,
        clinicId: p.clinic_id,
        title: p.title,
        content: p.content,
        platform: p.platform,
        status: p.status ?? 'draft',
        scheduledAt: p.scheduled_at ?? undefined,
        imageUrl: p.image_url ?? undefined,
        timestamp: p.created_at
      })));
    }

    if (requestRows) {
      this.accessRequests.set(requestRows.map((r: any) => this.mapAccessRequestRow(r)));
    }
  }

  checkPermission(permission: string, resource: string = '*'): boolean {
    const user = this.currentUser();
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true; 
    const bindings = user.iam || [];
    const targetResource = resource === '*' ? (this.selectedContextClinic() || 'global') : resource;
    for (const binding of bindings) {
        if (binding.resource === '*' || binding.resource === targetResource) {
             const role = IAM_ROLES[binding.roleId];
             if (role && (role.permissions.includes('*') || role.permissions.includes(permission))) return true;
        }
    }
    return false;
  }

  
  async addProduct(product: Partial<Product>) {
    const clinicId = product.clinicId || this.selectedContextClinic();
    if (!clinicId) throw new Error("Clinic ID is required.");

    const { data, error } = await this.supabase
      .from('product')
      .insert({
        clinic_id: clinicId,
        barcode: product.batchNumber,
        name: product.name,
        category: product.category,
        current_stock: product.stock || 0,
        min_stock: product.minStock || 0,
        price: product.price || 0,
        avg_cost_price: product.costPrice || 0,
        deleted: false
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
  
  async deleteProduct(id: string) { 
    const { error } = await this.supabase
      .from('product')
      .update({ deleted: true })
      .eq('id', id);
    
    if (error) throw error;
  }
  
  async addAppointment(apt: Partial<Appointment>) { 
    const clinicId = apt.clinicId || this.selectedContextClinic();
    if (!clinicId) throw new Error("Clinic ID is required.");

    const { data, error } = await this.supabase.rpc('add_appointment', {
      p_clinic_id: clinicId,
      p_patient_id: apt.patientId,
      p_doctor_actor_id: this.currentUser()?.actor_id,
      p_date: apt.date,
      p_status: apt.status || 'Agendado',
      p_room_number: apt.roomNumber ?? null,
      p_priority: null
    });

    if (error) throw error;
    return data;
  }
  
  async logout() { 
      await this.supabase.auth.signOut();
      this.router.navigate(['/login']);
  }

  async addTransaction(tx: Partial<StockTransaction>) { 
    const clinicId = tx.clinicId || this.selectedContextClinic();
    if (!clinicId) throw new Error("Clinic ID is required.");

    const { error } = await this.supabase.rpc('add_stock_movement', {
      p_clinic_id: clinicId,
      p_product_id: tx.productId,
      p_type: tx.type,
      p_qty: tx.quantity,
      p_reason: tx.notes || 'MANUAL',
      p_notes: null,
      p_actor_id: this.currentUser()?.actor_id ?? null
    });

    if (error) throw error;
  }

  async addPatient(p: Partial<Patient>) { 
    const clinicId = p.clinicId || this.selectedContextClinic();
    if (!clinicId) throw new Error("Clinic ID is required.");

    return this.supabase.rpc('create_patient_with_actor', {
      p_clinic_id: clinicId,
      p_name: p.name,
      p_cpf: p.cpf,
      p_birth_date: p.birthDate,
      p_gender: p.gender
    });
  }

  async updateAppointmentStatus(id: string, status: string) { 
    const { error } = await this.updateAppointmentFields(id, { status });
    
    if (error) throw error;
  }

  async updateAppointmentRoom(id: string, room: string) { 
    const { error } = await this.updateAppointmentFields(
      id,
      { room_number: room }
    );
    
    if (error) throw error;
  }

  async transitionAppointmentStatus(id: string, newStatus: string): Promise<void> {
    // 1. Fetch current status
    const { data: current, error: fetchError } = await this.supabase
      .from('appointment')
      .select('status')
      .eq('id', id)
      .single();

    if (fetchError || !current) {
      throw new Error(`Appointment not found: ${id}`);
    }

    const currentStatus = current.status;

    // 2. Validate transition
    if (currentStatus === newStatus) return; // No change needed

    let isValid = false;

    // Rule: Any (except Realizado) -> Cancelado
    if (newStatus === 'Cancelado') {
      if (currentStatus !== 'Realizado') {
        isValid = true;
      }
    } else {
      // Rule: Strict progression
      switch (currentStatus) {
        case 'Agendado':
          if (newStatus === 'Aguardando') isValid = true;
          break;
        case 'Aguardando':
          if (newStatus === 'Chamado') isValid = true;
          break;
        case 'Chamado':
          if (newStatus === 'Em Atendimento') isValid = true;
          break;
        case 'Em Atendimento':
          if (newStatus === 'Realizado') isValid = true;
          break;
      }
    }

    if (!isValid) {
      throw new Error(`Invalid status transition from '${currentStatus}' to '${newStatus}'`);
    }

    // 3. Update status
    const { error: updateError } = await this.updateAppointmentFields(id, { status: newStatus });

    if (updateError) throw updateError;
  }

  async requestAccess(clinicId: string, clinicName: string, reason: string, roleId: string = 'roles/viewer') { 
    const { error } = await this.supabase
      .from('access_request')
      .insert({
        clinic_id: clinicId,
        clinic_name: clinicName,
        reason: reason,
        requested_role_id: roleId,
        requester_user_id: this.currentUser()?.id,
        status: 'pending'
      });

    if (error) throw error;
  }

  async approveAccess(reqId: string) { 
    const { error } = await this.supabase
      .from('access_request')
      .update({ status: 'approved' })
      .eq('id', reqId);
    
    if (error) throw error;
  }

  async addSocialPost(post: any) { 
    const clinicId = post.clinicId || this.selectedContextClinic();
    if (!clinicId) throw new Error("Clinic ID is required for social posts");

    const title = post.title || post.topic || 'Novo Conteúdo';
    const rawContent = post.content || post.caption || '';
    const hashtags = Array.isArray(post.hashtags) 
      ? post.hashtags.map((t: string) => t.startsWith('#') ? t : '#'+t).join(' ') 
      : (post.hashtags || '');
    
    const finalContent = hashtags ? `${rawContent}\n\n${hashtags}` : rawContent;

    const { data, error } = await this.supabase
      .from('social_post')
      .insert({
        clinic_id: clinicId,
        title: title,
        content: finalContent,
        platform: post.platform || 'instagram'
      })
      .select()
      .single();
    
    if (error) throw error;

    if (data) {
      const newPost: SocialPost = {
        id: data.id,
        clinicId: data.clinic_id,
        title: data.title,
        content: data.content,
        platform: data.platform,
        status: data.status ?? 'draft',
        imageUrl: data.image_url ?? undefined,
        scheduledAt: data.scheduled_at ?? undefined,
        timestamp: data.created_at
      };
      this.socialPosts.update(list => [...list, newPost]);
    }
    return data;
  }

  async addClinicalRecord(rec: Partial<ClinicalRecord>) { 
    const clinicId = rec.clinicId || this.selectedContextClinic();
    if (!clinicId) throw new Error("Clinic ID is required for clinical records");

    const { data, error } = await this.supabase.rpc('add_clinical_record', {
      p_clinic_id: clinicId,
      p_patient_id: rec.patientId,
      p_doctor_actor_id: this.currentUser()?.actor_id,
      p_content: rec.content,
      p_type: (rec.type || 'EVOLUCAO').toUpperCase()
    });

    if (error) throw error;

    if (data) {
      const newRec: ClinicalRecord = this.mapClinicalRecordRow(data);
      this.clinicalRecords.update(list => [newRec, ...list]);
    }
    return data;
  }


  async addClinic(c: Partial<Clinic>) { 
    const { error } = await this.supabase.from('clinic').insert({
      name: c.name,
      email: c.email,
      plan: c.plan,
      status: c.status
    });
    if (error) {
      if (error.code === '23505') {
        console.error('Duplicate clinic detected:', error);
        throw new Error('Clinic already exists (Duplicate Key).');
      }
      throw error;
    }
  }

  async deleteClinic(id: string) {
    const { error } = await this.supabase
      .from('clinic')
      .update({ status: 'inactive' })
      .eq('id', id);
    if (error) throw error;
  }

  async assignRoom(room: string | null) {
    const user = this.currentUser();
    if (!user) return;

    const { error } = await this.supabase
      .from('app_user')
      .update({ assigned_room: room })
      .eq('id', user.id);

    if (error) throw error;

    // Update local state
    this.currentUser.update(u => u ? ({ ...u, assignedRoom: room || undefined }) : null);
  }

  async saveUser(u: Partial<UserProfile>, pw?: string) {
    if (u.id) {
      const { data, error } = await this.supabase.rpc('update_user_with_actor', {
        p_user_id: u.id,
        p_name: u.name,
        p_role: u.role,
        p_iam_bindings: u.iam || [],
        p_assigned_room: u.assignedRoom
      });
      
      if (error) throw error;
      
      if (pw) {
        const { error: pwError } = await this.supabase.auth.updateUser({ password: pw });
        if (pwError) throw pwError;
      }

      if (data) {
        const updated: UserProfile = {
          id: data.id,
          actor_id: data.actor_id,
          clinicId: data.actor?.clinic_id,
          name: data.actor?.name,
          email: data.email,
          role: data.role,
          iam: data.iam_bindings || [],
          assignedRoom: data.assigned_room
        };
        
        this.users.update(list => list.map(user => user.id === updated.id ? updated : user));
        if (this.currentUser()?.id === updated.id) {
          this.currentUser.set(updated);
        }
      }
      
    } else {
      if (!u.email || !pw || !u.name) {
        throw new Error('Email, Password and Name are required for new users');
      }
      
      const { data: authData, error: authError } = await this.supabase.auth.signUp({
        email: u.email,
        password: pw,
        options: {
          data: {
            name: u.name,
            clinic_id: u.clinicId,
            role: u.role || 'USER'
          }
        }
      });
      
      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create auth user');
      
      const { data, error: rpcError } = await this.supabase.rpc('create_user_with_actor', {
        p_user_id: authData.user.id,
        p_email: u.email,
        p_name: u.name,
        p_clinic_id: u.clinicId,
        p_role: u.role || 'USER',
        p_iam_bindings: u.iam || [],
        p_assigned_room: u.assignedRoom
      });
      
      if (rpcError) throw rpcError;

      if (data) {
        const newUser: UserProfile = {
          id: data.id,
          actor_id: data.actor_id,
          clinicId: data.actor?.clinic_id,
          name: data.actor?.name,
          email: data.email,
          role: data.role,
          iam: data.iam_bindings || [],
          assignedRoom: data.assigned_room
        };
        this.users.update(list => [...list, newUser]);
      }
    }
  }
}
