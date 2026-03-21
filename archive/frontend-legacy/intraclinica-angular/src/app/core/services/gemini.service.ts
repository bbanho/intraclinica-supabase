import { Injectable } from '@angular/core';
import { GoogleGenAI, GenerateContentResponse, Part } from "@google/genai";
import { Product } from '../models/types';

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    const apiKey = (typeof process !== 'undefined' && process.env) ? process.env['API_KEY'] : '';
    this.ai = new GoogleGenAI({ apiKey: apiKey || '' });
  }

  connectLive(config: any): Promise<any> {
    return this.ai.live.connect(config);
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

  async analyzeInventoryRisks(products: Product[]): Promise<string> {
    const prompt = `
      Analyze this inventory data and identify 3 critical risks (e.g., low stock, overstock, expiration).
      Format as Markdown bullet points.
      Inventory: ${JSON.stringify(products.slice(0, 20))}
    `;

    try {
      const response: GenerateContentResponse = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });
      return response.text;
    } catch (error) {
      console.error('Gemini Analysis Failed', error);
      return 'Unable to analyze inventory risks at this time.';
    }
  }

  async generateStrategicInsights(context: string): Promise<string> {
    const prompt = `
      Act as a clinical management consultant. Analyze the provided data and generate 3 short, actionable strategic insights.
      Focus on:
      1. Schedule optimization to reduce queues.
      2. Cost saving opportunities.
      3. Stock audit corrective actions.
      Use Markdown. Be direct.
      
      Data Context: ${context}
    `;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });
      return response.text;
    } catch (error) {
       return 'Error generating insights.';
    }
  }

  async generateSocialContent(topic: string, tone: string): Promise<any> {
    const prompt = `Create a promotional social media post for our clinic about: ${topic}. Tone: ${tone}. 
    Return JSON with fields: 'caption' (string), 'hashtags' (array of strings), 'imageUrl' (leave null for now).`;
    
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });
      return JSON.parse(response.text);
    } catch (error) {
      return null;
    }
  }

  async processClinicalAudio(audioData: string): Promise<string> {
    const audioPart: Part = {
      inlineData: {
        mimeType: 'audio/wav', 
        data: audioData
      }
    };
    
    const prompt = `
      You are a medical scribe. Listen to this clinical consultation snippet.
      Extract the following key information in Markdown:
      - **Symptoms**: List symptoms mentioned.
      - **Vitals**: Any numbers mentioned (BP, Temp).
      - **Action Plan**: Next steps.
    `;

    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [audioPart, { text: prompt }]
      }
    });

    return response.text;
  }
}
