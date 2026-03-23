import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IamService } from '../../core/services/iam.service';
import { ClinicContextService } from '../../core/services/clinic-context.service';
import { SocialStore } from '../../core/store/social.store';

@Component({
  selector: 'app-social',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (!iam.can('marketing.read') || clinicId() === 'all' || !clinicId()) {
      <div class="p-8 text-center text-gray-500">
        <h2 class="text-xl font-bold mb-2">Acesso Restrito</h2>
        <p>Você não tem permissão para acessar o Marketing Social ou não selecionou uma clínica específica.</p>
      </div>
    } @else {
      <div class="p-6 max-w-7xl mx-auto h-full grid grid-cols-1 md:grid-cols-3 gap-8">
        <!-- Esquerda: Formulário -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-full">
          <h2 class="text-2xl font-semibold mb-6 text-gray-800">Gerador de Posts para Instagram</h2>
          
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Tópico do Post</label>
            <input 
              type="text" 
              [(ngModel)]="topic"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ex: Benefícios da limpeza dental"
            >
          </div>
          
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-1">Tom de Voz</label>
            <select 
              [(ngModel)]="tone"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="profissional">Profissional e Técnico</option>
              <option value="amigavel">Amigável e Acessível</option>
              <option value="divertido">Divertido e Engajador</option>
              <option value="urgente">Urgente (Atenção à Saúde)</option>
            </select>
          </div>
          
          <button 
            (click)="generatePost()"
            [disabled]="!topic || socialStore.isGenerating()"
            class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
          >
            @if (socialStore.isGenerating()) {
              <span class="mr-2">Gerando com IA...</span>
            } @else {
              <span>Gerar Conteúdo</span>
            }
          </button>
        </div>

        <!-- Direita: Mockup do Instagram -->
        <div class="md:col-span-2 bg-gray-50 rounded-xl flex items-center justify-center p-8 border border-gray-200">
        
          @if (socialStore.generatedContent(); as content) {
            <div class="bg-white max-w-sm w-full rounded-lg shadow-md overflow-hidden border border-gray-200">
              <!-- Header Instagram -->
              <div class="flex items-center p-3 border-b border-gray-100">
                <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 to-purple-500 p-[2px]">
                  <div class="w-full h-full bg-white rounded-full border border-white"></div>
                </div>
                <div class="ml-3 font-semibold text-sm">sua.clinica</div>
              </div>
              
              <!-- Imagem placeholder / Sugestão visual -->
              <div class="aspect-square bg-gray-100 flex flex-col items-center justify-center p-6 text-center border-b border-gray-100">
                <span class="text-gray-400 text-sm mb-2">Sugestão de Imagem:</span>
                <p class="text-gray-600 font-medium text-sm">{{ content.imagePrompt || 'Gere uma imagem relacionada ao tópico' }}</p>
              </div>
              
              <!-- Ações (Corações, Comentários) -->
              <div class="p-3 flex gap-4">
                <div class="w-6 h-6 rounded-full border-2 border-gray-800"></div>
                <div class="w-6 h-6 rounded-full border-2 border-gray-800"></div>
                <div class="w-6 h-6 rounded-full border-2 border-gray-800"></div>
              </div>
              
              <!-- Legenda -->
              <div class="px-3 pb-4">
                <p class="text-sm">
                  <span class="font-semibold mr-2">sua.clinica</span>
                  {{ content.caption || content.text }}
                </p>
                <div class="mt-2 flex flex-wrap gap-1">
                  @for (tag of content.hashtags; track tag) {
                    <span class="text-blue-600 text-xs">{{ tag }}</span>
                  }
                </div>
              </div>
            </div>
          } @else {
            <div class="text-center text-gray-400 flex flex-col items-center">
              <div class="w-16 h-16 mb-4 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center">
                <span class="text-2xl">+</span>
              </div>
              <p>O mockup do seu post aparecerá aqui</p>
            </div>
          }
        </div>
      </div>
    }
  `
})
export class SocialComponent {
  iam = inject(IamService);
  context = inject(ClinicContextService);
  socialStore = inject(SocialStore);

  clinicId = this.context.selectedClinicId;

  topic = '';
  tone = 'profissional';

  generatePost() {
    this.socialStore.generatePost(this.topic, this.tone);
  }
}
