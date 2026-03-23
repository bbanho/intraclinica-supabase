import { Injectable, inject, signal } from '@angular/core';
import { User, Session } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private supabase = inject(SupabaseService).clientInstance;

  // Signal state management
  public currentUser = signal<User | null>(null);
  public currentSession = signal<Session | null>(null);

  constructor() {
    this.supabase.auth.getSession().then(({ data: { session } }) => {
      this.currentSession.set(session);
      this.currentUser.set(session?.user || null);
    });

    this.supabase.auth.onAuthStateChange((_event, session) => {
      this.currentSession.set(session);
      this.currentUser.set(session?.user || null);
    });
  }

  get supabaseClient() {
    return this.supabase;
  }

  async signInWithEmail(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;
  }
}