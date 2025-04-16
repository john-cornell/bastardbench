import { BaseLLMAdapter } from './base';

export class OpenAIAdapter extends BaseLLMAdapter {
  private apiKey: string;

  constructor(apiKey: string, model: string = 'gpt-4-turbo-preview') {
    super(model, 'openai');
    this.apiKey = apiKey;
  }

  async call(prompt: string): Promise<string> {
    try {
      // Use proxy server to avoid CORS issues
      const proxyUrl = 'http://localhost:3001/api/openai';
      
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
        throw new Error(error.error?.message || 'OpenAI API error');
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('OpenAI adapter error:', error);
      throw error;
    }
  }

  getModel(): string {
    return this.model;
  }

  getType(): string {
    return 'openai';
  }
} 