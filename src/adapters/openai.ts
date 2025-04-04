import { BaseLLMAdapter } from './base';

export class OpenAIAdapter extends BaseLLMAdapter {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = 'gpt-4') {
    super('openai', 'OpenAI GPT-4', 'OpenAI');
    this.apiKey = apiKey;
    this.model = model;
  }

  async call(prompt: string): Promise<string> {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
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
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'OpenAI API error');
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI adapter error:', error);
      throw error;
    }
  }
} 