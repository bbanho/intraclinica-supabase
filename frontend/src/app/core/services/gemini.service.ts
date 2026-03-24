import { Injectable, inject, signal } from '@angular/core';
import { MedicalRecordContent } from './clinical.service';
import { environment } from '../../../environments/environment';

export interface AiSuggestion {
  hypotheses: string[];
  exams: string[];
  conduct: string;
  raw: string;
}

@Injectable({ providedIn: 'root' })
export class GeminiService {
  private _isLoading = signal(false);
  private _error = signal<string | null>(null);

  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  private readonly apiKey = environment.geminiApiKey;

  async analyzeClinicalRecord(record: MedicalRecordContent): Promise<AiSuggestion> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const prompt = this.buildPrompt(record);
      const response = await this.callGemini(prompt);
      return this.parseResponse(response);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao analisar com Gemini';
      this._error.set(msg);
      throw err;
    } finally {
      this._isLoading.set(false);
    }
  }

  private buildPrompt(record: MedicalRecordContent): string {
    return `Você é um assistente médico brasileiro com formação em clínica geral.

Analise o seguinte prontuário e forneça sugestões clínica.

**Prontuário:**
- Queixa principal: ${record.chief_complaint || 'N/A'}
- Observações: ${record.observations || 'N/A'}
- Diagnóstico atual: ${record.diagnosis || 'N/A'}
- Prescrições atuais: ${record.prescriptions || 'N/A'}

**Formato de resposta (obrigatório):**
Responda EXATAMENTE neste formato, sem texto adicional fora dele:

===HIPOTESES===
1. [Hipótese 1 - CID-10 se possível]
2. [Hipótese 2 - CID-10 se possível]
===
===EXAMES===
1. [Exame sugerido 1]
2. [Exame sugerido 2]
===
===CONDUTA===
[Conduta clínica recomendada em 2-3 frases]`;
  }

  private async callGemini(prompt: string): Promise<string> {
    const apiKey = this.apiKey;
    if (!apiKey) {
      throw new Error('Chave Gemini não configurada (INTRA_GEMINI_API_KEY)');
    }

    const [{ GoogleGenerativeAI }] = await Promise.all([
      import('@google/generative-ai')
    ]);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });

    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text();
  }

  private parseResponse(raw: string): AiSuggestion {
    const hypotheses: string[] = [];
    const exams: string[] = [];
    let conduct = '';

    const hipoteseMatch = raw.match(/===HIPOTESES===([\s\S]*?)===EXAMES===/);
    if (hipoteseMatch) {
      const lines = hipoteseMatch[1].split('\n').filter(l => l.trim() && /^\d+\./.test(l.trim()));
      for (const line of lines) {
        hypotheses.push(line.replace(/^\d+\.\s*/, '').trim());
      }
    }

    const examesMatch = raw.match(/===EXAMES===([\s\S]*?)===CONDUTA===/);
    if (examesMatch) {
      const lines = examesMatch[1].split('\n').filter(l => l.trim() && /^\d+\./.test(l.trim()));
      for (const line of lines) {
        exams.push(line.replace(/^\d+\.\s*/, '').trim());
      }
    }

    const condutaMatch = raw.match(/===CONDUTA===([\s\S]*?)$/);
    if (condutaMatch) {
      conduct = condutaMatch[1].trim();
    }

    return { hypotheses, exams, conduct, raw };
  }
}
