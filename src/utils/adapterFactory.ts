import { LLMAdapter } from '../types/llm';
import { TestSuite } from '../types/testSuite';
import { OpenAIAdapter } from '../adapters/openai';
import { AnthropicAdapter } from '../adapters/anthropic';
import { AzureAdapter } from '../adapters/azure';
import { BedrockAdapter } from '../adapters/bedrock';
import { OllamaAdapter } from '../adapters/ollama';
import { GoogleAdapter } from '../adapters/google';
import { MistralAdapter } from '../adapters/mistral';
import { GroqAdapter } from '../adapters/groq';
import { DeepSeekAdapter } from '../adapters/deepseek';

export const createAdapter = (adapter: TestSuite['adapters'][0]): LLMAdapter => {
  switch (adapter.type) {
    case 'openai':
      return new OpenAIAdapter(adapter.config.apiKey, adapter.model);
    case 'anthropic':
      return new AnthropicAdapter(adapter.config.apiKey, adapter.model);
    case 'azure':
      return new AzureAdapter(adapter.config.apiKey, adapter.config.endpoint, adapter.model);
    case 'bedrock':
      return new BedrockAdapter(
        adapter.config.accessKey,
        adapter.config.secretKey,
        adapter.config.region,
        adapter.model
      );
    case 'ollama':
      return new OllamaAdapter(adapter.config.endpoint, adapter.model);
    case 'google':
      return new GoogleAdapter(
        adapter.config.apiKey,
        adapter.model,
        adapter.config.apiPath,
        adapter.config.apiVersion
      );
    case 'mistral':
      return new MistralAdapter(adapter.config.apiKey, adapter.model);
    case 'groq':
      return new GroqAdapter(adapter.config.apiKey, adapter.model);
    case 'deepseek':
      return new DeepSeekAdapter(adapter.config.apiKey, adapter.model);
    default:
      throw new Error(`Unsupported adapter type: ${adapter.type}`);
  }
}; 