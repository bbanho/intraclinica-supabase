import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthStateService } from './auth-state.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private supabase = inject(SupabaseService);
  private authState = inject(AuthStateService);

  constructor() {
    // Session init is handled by AuthStateService constructor automatically.
  }

  async login(email: string, password: string): Promise<boolean> {
    const { error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) console.error('Login failed:', error.message);
    return !error;
  }

  async logout() {
    await this.authState.logout();
  }
}
