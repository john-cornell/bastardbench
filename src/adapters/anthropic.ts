import { BaseLLMAdapter } from './base';

export class AnthropicAdapter extends BaseLLMAdapter {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = 'claude-3-opus-20240229') {
    super('anthropic', 'Claude 3 Opus', 'Anthropic');
    this.apiKey = apiKey;
    this.model = model;
  }

  async call(prompt: string): Promise<string> {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Anthropic API error');
      }

      const data = await response.json();
      return data.content[0].text;
    } catch (error) {
      console.error('Anthropic adapter error:', error);
      throw error;
    }
  }
} 