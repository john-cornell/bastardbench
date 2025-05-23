import { BaseLLMAdapter } from './base';

export class OllamaAdapter extends BaseLLMAdapter {
  constructor(baseUrl: string = 'http://localhost:11434', model: string = 'llama2') {
    super({
      model,
      type: 'ollama',
      endpoint: baseUrl
    });
  }

  async call(prompt: string): Promise<string> {
    try {
      const response = await fetch(`${this.endpoint}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.getModel(),
          prompt,
          stream: false
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ollama API error');
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('Ollama adapter error:', error);
      throw error;
    }
  }
} 