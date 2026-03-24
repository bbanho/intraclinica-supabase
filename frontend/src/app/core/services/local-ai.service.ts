import { Injectable, signal } from '@angular/core';
import { MedicalRecordContent } from './clinical.service';

/**
 * Local AI Service using WebLLM for GPU-accelerated inference.
 * Uses dynamic imports to avoid loading WebGPU/TF at module initialization.
 */
@Injectable({ providedIn: 'root' })
export class LocalAiService {
  private _model = signal<unknown | null>(null);
  private _isInitialized = signal(false);
  private _isLoading = signal(false);
  private _error = signal<string | null>(null);

  readonly isInitialized = this._isInitialized.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  get canUse(): boolean {
    // Check for WebGPU support
    return typeof navigator !== 'undefined' && 'gpu' in navigator;
  }

  async initializeModel(modelId = 'Llama-3.2-3B-Instruct-q4f16_1-MLC'): Promise<void> {
    if (!this.canUse) {
      this._error.set('WebGPU não disponível neste navegador');
      return;
    }

    if (this._isInitialized()) {
      return;
    }

    this._isLoading.set(true);
    this._error.set(null);

    try {
      // Dynamic imports — MUST NOT be static at module level
      const [{ importTensorFlow }, { CreateChatCompletionEngine }] = await Promise.all([
        import('@tensorflow/tfjs'),
        import('@mlc-ai/web-llm')
      ]);

      // Initialize TensorFlow
      const tf = await importTensorFlow();
      await tf.ready();

      // Load WebLLM model
      const model = await CreateChatCompletionEngine(modelId);
      this._model.set(model);
      this._isInitialized.set(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao inicializar modelo local';
      this._error.set(msg);
      console.error('[LocalAiService] Init error:', err);
    } finally {
      this._isLoading.set(false);
    }
  }

  async suggestDiagnosis(patientHistory: MedicalRecordContent[]): Promise<string> {
    if (!this._isInitialized() || !this._model()) {
      throw new Error('Modelo não inicializado. Chame initializeModel() primeiro.');
    }

    const context = this.buildPrompt(patientHistory);

    try {
      // Dynamic import for web-llm completion
      const { CompleteWebLLM } = await import('@mlc-ai/web-llm');

      const model = this._model() as { do_completion: (opts: { prompt: string }) => Promise<{ choices: { message: { content: string } }[] }> };

      const reply = await model.do_completion({ prompt: context });
      return reply.choices[0]?.message?.content ?? '';
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro na inferência local';
      this._error.set(msg);
      throw err;
    }
  }

  private buildPrompt(history: MedicalRecordContent[]): string {
    const latest = history[0] ?? {
      chief_complaint: '',
      observations: '',
      diagnosis: '',
      prescriptions: ''
    };

    return `<system>Você é um assistente médico brasileiro. Analise o prontuário e sugira diagnósticos diferenciais, investigações e/ou tratamentos. Responda em português. Seja conciso e objetivo.</system>
<context>
Queixa principal: ${latest.chief_complaint || 'N/A'}
Observações: ${latest.observations || 'N/A'}
Diagnóstico atual: ${latest.diagnosis || 'N/A'}
Prescrições: ${latest.prescriptions || 'N/A'}
</context>
<task>
Com base no contexto acima, forneça:
1. Hipóteses diagnósticas (CID-10 se possível)
2. Exames complementares sugeridos
3. Conduta clínica recomendada
</task>
Responda SOMENTE com JSON válido neste formato exato (sem markdown, sem explicação):
{"hypotheses": ["string"], "exams": ["string"], "conduct": "string"}`;
  }

  dispose(): void {
    this._model.set(null);
    this._isInitialized.set(false);
    this._error.set(null);
  }
}
