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
      .from('user')
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
    console.log('Syncing data for clinic:', clinicId);
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

  async saveUser(u: Partial<UserProfile>, pw?: string) {
    // Note: This needs complex handling for Actor + User + Auth. 
    // Stubbing real call logic for now to fix build.
    console.log('Real logic for saveUser pending', u);
  }
}
