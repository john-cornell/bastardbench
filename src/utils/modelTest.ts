import { OpenAIAdapter } from '../adapters/openai';
import { AnthropicAdapter } from '../adapters/anthropic';
import { AzureAdapter } from '../adapters/azure';
import { BedrockAdapter } from '../adapters/bedrock';
import { OllamaAdapter } from '../adapters/ollama';
import { GoogleAdapter } from '../adapters/google';

interface TestResult {
  success: boolean;
  message: string;
}

export const testOpenAI = async (apiKey: string): Promise<TestResult> => {
  try {
    const adapter = new OpenAIAdapter(apiKey, 'gpt-4');
    await adapter.call('Test connection');
    return { success: true, message: 'Connection successful' };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Connection failed' };
  }
};

export const testAnthropic = async (apiKey: string): Promise<TestResult> => {
  try {
    const adapter = new AnthropicAdapter(apiKey, 'claude-3-opus-20240229');
    await adapter.call('Test connection');
    return { success: true, message: 'Connection successful' };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Connection failed' };
  }
};

export const testAzure = async (apiKey: string, endpoint: string): Promise<TestResult> => {
  try {
    const adapter = new AzureAdapter(apiKey, endpoint, 'gpt-4');
    await adapter.call('Test connection');
    return { success: true, message: 'Connection successful' };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Connection failed' };
  }
};

export const testBedrock = async (accessKey: string, secretKey: string, region: string): Promise<TestResult> => {
  try {
    const adapter = new BedrockAdapter(accessKey, secretKey, region, 'anthropic.claude-3-opus-20240229-v1:0');
    await adapter.call('Test connection');
    return { success: true, message: 'Connection successful' };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Connection failed' };
  }
};

export const testOllama = async (endpoint: string): Promise<TestResult> => {
  try {
    const adapter = new OllamaAdapter(endpoint, 'llama2');
    await adapter.call('Test connection');
    return { success: true, message: 'Connection successful' };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Connection failed' };
  }
};

export const testGoogle = async (apiKey: string): Promise<TestResult> => {
  try {
    console.log('Testing Google connection with API key length:', apiKey ? apiKey.length : 0);
    
    // Try to test with the experimental model first
    const testModel = 'gemini-2.0-pro-exp';
    console.log(`Testing Google connection with experimental model: ${testModel}`);
    
    const adapter = new GoogleAdapter(apiKey, testModel, 'v1beta/models/gemini-2.0-pro-exp:generateContent', 'v1beta');
    console.log(`Created Google adapter for model: ${testModel}`);
    
    console.log('Attempting Google connection test...');
    try {
      const response = await adapter.call('Test connection with experimental model');
      console.log('Google connection test successful with experimental model, response:', response);
      return { success: true, message: 'Connection successful with experimental model' };
    } catch (expError) {
      console.error(`Connection test failed with experimental model: ${expError}`);
      console.log('Falling back to standard model: gemini-pro');
      
      // Try with the standard model as fallback
      const standardAdapter = new GoogleAdapter(apiKey, 'gemini-pro', 'v1/models/gemini-pro:generateContent', 'v1');
      const fallbackResponse = await standardAdapter.call('Test connection with standard model');
      console.log('Google connection test successful with standard model, response:', fallbackResponse);
      return { success: true, message: 'Connection successful with standard model (experimental model failed)' };
    }
  } catch (error) {
    console.error('Google connection test failed:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Connection failed' };
  }
}; 