import { Injectable, signal, inject } from '@angular/core';
import { SupabaseService } from '../services/supabase.service';
import { ClinicContextService } from '../services/clinic-context.service';
import { SocialPost } from '../services/social.service';

@Injectable({
  providedIn: 'root'
})
export class SocialStore {
  private supabase = inject(SupabaseService).clientInstance;
  private clinicContext = inject(ClinicContextService);

  private _posts = signal<SocialPost[]>([]);
  private _isLoading = signal<boolean>(false);
  private _error = signal<string | null>(null);

  readonly posts = this._posts.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  private requireClinicId(): string {
    const clinicId = this.clinicContext.selectedClinicId();
    if (!clinicId || clinicId === 'all') {
      throw new Error('Operação rejeitada: Selecione uma clínica específica.');
    }
    return clinicId;
  }

  async loadPosts(): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const clinicId = this.requireClinicId();

      const { data, error } = await this.supabase
        .from('social_posts')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('timestamp', { ascending: false });

      if (error) throw error;

      this._posts.set(data as SocialPost[]);
    } catch (e: any) {
      this._error.set(e.message || 'Erro ao carregar posts sociais');
      this._posts.set([]);
    } finally {
      this._isLoading.set(false);
    }
  }

  async addPost(post: Omit<SocialPost, 'clinicId'>): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const clinicId = this.requireClinicId();
      
      const fullPost: SocialPost = {
        ...post,
        clinicId: clinicId,
        timestamp: new Date().toISOString()
      };

      const { error } = await this.supabase
        .from('social_posts')
        .insert(fullPost);

      if (error) throw error;

      this._posts.update(posts => [fullPost, ...posts]);
    } catch (e: any) {
      this._error.set(e.message || 'Erro ao salvar post social');
      throw e;
    } finally {
      this._isLoading.set(false);
    }
  }
}
