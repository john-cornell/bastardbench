import { BaseLLMAdapter } from './base';

export class MistralAdapter extends BaseLLMAdapter {
  constructor(apiKey: string, model: string = 'mistral-medium') {
    super({
      model,
      type: 'mistral',
      apiKey
    });
  }

  async call(prompt: string): Promise<string> {
    try {
      // Use proxy server to avoid CORS issues
      const proxyUrl = 'http://localhost:3001/api/mistral';
      
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
        throw new Error(error.error?.message || 'Mistral API error');
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('Mistral adapter error:', error);
      throw error;
    }
  }
} 