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

  accessibleClinics = computed(() => this.clinics());

  constructor(private router: Router) {
    this.supabase = createClient(
      environment['supabaseUrl'] || '',
      environment['supabaseKey'] || ''
    );
    this.initSession();
    effect(() => {
      const clinicId = this.selectedContextClinic();
      if (clinicId) this.syncDataForClinic(clinicId);
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
      if (profile.clinicId) this.selectedContextClinic.set(profile.clinicId);
    }
  }

  private async syncDataForClinic(clinicId: string) {
    const [
      usersRes, clinicsRes, productsRes, txRes,
      aptsRes, patientsRes, recordsRes, postsRes, reqRes
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
        .select('*')
        .eq('clinic_id', clinicId)
        .order('date', { ascending: false }),

      // Appointments
      this.supabase
        .from('appointment')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('date', { ascending: true }),

      // Patients with Actor JOIN
      this.supabase
        .from('patient')
        .select(`
          id, cpf, birth_date, gender,
          actor:id ( name, clinic_id, created_at )
        `)
        .eq('clinic_id', clinicId),

      // Clinical Records
      this.supabase
        .from('clinical_record')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false }),

      // Social Posts
      this.supabase
        .from('social_post')
        .select('*')
        .eq('clinic_id', clinicId),

      // Access Requests
      this.supabase
        .from('access_request')
        .select('*')
        .eq('clinic_id', clinicId)
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
        nextBilling: c.next_billing,
        createdAt: c.created_at
      })));
    }

    if (productsRes.data) {
      this.products.set(productsRes.data.map((p: any) => ({
        id: p.id,
        clinicId: p.clinic_id,
        name: p.name,
        category: p.category,
        stock: p.stock,
        minStock: p.min_stock,
        price: p.price,
        costPrice: p.cost_price,
        supplier: p.supplier,
        expiryDate: p.expiry_date,
        batchNumber: p.batch_number,
        notes: p.notes,
        deleted: p.deleted
      })));
    }

    if (txRes.data) {
      this.transactions.set(txRes.data.map((t: any) => ({
        id: t.id,
        clinicId: t.clinic_id,
        productId: t.product_id,
        productName: t.product_name,
        type: t.type,
        quantity: t.quantity,
        date: t.date,
        notes: t.notes
      })));
    }

    if (aptsRes.data) {
      this.appointments.set(aptsRes.data.map((a: any) => ({
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
      })));
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

    if (recordsRes.data) {
      this.clinicalRecords.set(recordsRes.data.map((r: any) => ({
        id: r.id,
        clinicId: r.clinic_id,
        patientId: r.patient_id,
        patientName: r.patient_name,
        doctorName: r.doctor_name,
        content: r.content,
        notes: r.notes,
        type: r.type,
        timestamp: r.created_at
      })));
    }

    if (postsRes.data) {
      this.socialPosts.set(postsRes.data.map((p: any) => ({
        id: p.id,
        clinicId: p.clinic_id,
        title: p.title,
        content: p.content,
        platform: p.platform,
        status: p.status,
        scheduledAt: p.scheduled_at,
        imageUrl: p.image_url,
        timestamp: p.created_at
      })));
    }

    if (reqRes.data) {
      this.accessRequests.set(reqRes.data.map((r: any) => ({
        id: r.id,
        requesterId: r.requester_id,
        requesterName: r.requester_name,
        clinicId: r.clinic_id,
        clinicName: r.clinic_name,
        reason: r.reason,
        status: r.status,
        createdAt: r.created_at,
        expiresAt: r.expires_at,
        requestedRoleId: r.requested_role_id
      })));
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

  // --- CRUD Operations ---
  
  async addProduct(product: Partial<Product>) {
    const { data, error } = await this.supabase
      .from('product')
      .insert({
        clinic_id: product.clinicId,
        name: product.name,
        category: product.category,
        stock: product.stock,
        min_stock: product.minStock,
        price: product.price,
        supplier: product.supplier,
        expiry_date: product.expiryDate,
        batch_number: product.batchNumber,
        notes: product.notes
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
    const { data, error } = await this.supabase
      .from('appointment')
      .insert({
        clinic_id: apt.clinicId,
        patient_id: apt.patientId,
        patient_name: apt.patientName,
        doctor_name: apt.doctorName,
        date: apt.date,
        status: apt.status,
        type: apt.type,
        room_number: apt.roomNumber
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
  
  async logout() { 
      await this.supabase.auth.signOut();
      this.router.navigate(['/login']);
  }

  // Missing Methods
  async addTransaction(tx: Partial<StockTransaction>) { 
    const { error } = await this.supabase
      .from('stock_transaction')
      .insert({
        clinic_id: tx.clinicId,
        product_id: tx.productId,
        product_name: tx.productName,
        type: tx.type,
        quantity: tx.quantity,
        date: new Date().toISOString(),
        notes: tx.notes
      });
    
    if (error) throw error;
  }

  async addPatient(p: Partial<Patient>) { 
    return this.supabase.rpc('create_patient_with_actor', {
      p_clinic_id: p.clinicId,
      p_name: p.name,
      p_cpf: p.cpf,
      p_birth_date: p.birthDate,
      p_gender: p.gender
    });
  }

  async updateAppointmentStatus(id: string, status: string) { 
    const { error } = await this.supabase
      .from('appointment')
      .update({ status })
      .eq('id', id);
    
    if (error) throw error;
  }

  async updateAppointmentRoom(id: string, room: string) { 
    const { error } = await this.supabase
      .from('appointment')
      .update({ room_number: room })
      .eq('id', id);
    
    if (error) throw error;
  }

  async requestAccess(clinicId: string, clinicName: string, reason: string, roleId: string = 'roles/viewer') { 
    const { error } = await this.supabase
      .from('access_request')
      .insert({
        clinic_id: clinicId,
        clinic_name: clinicName,
        reason: reason,
        requested_role_id: roleId,
        requester_id: this.currentUser()?.id,
        requester_name: this.currentUser()?.name,
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

  async addSocialPost(post: Partial<SocialPost>) { 
    const { error } = await this.supabase
      .from('social_post')
      .insert({
        clinic_id: post.clinicId,
        title: post.title,
        content: post.content,
        platform: post.platform,
        status: post.status,
        image_url: post.imageUrl
      });
    
    if (error) throw error;
  }

  async addClinicalRecord(rec: Partial<ClinicalRecord>) { 
    const { error } = await this.supabase
      .from('clinical_record')
      .insert({
        clinic_id: rec.clinicId,
        patient_id: rec.patientId,
        patient_name: rec.patientName,
        doctor_name: rec.doctorName,
        content: rec.content,
        type: rec.type,
        notes: rec.notes
      });
    
    if (error) throw error;
  }

  async addClinic(c: Partial<Clinic>) { 
    const { error } = await this.supabase.from('clinic').insert(c);
    if (error) throw error;
  }

  async deleteClinic(id: string) {
    const { error } = await this.supabase.from('clinic').delete().eq('id', id);
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
      if (!u.email || !pw || !u.clinicId || !u.name) {
        throw new Error('Email, Password, Name and Clinic are required for new users');
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
