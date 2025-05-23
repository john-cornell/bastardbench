import { BaseLLMAdapter } from './base';

export class AnthropicAdapter extends BaseLLMAdapter {
  constructor(apiKey: string, model: string = 'claude-3-opus-20240229') {
    super({
      model,
      type: 'anthropic',
      apiKey
    });
  }

  async call(prompt: string): Promise<string> {
    try {
      // Use proxy server to avoid CORS issues
      const proxyUrl = 'http://localhost:3001/api/anthropic';
      
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
        throw new Error(error.error?.message || 'Anthropic API error');
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('Anthropic adapter error:', error);
      throw error;
    }
  }
} 