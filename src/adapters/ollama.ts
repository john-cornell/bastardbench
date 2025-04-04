import { BaseLLMAdapter } from './base';

export class OllamaAdapter extends BaseLLMAdapter {
  private endpoint: string;
  private model: string;

  constructor(endpoint: string, model: string = 'llama2') {
    super('ollama', 'Ollama Llama2', 'Ollama');
    this.endpoint = endpoint;
    this.model = model;
  }

  async call(prompt: string): Promise<string> {
    try {
      const response = await fetch(`${this.endpoint}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Ollama API error');
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('Ollama adapter error:', error);
      throw error;
    }
  }
} 