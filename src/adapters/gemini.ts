import { BaseLLMAdapter } from './base';

export class GeminiAdapter extends BaseLLMAdapter {
  private apiKey: string;

  constructor(apiKey: string, model: string = 'gemini-pro') {
    super(model, 'gemini');
    this.apiKey = apiKey;
  }

  async call(prompt: string): Promise<string> {
    try {
      // Use proxy server to avoid CORS issues
      const proxyUrl = 'http://localhost:3001/api/gemini';
      
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: this.apiKey,
          prompt,
          model: this.getModel()
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Gemini API error');
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('Gemini adapter error:', error);
      throw error;
    }
  }
} 