import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { DatabaseService } from './database.service';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private supabase = inject(SupabaseService);
  private dbService = inject(DatabaseService);
  private router = inject(Router);

  constructor() {
    this.supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await this.dbService.loadUserProfile(session.user.id);
      } else {
        this.dbService.currentUser.set(null);
        this.dbService.selectedContextClinic.set(null);
      }
    });
  }

  async login(email: string, password: string): Promise<boolean> {
    const { error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) console.error('Login failed:', error.message);
    return !error;
  }

  async logout() {
    await this.supabase.auth.signOut();
    this.router.navigate(['/login']);
  }
}