import { Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from './supabase.service';
import { UserProfile } from '../models/types';
import { IAM_ROLES } from '../config/iam-roles';
import { ClinicContextService } from './clinic-context.service';

@Injectable({
  providedIn: 'root'
})
export class AuthStateService {
  private supabaseService = inject(SupabaseService);
  private router = inject(Router);
  private context = inject(ClinicContextService);

  currentUser = signal<UserProfile | null>(null);

  constructor() {
    this.initSession();
  }

  async initSession() {
    const { data } = await this.supabaseService.supabase.auth.getSession();
    if (data.session?.user) {
      await this.loadUserProfile(data.session.user.id);
    }

    this.supabaseService.supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await this.loadUserProfile(session.user.id);
      } else {
        this.currentUser.set(null);
        this.context.selectedClinic.set(null);
      }
    });
  }

  async loadUserProfile(uid: string) {
    const { data } = await this.supabaseService.supabase
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
        this.context.selectedClinic.set('all');
      } else if (profile.clinicId) {
        this.context.selectedClinic.set(profile.clinicId);
      } else if (profile.role === 'ADMIN') {
        // ADMIN with no specific clinic: auto-select first available
        setTimeout(async () => {
          const { data: clinics } = await this.supabaseService.supabase.from('clinic').select('id').limit(1);
          if (clinics && clinics.length > 0) {
            console.log('Auto-selecting clinic for Admin:', clinics[0].id);
            this.context.selectedClinic.set(clinics[0].id);
          }
        }, 500);
      }
    }
  }

  checkPermission(permission: string, resource: string = '*'): boolean {
    const user = this.currentUser();
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true; 
    
    const bindings = user.iam || [];
    const targetResource = resource === '*' ? (this.context.selectedClinic() || 'global') : resource;
    
    for (const binding of bindings) {
      if (binding.resource === '*' || binding.resource === targetResource) {
        const role = IAM_ROLES[binding.roleId];
        if (role && (role.permissions.includes('*') || role.permissions.includes(permission))) {
          return true;
        }
      }
    }
    return false;
  }

  async logout() {
    await this.supabaseService.supabase.auth.signOut();
    this.router.navigate(['/login']);
  }
}
