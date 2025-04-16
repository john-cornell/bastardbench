import { BaseLLMAdapter } from './base';
import { callGoogle } from '../utils/providers/google';

export class GoogleAdapter extends BaseLLMAdapter {
  constructor(apiKey: string, model: string, apiPath?: string, apiVersion?: string) {
    super({
      model,
      type: 'google',
      apiKey,
      endpoint: apiPath,
      location: apiVersion
    });
  }

  async call(prompt: string): Promise<string> {
    return callGoogle(prompt, this.model, {
      apiKey: this.apiKey as string,
      apiPath: this.endpoint,
      apiVersion: this.location
    });
  }
} 