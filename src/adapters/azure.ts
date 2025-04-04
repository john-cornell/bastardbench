import { BaseLLMAdapter } from './base';

export class AzureAdapter extends BaseLLMAdapter {
  private apiKey: string;
  private endpoint: string;
  private model: string;

  constructor(apiKey: string, endpoint: string, model: string = 'gpt-4') {
    super('azure', 'Azure OpenAI GPT-4', 'Azure');
    this.apiKey = apiKey;
    this.endpoint = endpoint;
    this.model = model;
  }

  async call(prompt: string): Promise<string> {
    try {
      const response = await fetch(`${this.endpoint}/openai/deployments/${this.model}/chat/completions?api-version=2023-05-15`, {
        method: 'POST',
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
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
        throw new Error(error.error?.message || 'Azure API error');
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Azure adapter error:', error);
      throw error;
    }
  }
} 