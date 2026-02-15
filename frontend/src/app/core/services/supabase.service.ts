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
  
  // Atalho tipado se gerarmos tipos futuramente
  from(table: string) {
    return this.supabase.from(table);
  }

  rpc(fn: string, args?: any) {
    return this.supabase.rpc(fn, args);
  }
}
