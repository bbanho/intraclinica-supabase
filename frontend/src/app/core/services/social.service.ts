import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { ClinicContextService } from './clinic-context.service';
import { GeminiService, SocialContent } from './gemini.service';

export interface SocialPost extends SocialContent {
  id?: string;
  topic: string;
  tone: string;
  clinicId: string;
  timestamp?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SocialService {
  private supabase = inject(SupabaseService).clientInstance;
  private context = inject(ClinicContextService);
  private gemini = inject(GeminiService);

  public socialPosts = signal<SocialPost[]>([]);

  async generateSocialContent(topic: string, tone: string): Promise<SocialContent> {
    return this.gemini.generateSocialContent(topic, tone);
  }

  async addSocialPost(post: Omit<SocialPost, 'clinicId'>): Promise<void> {
    const clinicId = this.context.selectedClinicId();

    if (!clinicId || clinicId === 'all') {
      throw new Error('Operação rejeitada: Selecione uma clínica específica para salvar o post.');
    }

    const fullPost: SocialPost = {
      ...post,
      clinicId: clinicId,
      timestamp: new Date().toISOString()
    };

    const { error } = await this.supabase
      .from('social_posts')
      .insert(fullPost);

    if (error) {
      console.error('Error saving social post:', error);
      throw error;
    }

    this.socialPosts.update(posts => [fullPost, ...posts]);
  }

  async fetchPosts(): Promise<void> {
    const clinicId = this.context.selectedClinicId();
    if (!clinicId || clinicId === 'all') {
      this.socialPosts.set([]);
      return;
    }

    const { data, error } = await this.supabase
      .from('social_posts')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching social posts:', error);
      return;
    }

    this.socialPosts.set(data || []);
  }
}
