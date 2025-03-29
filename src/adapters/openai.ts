import OpenAI from 'openai';
import { BaseLLMAdapter } from './base';

export class OpenAIAdapter extends BaseLLMAdapter {
  private client: OpenAI;

  constructor(apiKey: string, model: string = 'gpt-4') {
    super('openai', 'OpenAI GPT-4', 'OpenAI');
    this.client = new OpenAI({ apiKey });
  }

  async call(prompt: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }]
    });
    return response.choices[0].message?.content || '';
  }
} 