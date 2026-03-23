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
  
  private readonly _isLoading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  async login(email: string, pass: string) {
    this._isLoading.set(true);
    this._error.set(null);
    try {
      const data = await this.authService.signInWithEmail(email, pass);
      
      if (data?.user) {
        const { data: userData, error: iamError } = await this.supabase
          .from('app_user')
          .select('iam_bindings')
          .eq('id', data.user.id)
          .single();
          
        if (!iamError && userData?.iam_bindings) {
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
      this._error.set(e.message || 'Invalid login credentials');
      throw e;
    } finally {
      this._isLoading.set(false);
    }
  }

  async logout() {
    this._isLoading.set(true);
    try {
      await this.authService.signOut();
      this.clinicContext.setContext(null);
    } finally {
      this._isLoading.set(false);
    }
  }
}
