import { LLMAdapter } from '../types/llm';
import { TestSuite } from '../types/testSuite';
import { callOpenAI } from './providers/openai';
import { callAnthropic } from './providers/anthropic';
import { callAzure } from './providers/azure';
import { callBedrock } from './providers/bedrock';
import { callOllama } from './providers/ollama';
import { callGoogle } from './providers/google';
import { GoogleAdapter } from '../adapters/google';

export function createAdapter(adapterConfig: TestSuite['adapters'][0]): LLMAdapter {
  const { id, name, type, model, config } = adapterConfig;

  const callMap: Record<string, (prompt: string, model: string, config: Record<string, string>) => Promise<string>> = {
    openai: callOpenAI,
    anthropic: callAnthropic,
    azure: callAzure,
    bedrock: callBedrock,
    ollama: callOllama,
    google: callGoogle
  };

  const provider = type;
  const call = async (prompt: string): Promise<string> => {
    const callFn = callMap[type];
    if (!callFn) {
      throw new Error(`Unsupported provider type: ${type}`);
    }
    return callFn(prompt, model, config);
  };

  // For Google adapter, use the class-based implementation
  if (type === 'google') {
    // Get the discovered API path from the model discovery process
    console.log(`Creating Google adapter for model ${model} with config:`, config);
    
    // The apiPath from discovery should be the complete path used when discovered 
    const discoveredApiPath = config.apiPath;
    console.log(`Model has discovered API path: ${discoveredApiPath || 'none'}`);
    
    const googleAdapter = new GoogleAdapter(config.apiKey, model, discoveredApiPath);
    return {
      id,
      name,
      provider: type,
      call: (prompt: string) => googleAdapter.call(prompt)
    };
  }

  return {
    id,
    name,
    provider,
    call
  };
} 