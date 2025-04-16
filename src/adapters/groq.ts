import { BaseLLMAdapter } from './base';

export class GroqAdapter extends BaseLLMAdapter {
  constructor(apiKey: string, model: string = 'mixtral-8x7b-32768') {
    super({
      model,
      type: 'groq',
      apiKey
    });
  }

  async call(prompt: string): Promise<string> {
    try {
      // Use proxy server to avoid CORS issues
      const proxyUrl = 'http://localhost:3001/api/groq';
      
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
        throw new Error(error.error?.message || 'Groq API error');
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('Groq adapter error:', error);
      throw error;
    }
  }
} 