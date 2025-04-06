import { BaseLLMAdapter } from './base';

export class GoogleAdapter extends BaseLLMAdapter {
  private apiKey: string;
  private model: string;
  private apiPath?: string;

  constructor(apiKey: string, model: string = 'gemini-pro', apiPath?: string) {
    super('google', 'Google Gemini Pro', 'Google');
    this.apiKey = apiKey;
    this.model = model;
    this.apiPath = apiPath;
  }

  async call(prompt: string): Promise<string> {
    try {
      // Use proxy server to avoid CORS issues
      const proxyUrl = 'http://localhost:3001/api/google';
      
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: this.apiKey,
          prompt,
          model: this.model,
          apiPath: this.apiPath
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Google API error');
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('Google adapter error:', error);
      throw error;
    }
  }
} 