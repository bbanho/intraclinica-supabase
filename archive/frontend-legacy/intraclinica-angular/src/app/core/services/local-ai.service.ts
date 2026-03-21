import { Injectable, signal } from '@angular/core';
import * as webllm from '@mlc-ai/web-llm';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgpu';

export interface LocalModel {
  id: string;
  name: string;
  description: string;
  requirement: 'low' | 'medium' | 'high';
}

@Injectable({
  providedIn: 'root'
})
export class LocalAiService {
  private engine: webllm.MLCEngine | null = null;
  
  status = signal<string>('Pronto');
  progress = signal<number>(0);
  isLoaded = signal<boolean>(false);
  hasWebGPU = signal<boolean>(false);

  constructor() {
    this.checkWebGPUSupport();
  }

  async checkWebGPUSupport() {
    try {
      // Primary check: Standard WebGPU API
      if (typeof navigator !== 'undefined' && (navigator as any).gpu) {
        console.log('WebGPU support confirmed via navigator.gpu');
        this.hasWebGPU.set(true);
        return;
      }

      // Fallback: Use TensorFlow.js to probe
      const supported = await tf.setBackend('webgpu');
      if (supported) {
        console.log('WebGPU support confirmed via Tensor.js');
        this.hasWebGPU.set(true);
      } else {
        console.warn('WebGPU not supported, falling back to CPU/WebGL');
        this.hasWebGPU.set(false);
      }
    } catch (err) {
      console.error('Error checking WebGPU support:', err);
      this.hasWebGPU.set(false);
    }
  }

  availableModels: LocalModel[] = [
    { 
      id: 'Gemma-2b-it-q4f16_1-MLC', 
      name: 'Processamento Rápido', 
      description: 'Ideal para dispositivos móveis ou computadores básicos.', 
      requirement: 'low' 
    },
    { 
      id: 'Llama-3-8B-Instruct-q4f16_1-MLC', 
      name: 'Processamento Avançado', 
      description: 'Maior precisão clínica. Requer hardware dedicado.', 
      requirement: 'high' 
    },
    { 
      id: 'Phi-3-mini-4k-instruct-q4f16_1-MLC', 
      name: 'Processamento Balanceado', 
      description: 'Equilíbrio entre velocidade e qualidade de análise.', 
      requirement: 'medium' 
    }
  ];

  async loadModel(modelId: string) {
    if (!this.hasWebGPU()) {
      this.status.set('Erro: WebGPU não detectado neste navegador.');
      return;
    }

    this.isLoaded.set(false);
    this.status.set('Inicializando motor IA local...');
    
    try {
      this.engine = await webllm.CreateMLCEngine(modelId, {
        initProgressCallback: (report) => {
          this.status.set(`Carregando recursos de IA... (${Math.round(report.progress * 100)}%)`);
          this.progress.set(Math.round(report.progress * 100));
        }
      });
      this.isLoaded.set(true);
      this.status.set('Modelo carregado com sucesso!');
    } catch (err) {
      this.status.set('Erro ao carregar modelo local. Verifique a memória.');
      console.error(err);
    }
  }

  async unloadModel() {
    if (this.engine) {
      await this.engine.unload();
      this.engine = null;
      this.isLoaded.set(false);
      this.status.set('Motor IA descarregado.');
      this.progress.set(0);
    }
  }

  async generate(prompt: string): Promise<string> {
    if (!this.engine) return 'Motor não inicializado.';
    
    this.status.set('Processando localmente...');
    const messages: webllm.ChatCompletionMessageParam[] = [
      { role: 'system', content: 'Você é um assistente médico. Formate o texto a seguir como uma evolução clínica clara e profissional.' },
      { role: 'user', content: prompt }
    ];

    const reply = await this.engine.chat.completions.create({
      messages,
      temperature: 0.7,
    });

    this.status.set('Concluído');
    return reply.choices[0].message.content || '';
  }
}
