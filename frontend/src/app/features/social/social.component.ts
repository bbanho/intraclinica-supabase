import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeminiService } from '../../core/services/gemini.service';
import { DatabaseService } from '../../core/services/database.service';
import { LucideAngularModule, Share2, Send, Instagram, Copy, Image as ImageIcon, Sparkles, Clock, History, ShieldAlert } from 'lucide-angular';
import { IAM_PERMISSIONS } from '../../core/config/iam-roles';

import { SOCIAL_TONES, SocialToneValue } from '../../core/config/domain-constants';

@Component({
  selector: 'app-social',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="max-w-6xl mx-auto space-y-6 p-6 animate-fade-in">
      @if (!db.checkPermission(IAM_PERMISSIONS.MARKETING_READ, db.selectedContextClinic() || db.currentUser()?.clinicId)) {
        <div class="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-white rounded-[40px] border border-slate-200 shadow-sm animate-scale-in">
            <div class="p-6 bg-rose-50 text-rose-600 rounded-3xl mb-6">
                <lucide-icon [img]="ShieldAlert" [size]="48"></lucide-icon>
            </div>
            <h2 class="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">Acesso Restrito</h2>
            <p class="text-slate-500 max-w-md mx-auto mb-8 font-medium">Você não possui permissão para acessar as ferramentas de marketing desta unidade.</p>
        </div>
      } @else {
        <div class="flex items-center gap-3 mb-6">
        <div class="p-3 bg-pink-100 text-pink-600 rounded-xl">
          <lucide-icon [img]="Share2" [size]="24"></lucide-icon>
        </div>
        <div>
          <h2 class="text-2xl font-black text-slate-800 uppercase tracking-tight">Marketing & Redes Sociais</h2>
          <p class="text-slate-500 font-medium">Criação de conteúdo inteligente para o Instagram</p>
        </div>
      </div>

      <div class="grid lg:grid-cols-3 gap-8">
        <!-- Input Section -->
        <div class="lg:col-span-1 space-y-6">
            <div class="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                <h3 class="font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase text-xs tracking-widest">
                    <lucide-icon [img]="Sparkles" [size]="16" class="text-amber-500"></lucide-icon> Criar Novo Post
                </h3>
                
                <div class="space-y-4">
                    <div>
                    <label class="block text-[10px] font-black uppercase text-slate-400 mb-1 ml-1">Tópico ou Tema</label>
                    <textarea 
                        [(ngModel)]="topic"
                        class="w-full border border-slate-100 bg-slate-50 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-pink-500 h-32 resize-none font-medium text-slate-700"
                        placeholder="Ex: Botox preventivo, Dicas pós-operatório..."
                    ></textarea>
                    </div>

                    <div>
                    <label class="block text-[10px] font-black uppercase text-slate-400 mb-1 ml-1">Tom de Voz</label>
                    <select 
                        [(ngModel)]="tone"
                        class="w-full border border-slate-100 bg-slate-50 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-pink-500 appearance-none font-bold text-slate-700"
                    >
                        @for (t of SOCIAL_TONES; track t.value) {
                            <option [value]="t.value">{{t.label}}</option>
                        }
                    </select>
                    </div>

                    <button 
                    (click)="handleGenerate()"
                    [disabled]="isLoading() || !topic"
                    class="w-full bg-gradient-to-r from-pink-600 to-rose-600 text-white py-4 rounded-2xl font-bold uppercase text-xs tracking-widest hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-pink-100"
                    >
                    @if (isLoading()) {
                        <lucide-icon [img]="Sparkles" [size]="16" class="animate-spin"></lucide-icon>
                        <span>Gerando...</span>
                    } @else {
                        <span>Gerar Conteúdo</span>
                        <lucide-icon [img]="Send" [size]="16"></lucide-icon>
                    }
                    </button>
                </div>
            </div>

            <!-- Recent Posts History -->
            <div class="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                <h3 class="font-bold text-slate-400 mb-4 flex items-center gap-2 uppercase text-[10px] tracking-[0.2em]">
                    <lucide-icon [img]="History" [size]="14"></lucide-icon> Histórico de Criativos
                </h3>
                <div class="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                    @for (post of recentPosts(); track post.id) {
                        <button (click)="generatedPost.set(post)" class="w-full text-left p-3 rounded-xl border border-slate-50 hover:border-pink-200 hover:bg-pink-50/30 transition-all group">
                            <div class="text-[10px] font-black text-slate-400 mb-1 uppercase">{{post.timestamp | date:'short'}}</div>
                            <div class="text-sm font-bold text-slate-700 truncate group-hover:text-pink-700">{{post.caption}}</div>
                        </button>
                    } @empty {
                        <div class="text-center py-8 text-slate-300">
                            <p class="text-xs font-bold">Sem registros anteriores</p>
                        </div>
                    }
                </div>
            </div>
        </div>

        <!-- Preview Section -->
        <div class="lg:col-span-2 space-y-4">
            <div class="flex justify-between items-center">
                 <h3 class="font-black text-slate-800 flex items-center gap-2 uppercase text-xs tracking-widest">
                    <lucide-icon [img]="Instagram" [size]="18" class="text-pink-600"></lucide-icon> Pré-visualização do Feed
                </h3>
            </div>
         
          @if (generatedPost(); as post) {
            <div class="bg-white rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden animate-scale-in max-w-md mx-auto">
              <!-- Instagram Header -->
              <div class="p-4 flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 p-0.5">
                      <div class="w-full h-full rounded-full bg-white p-0.5">
                          <div class="w-full h-full rounded-full bg-slate-200 flex items-center justify-center text-slate-400 font-bold text-xs">SC</div>
                      </div>
                  </div>
                  <span class="font-bold text-sm text-slate-800">intraclinica.oficial</span>
              </div>

              <!-- Image Placeholder -->
              <div class="aspect-square bg-slate-100 relative group overflow-hidden flex flex-col items-center justify-center text-slate-400 gap-2 border-y border-slate-50">
                 <lucide-icon [img]="ImageIcon" [size]="64" class="opacity-20"></lucide-icon>
                 <span class="text-xs font-bold uppercase tracking-tighter opacity-40">Sugestão de Arte via IA</span>
              </div>
              
              <!-- Content -->
              <div class="p-6 space-y-4">
                <div class="flex gap-4">
                    <lucide-icon [img]="Share2" [size]="24" class="text-slate-800"></lucide-icon>
                    <lucide-icon [img]="Instagram" [size]="24" class="text-slate-800"></lucide-icon>
                </div>
                <p class="text-slate-800 text-sm whitespace-pre-wrap leading-relaxed">
                  <span class="font-black mr-1">intraclinica.oficial</span> {{ post.caption }}
                </p>
                <div class="flex flex-wrap gap-2 pt-2">
                  @for (tag of post.hashtags; track tag) {
                    <span class="text-xs text-indigo-600 font-bold">
                      #{{ tag.replace('#', '') }}
                    </span>
                  }
                </div>
                <div class="pt-6 border-t border-slate-50 flex justify-between text-slate-400 text-[10px] font-black uppercase items-center tracking-widest">
                    <span class="flex items-center gap-1"><lucide-icon [img]="Clock" [size]="10"></lucide-icon> {{post.timestamp | date:'short'}}</span>
                    <button (click)="copyToClipboard()" class="bg-slate-900 text-white px-4 py-2 rounded-full hover:bg-slate-800 transition-all flex items-center gap-2">
                        <lucide-icon [img]="Copy" [size]="12"></lucide-icon> Copiar Legenda
                    </button>
                </div>
              </div>
            </div>
          } @else {
            <div class="h-full bg-slate-50 border-4 border-dashed border-slate-200 rounded-[40px] flex items-center justify-center flex-col text-slate-300 p-12 text-center min-h-[500px]">
              <div class="w-20 h-20 rounded-3xl bg-white shadow-sm flex items-center justify-center mb-6">
                <lucide-icon [img]="Sparkles" [size]="40" class="text-slate-200"></lucide-icon>
              </div>
              <p class="font-black uppercase tracking-widest text-sm">Aguardando novo criativo</p>
              <p class="text-xs mt-2 font-medium">Preencha o tema ao lado para começar</p>
            </div>
          }
        </div>
      </div>
      }
    </div>
  `,
  styles: [
    "\n    .animate-fade-in { animation: fadeIn 0.5s ease-out; }\n    .animate-scale-in { animation: scaleIn 0.3s ease-out; }\n    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }\n    @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }\n    .custom-scrollbar::-webkit-scrollbar { width: 4px; }\n    .custom-scrollbar::-webkit-scrollbar-thumb { background: #fce7f3; border-radius: 10px; }\n  "]
})
export class SocialComponent {
  gemini = inject(GeminiService);
  db = inject(DatabaseService);

  IAM_PERMISSIONS = IAM_PERMISSIONS;

  // State
  topic = '';
  tone: SocialToneValue = 'friendly';
  SOCIAL_TONES = SOCIAL_TONES;
  generatedPost = signal<any>(null);
  isLoading = signal(false);

  // Computed History
  recentPosts = computed(() => {
    const clinicId = this.db.selectedContextClinic();
    if (!clinicId || clinicId === 'all') return [];
    return this.db.socialPosts().filter(p => p.clinicId === clinicId);
  });

  // Icons
  readonly Share2 = Share2; 
  readonly Send = Send; 
  readonly Instagram = Instagram; 
  readonly Copy = Copy; 
  readonly ImageIcon = ImageIcon; 
  readonly Sparkles = Sparkles;
  readonly Clock = Clock;
  readonly History = History;

  async handleGenerate() {
    if (!this.topic) return;
    
    const clinicId = this.db.selectedContextClinic();
    if (!clinicId || clinicId === 'all') {
      alert("Selecione uma clínica específica no menu lateral antes de gerar conteúdo.");
      return;
    }

    this.isLoading.set(true);
    try {
      const result = await this.gemini.generateSocialContent(this.topic, this.tone);
      
      const newPost = {
        ...result,
        topic: this.topic,
        tone: this.tone,
        clinicId: clinicId
      };

      await this.db.addSocialPost(newPost);
      this.generatedPost.set(newPost);
      this.topic = '';
    } catch (error) {
      alert("Erro ao gerar conteúdo.");
    } finally {
      this.isLoading.set(false);
    }
  }

  copyToClipboard() {
    const post = this.generatedPost();
    if (post) {
        const text = `${post.caption}\n\n${post.hashtags.map((t: string) => t.startsWith('#') ? t : '#'+t).join(' ')}`;
        navigator.clipboard.writeText(text);
        alert("Texto copiado para a área de transferência!");
    }
  }
}
