import { Injectable, inject, signal, computed } from '@angular/core';
import { LocalAiService } from '../services/local-ai.service';
import { GeminiService, AiSuggestion } from '../services/gemini.service';
import { MedicalRecordContent } from '../services/clinical.service';

export type AiState = 'idle' | 'loading' | 'suggesting' | 'error';

@Injectable({ providedIn: 'root' })
export class ClinicalAiStore {
  private localAi = inject(LocalAiService);
  private gemini = inject(GeminiService);

  private readonly _aiState = signal<AiState>('idle');
  private readonly _error = signal<string | null>(null);
  private readonly _lastSuggestion = signal<AiSuggestion | null>(null);

  readonly aiState = this._aiState.asReadonly();
  readonly error = this._error.asReadonly();
  readonly lastSuggestion = this._lastSuggestion.asReadonly();

  readonly isLoading = computed(() => this._aiState() === 'loading' || this._aiState() === 'suggesting');
  readonly hasSuggestion = computed(() => this._lastSuggestion() !== null);

  get localInitialized(): boolean {
    return this.localAi.isInitialized();
  }

  async initializeLocal(): Promise<void> {
    if (!this.localAi.canUse) {
      this._error.set('WebGPU não disponível — usando Gemini como fallback');
      return;
    }
    await this.localAi.initializeModel();
  }

  async suggest(record: MedicalRecordContent): Promise<AiSuggestion | null> {
    this._aiState.set('loading');
    this._error.set(null);

    try {
      this._aiState.set('suggesting');

      if (this.localAi.canUse && !this.localAi.isInitialized()) {
        await this.initializeLocal();
      }

      if (this.localAi.isInitialized()) {
        try {
          const history = [record];
          const localResult = await this.localAi.suggestDiagnosis(history);
          const suggestion = this.parseLocalResult(localResult);
          this._lastSuggestion.set(suggestion);
          this._aiState.set('idle');
          return suggestion;
        } catch (localErr) {
          console.warn('[ClinicalAiStore] Local AI failed, falling back to Gemini:', localErr);
        }
      }

      const geminiResult = await this.gemini.analyzeClinicalRecord(record);
      this._lastSuggestion.set(geminiResult);
      this._aiState.set('idle');
      return geminiResult;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido na análise IA';
      this._error.set(msg);
      this._aiState.set('error');
      return null;
    }
  }

  private parseLocalResult(raw: string): AiSuggestion {
    const lines = raw.split('\n').filter(l => l.trim());
    const hypotheses: string[] = [];
    const exams: string[] = [];
    let conduct = '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('-') || /^\d+\)/.test(trimmed)) {
        const text = trimmed.replace(/^-\s*/, '').replace(/^\d+\)\s*/, '');
        if (text.toLowerCase().includes('exame') || text.toLowerCase().includes('exames')) {
          exams.push(text);
        } else {
          hypotheses.push(text);
        }
      } else if (hypotheses.length > 0 || exams.length > 0) {
        conduct += trimmed + ' ';
      }
    }

    return {
      hypotheses,
      exams,
      conduct: conduct.trim(),
      raw
    };
  }

  clearSuggestion(): void {
    this._lastSuggestion.set(null);
    this._error.set(null);
    this._aiState.set('idle');
  }
}
