import { Injectable, inject, signal, computed } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { ClinicContextService } from '../services/clinic-context.service';
import { SupabaseService } from '../services/supabase.service';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private authService = inject(AuthService);
  private supabase = inject(SupabaseService).clientInstance;
  private clinicContext = inject(ClinicContextService);

  // Signals
  public readonly user = this.authService.currentUser.asReadonly();
  public readonly session = this.authService.currentSession.asReadonly();
  public readonly isAuthenticated = computed(() => !!this.user());
  
  public isLoading = signal<boolean>(false);
  public error = signal<string | null>(null);

  async login(email: string, pass: string) {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const data = await this.authService.signInWithEmail(email, pass);
      
      if (data?.user) {
        const { data: userData, error } = await this.supabase
          .from('app_user')
          .select('iam_bindings')
          .eq('id', data.user.id)
          .single();
          
        if (!error && userData?.iam_bindings) {
          const bindings = userData.iam_bindings as Record<string, any>;
          const clinicIds = Object.keys(bindings).filter(k => k !== 'global');
          
          if (bindings['global']) {
            this.clinicContext.setContext('all');
          } else if (clinicIds.length > 0) {
            this.clinicContext.setContext(clinicIds[0]);
          } else {
            this.clinicContext.setContext(null);
          }
        } else {
          this.clinicContext.setContext(null);
        }
      }
    } catch (e: any) {
      this.error.set(e.message || 'Invalid login credentials');
      throw e;
    } finally {
      this.isLoading.set(false);
    }
  }

  async logout() {
    this.isLoading.set(true);
    try {
      await this.authService.signOut();
      this.clinicContext.setContext(null);
    } finally {
      this.isLoading.set(false);
    }
  }
}
