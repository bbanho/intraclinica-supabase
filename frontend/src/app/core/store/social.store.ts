import { Injectable, inject, signal, computed } from '@angular/core';
import { SocialService, SocialPost } from '../services/social.service';

@Injectable({
  providedIn: 'root'
})
export class SocialStore {
  private socialService = inject(SocialService);

  readonly posts = computed(() => this.socialService.socialPosts());
  readonly isGenerating = signal(false);
  readonly generatedContent = signal<SocialPost | null>(null);

  async generatePost(topic: string, tone: string) {
    this.isGenerating.set(true);
    try {
      const content = await this.socialService.generateSocialContent(topic, tone);
      this.generatedContent.set({ topic, tone, ...content } as SocialPost);
    } catch (e) {
      console.error(e);
    } finally {
      this.isGenerating.set(false);
    }
  }

  async savePost(post: Omit<SocialPost, 'clinicId'>) {
    await this.socialService.addSocialPost(post);
    this.generatedContent.set(null);
  }
}
