import { BaseLLMAdapter } from './base';

export class GoogleAdapter extends BaseLLMAdapter {
  private apiKey: string;
  private model: string;
  private apiPath?: string;
  private discoveredApiVersion?: string;

  constructor(apiKey: string, model: string = 'gemini-pro', apiPath?: string, discoveredApiVersion?: string) {
    super('google', 'Google Gemini Pro', 'Google');
    this.apiKey = apiKey;
    this.model = model;
    this.apiPath = apiPath;
    this.discoveredApiVersion = discoveredApiVersion;
    console.log(`GoogleAdapter initialized with model: ${model}, apiPath: ${apiPath || 'default'}, discoveredApiVersion: ${discoveredApiVersion || 'none'}`);
  }

  async call(prompt: string): Promise<string> {
    try {
      // Use proxy server to avoid CORS issues
      const proxyUrl = 'http://localhost:3001/api/google';
      
      // Generate API path if not provided
      const modelApiPath = this.apiPath || this.getApiPathForModel(this.model);
      
      console.log(`GoogleAdapter making request with:
        - Model: ${this.model}
        - API Path: ${modelApiPath}
        - Prompt length: ${prompt.length}
        - API Key length: ${this.apiKey ? this.apiKey.length : 0}
      `);
      
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: this.apiKey,
          prompt,
          model: this.model,
          apiPath: modelApiPath
        }),
      });

      console.log(`GoogleAdapter received response: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`GoogleAdapter error response: ${errorText}`);
        
        try {
          const error = JSON.parse(errorText);
          throw new Error(error.error || `Google API error: ${response.status} ${response.statusText}`);
        } catch (parseError) {
          throw new Error(`Google API error: ${response.status} ${response.statusText} - ${errorText}`);
        }
      }

      const data = await response.json();
      console.log(`GoogleAdapter success response type:`, typeof data.response);
      return data.response;
    } catch (error) {
      console.error('Google adapter error:', error);
      throw error;
    }
  }
  
  // Helper method to get the correct API path for a given model
  private getApiPathForModel(model: string): string {
    // Clean up model name - remove 'models/' prefix if present
    const cleanModelName = model.replace(/^models\//, '');
    console.log(`Getting API path for model: ${cleanModelName}`);
    
    // If model has a discovered API version, use that
    if (this.discoveredApiVersion) {
      const apiPath = `${this.discoveredApiVersion}/models/${cleanModelName}:generateContent`;
      console.log(`Using discovered API version ${this.discoveredApiVersion} for path: ${apiPath}`);
      return apiPath;
    }
    
    // Get the model name with 'models/' prefix removed
    // In actual discovery, models would come with their API version paths
    // This is fallback logic if no discovery data available
    console.log(`No discovered API version, using fallback logic`);
    
    // For experimental models, use v1beta
    if (/(-preview|-exp|-\d{2}-\d{2})/.test(cleanModelName)) {
      const apiPath = `v1beta/models/${cleanModelName}:generateContent`;
      console.log(`Using v1beta API path for experimental model: ${apiPath}`);
      return apiPath;
    }
    
    // For models with version numbers 2.0+ use v1beta
    if (/(2\.[0-9]|3\.[0-9])/.test(cleanModelName)) {
      const apiPath = `v1beta/models/${cleanModelName}:generateContent`;
      console.log(`Using v1beta API path for newer model version: ${apiPath}`);
      return apiPath;
    }
    
    // Default to v1 for standard models
    const defaultPath = `v1/models/${cleanModelName}:generateContent`;
    console.log(`Using default v1 API path: ${defaultPath}`);
    return defaultPath;
  }
} 