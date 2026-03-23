import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Router } from '@angular/router';
import { 
  Product, StockTransaction, UserProfile, Clinic, 
  Appointment, Patient, ClinicalRecord, SocialPost
} from '../models/types';
import { AuthStateService } from './auth-state.service';
import { ClinicContextService } from './clinic-context.service';
import { PatientService } from './patient.service';
import { InventoryService } from './inventory.service';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private supabase = inject(SupabaseService);
  private authState = inject(AuthStateService);
  private context = inject(ClinicContextService);
  private patientService = inject(PatientService);
  private inventoryService = inject(InventoryService);
  private router = inject(Router);

  // Expose signals from delegated services
  currentUser = computed(() => this.authState.currentUser());
  selectedContextClinic = this.context.selectedClinic; // WritableSignal exposed directly
  
  patients = computed(() => this.patientService.patients());
  appointments = computed(() => this.patientService.appointments());
  clinicalRecords = computed(() => this.patientService.clinicalRecords());

  // Inventory logic handles its own DB queries, but doesn't have a persistent signal state yet
  // We can either map it or leave it as is. The original code had signals.
  // Actually, wait, InventoryService right now doesn't use Signals for state, it returns promises.
  // But wait, DatabaseService HAD `products` and `transactions` signals. 
  // For backward compatibility until Phase 3, we should keep these signals here for components that rely on DatabaseService.products.
  products = signal<Product[]>([]);
  transactions = signal<StockTransaction[]>([]);
  
  users = signal<UserProfile[]>([]);
  clinics = signal<Clinic[]>([]);
  socialPosts = signal<SocialPost[]>([]);
  accessRequests = signal<any[]>([]);

  // SaaS global metrics
  globalArr = signal<number>(0);
  globalUptime = signal<number>(99.9);

  accessibleClinics = computed(() => this.clinics());

  constructor() {
    effect(() => {
      const clinicId = this.context.selectedClinic();
      if (clinicId && clinicId !== 'all') {
        this.syncDataForClinic(clinicId);
      } else if (clinicId === 'all') {
        this.supabase.from('clinic').select('*').then(({ data }) => {
          if (data) this.clinics.set(data as any[]);
        });
      }
    });
  }

  // Forwarding methods
  checkPermission(permission: string, resource: string = '*'): boolean {
    return this.authState.checkPermission(permission, resource);
  }

  async logout() {
    await this.authState.logout();
  }

  async addPatient(p: Partial<Patient>) { return this.patientService.createPatient(p); }
  async addAppointment(apt: Partial<Appointment>) { return this.patientService.createAppointment(apt); }
  async updateAppointmentStatus(id: string, status: string) { return this.patientService.updateAppointmentStatus(id, status); }
  async updateAppointmentRoom(id: string, room: string) { return this.patientService.updateAppointmentRoom(id, room); }
  async transitionAppointmentStatus(id: string, newStatus: string) { return this.patientService.transitionAppointmentStatus(id, newStatus); }
  async addClinicalRecord(rec: Partial<ClinicalRecord>) { return this.patientService.createClinicalRecord(rec); }

  async addSocialPost(post: any) { 
    const clinicId = post.clinicId || this.selectedContextClinic();
    if (!clinicId) throw new Error("Clinic ID is required for social posts");

    const title = post.title || post.topic || 'Novo Conteúdo';
    const rawContent = post.content || post.caption || '';
    const hashtags = Array.isArray(post.hashtags) 
      ? post.hashtags.map((t: string) => t.startsWith('#') ? t : '#'+t).join(' ') 
      : (post.hashtags || '');
    
    const finalContent = hashtags ? `${rawContent}\n\n${hashtags}` : rawContent;

    const { data, error } = await this.supabase.from('social_post').insert({
      clinic_id: clinicId,
      title: title,
      content: finalContent,
      platform: post.platform || 'instagram'
    }).select().single();
    
    if (error) throw error;

    if (data) {
      const newPost: SocialPost = {
        id: data.id, clinicId: data.clinic_id, title: data.title, content: data.content,
        platform: data.platform, status: data.status ?? 'draft', 
        imageUrl: data.image_url ?? undefined, scheduledAt: data.scheduled_at ?? undefined, timestamp: data.created_at
      };
      this.socialPosts.update(list => [...list, newPost]);
    }
    return data;
  }

  async addProduct(product: Partial<Product>) {
    const res = await this.inventoryService.createItem({
      name: product.name ?? '',
      category: product.category,
      current_stock: product.stock,
      min_stock: product.minStock,
      avg_cost_price: product.costPrice,
      price: product.price,
      barcode: product.batchNumber
    });
    // Optimistic UI update
    if (res) {
      this.products.update(list => [...list, {
        id: res.id, clinicId: res.clinic_id, name: res.name, category: res.category,
        stock: res.current_stock ?? 0, minStock: res.min_stock ?? 0, price: res.price,
        costPrice: res.avg_cost_price ?? 0, supplier: '', batchNumber: res.barcode ?? undefined, deleted: false
      }]);
    }
    return res;
  }

  async deleteProduct(id: string) {
    await this.inventoryService.deleteItem(id);
    this.products.update(list => list.filter(p => p.id !== id));
  }

  async addTransaction(tx: Partial<StockTransaction>) {
    await this.inventoryService.recordMovement({
      item_id: tx.productId!,
      qty_change: tx.type === 'IN' ? tx.quantity! : -(tx.quantity!),
      reason: tx.notes,
      notes: undefined
    });
  }

  // Sync remaining data (Users, Clinics, Posts, Requests)
  private async syncDataForClinic(clinicId: string) {
    const [usersRes, clinicsRes, postsRes, requestRows, productsRes, txRes] = await Promise.all([
      this.supabase.from('app_user').select('id, email, role, iam_bindings, assigned_room, actor:actor_id!inner(id, name, clinic_id)').eq('actor.clinic_id', clinicId),
      this.supabase.from('clinic').select('*'),
      this.supabase.from('social_post').select('*').eq('clinic_id', clinicId),
      this.supabase.from('access_request').select('*').eq('clinic_id', clinicId),
      this.inventoryService.getItems(),
      this.inventoryService.getMovements()
    ]);

    if (usersRes.data) {
      this.users.set(usersRes.data.map((u: any) => ({
        id: u.id, actor_id: u.actor?.id, name: u.actor?.name || '',
        clinicId: u.actor?.clinic_id, email: u.email, role: u.role,
        iam: u.iam_bindings || [], assignedRoom: u.assigned_room
      })));
    }

    if (clinicsRes.data) {
      this.clinics.set(clinicsRes.data.map((c: any) => ({
        id: c.id, name: c.name, email: c.email, plan: c.plan, status: c.status, nextBilling: '', createdAt: c.created_at
      })));
    }

    if (postsRes.data) {
      this.socialPosts.set(postsRes.data.map((p: any) => ({
        id: p.id, clinicId: p.clinic_id, title: p.title, content: p.content, platform: p.platform,
        status: p.status ?? 'draft', scheduledAt: p.scheduled_at ?? undefined, imageUrl: p.image_url ?? undefined, timestamp: p.created_at
      })));
    }

    if (requestRows.data) {
      this.accessRequests.set(requestRows.data.map((r: any) => ({
        id: r.id, requesterUserId: r.requester_user_id, clinicId: r.clinic_id, clinicName: r.clinic_name,
        reason: r.reason, status: r.status, createdAt: r.created_at, requestedRoleId: r.requested_role_id
      })));
    }

    if (productsRes) {
      this.products.set(productsRes.map((p: any) => ({
        id: p.id, clinicId: p.clinic_id, name: p.name, category: p.category,
        stock: p.current_stock ?? 0, minStock: p.min_stock, price: p.price,
        costPrice: p.avg_cost_price ?? 0, supplier: '', batchNumber: p.barcode ?? undefined, deleted: p.deleted
      })));
    }

    if (txRes) {
      this.transactions.set(txRes.map((t: any) => ({
        id: t.id, clinicId: t.clinic_id, productId: t.product_id, productName: t.product?.name ?? '',
        type: t.type, quantity: t.total_qty, date: t.timestamp, notes: t.reason
      })));
    }
  }

  // --- Leftover Logic (Access Requests, Clinics, Users) ---
  async requestAccess(clinicId: string, clinicName: string, reason: string, roleId: string = 'roles/viewer') {
    const { error } = await this.supabase.from('access_request').insert({
      clinic_id: clinicId, clinic_name: clinicName, reason: reason,
      requested_role_id: roleId, requester_user_id: this.authState.currentUser()?.id, status: 'pending'
    });
    if (error) throw error;
  }

  async approveAccess(reqId: string) {
    const { error } = await this.supabase.from('access_request').update({ status: 'approved' }).eq('id', reqId);
    if (error) throw error;
  }

  async addClinic(c: Partial<Clinic>) {
    const { error } = await this.supabase.from('clinic').insert({ name: c.name, email: c.email, plan: c.plan, status: c.status });
    if (error) {
      if (error.code === '23505') throw new Error('Clinic already exists (Duplicate Key).');
      throw error;
    }
  }

  async deleteClinic(id: string) {
    const { error } = await this.supabase.from('clinic').update({ status: 'inactive' }).eq('id', id);
    if (error) throw error;
  }

  async assignRoom(room: string | null) {
    const user = this.authState.currentUser();
    if (!user) return;
    const { error } = await this.supabase.from('app_user').update({ assigned_room: room }).eq('id', user.id);
    if (error) throw error;
    this.authState.currentUser.update(u => u ? ({ ...u, assignedRoom: room || undefined }) : null);
  }

  async saveUser(u: Partial<UserProfile>, pw?: string) {
    if (u.id) {
      const { data, error } = await this.supabase.rpc('update_user_with_actor', {
        p_user_id: u.id, p_name: u.name, p_role: u.role, p_iam_bindings: u.iam || [], p_assigned_room: u.assignedRoom
      });
      if (error) throw error;
      if (pw) {
        const { error: pwError } = await this.supabase.auth.updateUser({ password: pw });
        if (pwError) throw pwError;
      }
      if (data) {
        const updated: UserProfile = {
          id: data.id, actor_id: data.actor_id, clinicId: data.actor?.clinic_id,
          name: data.actor?.name, email: data.email, role: data.role,
          iam: data.iam_bindings || [], assignedRoom: data.assigned_room
        };
        this.users.update(list => list.map(user => user.id === updated.id ? updated : user));
        if (this.authState.currentUser()?.id === updated.id) this.authState.currentUser.set(updated);
      }
    } else {
      if (!u.email || !pw || !u.name) throw new Error('Email, Password and Name are required for new users');
      const { data: authData, error: authError } = await this.supabase.auth.signUp({
        email: u.email, password: pw, options: { data: { name: u.name, clinic_id: u.clinicId, role: u.role || 'USER' } }
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create auth user');
      const { data, error: rpcError } = await this.supabase.rpc('create_user_with_actor', {
        p_user_id: authData.user.id, p_email: u.email, p_name: u.name, p_clinic_id: u.clinicId,
        p_role: u.role || 'USER', p_iam_bindings: u.iam || [], p_assigned_room: u.assignedRoom
      });
      if (rpcError) throw rpcError;
      if (data) {
        const newUser: UserProfile = {
          id: data.id, actor_id: data.actor_id, clinicId: data.actor?.clinic_id,
          name: data.actor?.name, email: data.email, role: data.role,
          iam: data.iam_bindings || [], assignedRoom: data.assigned_room
        };
        this.users.update(list => [...list, newUser]);
      }
    }
  }
}
