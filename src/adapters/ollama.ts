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
      // Ensure endpoint doesn't have trailing slash
      const cleanEndpoint = this.endpoint.endsWith('/') ? this.endpoint.slice(0, -1) : this.endpoint;
      console.log('Ollama endpoint:', JSON.stringify(cleanEndpoint, null, 2));
      console.log('Ollama prompt:', JSON.stringify(prompt, null, 2));
      const response = await fetch(`${cleanEndpoint}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
          options: {
            temperature: 0.7,
            num_predict: 1000,
          }
        }),
      });

      console.log('Ollama response:', JSON.stringify(response, null, 2));

      if (!response.ok) {
        let errorMessage = 'Ollama API error';
        try {
          console.log('Ollama response:', response);
          const error = await response.json();
          errorMessage = error.error?.message || error.message || errorMessage;
        } catch (e) {
          // If we can't parse the error as JSON, try to get the text
          try {
            const errorText = await response.text();
            errorMessage = errorText || errorMessage;
          } catch (textError) {
            // If all else fails, use the status text
            errorMessage = response.statusText || errorMessage;
          }
        }
        throw new Error(`Ollama API error (${response.status}): ${errorMessage}`);
      }

      // First try to get the response as text to see what we're dealing with
      const responseText = await response.text();
      
      try {
        // Try to parse as JSON
        const data = JSON.parse(responseText);
        
        // Handle different response formats
        if (typeof data === 'string') {
          return data;
        } else if (data.response) {
          return data.response;
        } else if (data.generated_text) {
          return data.generated_text;
        } else if (data.output) {
          return data.output;
        } else if (data.completion) {
          return data.completion;
        } else if (data.text) {
          return data.text;
        } else if (Array.isArray(data) && data.length > 0) {
          // Some Ollama versions return an array of responses
          return data[0].response || data[0].text || data[0].generated_text || JSON.stringify(data[0]);
        }

        // If we can't find a recognized response format, return the raw response
        console.warn('Unrecognized Ollama response format:', data);
        return JSON.stringify(data);
      } catch (parseError) {
        // If JSON parsing fails, return the raw text
        console.warn('Failed to parse Ollama response as JSON:', parseError);
        return responseText;
      }
    } catch (error) {
      console.error('Ollama adapter error:', error);
      throw error;
    }
  }
} 