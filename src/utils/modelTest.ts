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
    const adapter = new GoogleAdapter(apiKey, 'gemini-pro');
    await adapter.call('Test connection');
    return { success: true, message: 'Connection successful' };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Connection failed' };
  }
}; 