import { BaseLLMAdapter } from './base';

export class DeepSeekAdapter extends BaseLLMAdapter {
  constructor(apiKey: string, model: string = 'deepseek-chat') {
    super({
      model,
      type: 'deepseek',
      apiKey
    });
  }

  async call(prompt: string): Promise<string> {
    try {
      // Use proxy server to avoid CORS issues
      const proxyUrl = 'http://localhost:3001/api/deepseek';
      
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
        throw new Error(error.error?.message || 'DeepSeek API error');
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('DeepSeek adapter error:', error);
      throw error;
    }
  }
} 