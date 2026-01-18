import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  public supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );
  }

  get auth() {
    return this.supabase.auth;
  }

  get client() {
    return this.supabase;
  }
  
  // Atalho tipado se gerarmos tipos futuramente
  from(table: string) {
    return this.supabase.from(table);
  }
}
