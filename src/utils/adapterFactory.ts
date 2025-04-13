import { LLMAdapter } from '../types/llm';
import { TestSuite } from '../types/testSuite';
import { callOpenAI } from './providers/openai';
import { callAnthropic } from './providers/anthropic';
import { callAzure } from './providers/azure';
import { callBedrock } from './providers/bedrock';
import { callOllama } from './providers/ollama';
import { callGoogle } from './providers/google';

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

  return {
    id,
    name,
    provider,
    call
  };
} 