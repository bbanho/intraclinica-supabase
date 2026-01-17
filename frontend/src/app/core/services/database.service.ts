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
    const { data } = await this.supabase.from('profiles').select('*').eq('id', uid).single();
    if (data) {
      const user = data as any; 
      const profile: UserProfile = { ...user, clinicId: user.clinic_id, iam: user.iam || [] };
      this.currentUser.set(profile);
      if (profile.clinicId) this.selectedContextClinic.set(profile.clinicId);
    }
  }

  private async syncDataForClinic(clinicId: string) {
    // Stub implementation for compilation check
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

  // --- CRUD Operations (Stubs & Impl) ---
  
  async addProduct(product: Partial<Product>) {
    console.log('Stub: addProduct', product);
  }
  
  async deleteProduct(id: string) { 
      console.log('Stub: deleteProduct', id);
  }
  
  async addAppointment(apt: Partial<Appointment>) { 
      console.log('Stub: addAppointment', apt);
  }
  
  async logout() { 
      await this.supabase.auth.signOut();
      this.router.navigate(['/login']);
  }

  // Missing Methods (Stubs)
  async addTransaction(tx: Partial<StockTransaction>) { console.log('Stub: addTransaction', tx); }
  async addPatient(p: Partial<Patient>) { console.log('Stub: addPatient', p); }
  async addClinic(c: Partial<Clinic>) { console.log('Stub: addClinic', c); }
  async deleteClinic(id: string) { console.log('Stub: deleteClinic', id); }
  async saveUser(u: Partial<UserProfile>, pw?: string) { console.log('Stub: saveUser', u); }
  async updateAppointmentStatus(id: string, status: string) { console.log('Stub: updateStatus', id, status); }
  async updateAppointmentRoom(id: string, room: string) { console.log('Stub: updateRoom', id, room); }
  async requestAccess(clinicId: string, name: string, reason: string) { console.log('Stub: reqAccess'); }
  async approveAccess(reqId: string) { console.log('Stub: approveAccess'); }
  async addSocialPost(post: Partial<SocialPost>) { console.log('Stub: addPost'); }
  async addClinicalRecord(rec: Partial<ClinicalRecord>) { console.log('Stub: addRec'); }
}