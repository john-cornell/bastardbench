import { BaseLLMAdapter } from './base';

export class OpenAIAdapter extends BaseLLMAdapter {
  private apiKey: string;

  constructor(apiKey: string, model: string = 'gpt-4-turbo-preview') {
    super(model, 'openai');
    this.apiKey = apiKey;
  }

  async call(prompt: string): Promise<string> {
    try {
      // Use proxy server to avoid CORS issues
      const proxyUrl = 'http://localhost:3001/api/openai';
      
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

      // First try to get the response as text to see what we're dealing with
      const responseText = await response.text();

      if (!response.ok) {
        let errorMessage = 'OpenAI API error';
        try {
          const error = JSON.parse(responseText);
          errorMessage = error.error || error.message || errorMessage;
          if (error.details) {
            console.error('OpenAI API Error Details:', error.details);
          }
        } catch (e) {
          // If we can't parse the error as JSON, use the text
          errorMessage = responseText || response.statusText || errorMessage;
        }
        throw new Error(`OpenAI API error (${response.status}): ${errorMessage}`);
      }

      try {
        const data = JSON.parse(responseText);
        return data.response;
      } catch (parseError) {
        console.error('Failed to parse OpenAI response:', parseError);
        throw new Error('Invalid response format from OpenAI API');
      }
    } catch (error) {
      console.error('OpenAI adapter error:', error);
      throw error;
    }
  }

  getModel(): string {
    return this.model;
  }

  getType(): string {
    return 'openai';
  }
} 