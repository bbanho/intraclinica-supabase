import { Injectable, signal } from '@angular/core';
import { GoogleGenAI } from "@google/genai";

export interface SocialContent {
  caption: string;
  hashtags: string[];
}

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private ai: GoogleGenAI;
  private readonly apiKey = ''; 

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: this.apiKey });
  }

  async generateSocialContent(topic: string, tone: string): Promise<SocialContent> {
    const prompt = `Create a promotional social media post for our clinic about: ${topic}. Tone: ${tone}. 
    Return JSON with fields: 'caption' (string), 'hashtags' (array of strings). Do not include any other text.`;
    
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });

      const data = JSON.parse(response.text);
      return {
        caption: data.caption || '',
        hashtags: Array.isArray(data.hashtags) ? data.hashtags : []
      };
    } catch (error) {
      console.error('Gemini Social Generation Failed', error);
      throw new Error('Erro ao gerar conteúdo com Gemini.');
    }
  }

  async generateContent(prompt: string, systemInstruction?: string): Promise<string> {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
        config: {
            systemInstruction: systemInstruction || "Você é um assistente médico prestativo."
        }
      });
      return response.text;
    } catch (error) {
      console.error('Gemini Generation Failed', error);
      return 'Erro ao processar com IA na nuvem.';
    }
  }
}
