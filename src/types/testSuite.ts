import { TestCategory } from './llm';

export interface TestSuite {
  id: string;
  name: string;
  description?: string;
  categories: TestCategory[];
  selectedTests: string[]; // Array of test IDs
  adapters: {
    id: string;
    name: string;
    type: 'openai' | 'anthropic' | 'azure' | 'bedrock' | 'ollama' | 'google' | 'mistral' | 'groq' | 'deepseek';
    model: string; // e.g., 'gpt-4', 'claude-3-opus', 'gemini-pro'
    config: Record<string, string>;
  }[];
  settings: {
    autoUpdateAdapterNames: boolean; // Controls whether adapter names are automatically updated with model names
  };
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_TEST_SUITE: TestSuite = {
  id: 'default',
  name: 'Default Suite',
  description: 'Default test suite with all categories',
  categories: Object.values(TestCategory),
  selectedTests: [],
  adapters: [],
  settings: {
    autoUpdateAdapterNames: true // Default to true to maintain current behavior
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const AVAILABLE_MODELS = {
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
    { id: 'gpt-4', name: 'GPT-4' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
  ],
  anthropic: [
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
    { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet' },
    { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' },
    { id: 'claude-2.1', name: 'Claude 2.1' },
  ],
  azure: [
    { id: 'gpt-4', name: 'GPT-4' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
  ],
  bedrock: [
    { id: 'anthropic.claude-3-opus-20240229-v1:0', name: 'Claude 3 Opus' },
    { id: 'anthropic.claude-3-sonnet-20240229-v1:0', name: 'Claude 3 Sonnet' },
    { id: 'anthropic.claude-3-haiku-20240307-v1:0', name: 'Claude 3 Haiku' },
    { id: 'anthropic.claude-v2:1', name: 'Claude 2.1' },
    { id: 'anthropic.claude-v2', name: 'Claude 2' },
    { id: 'anthropic.claude-instant-v1', name: 'Claude Instant' },
    { id: 'meta.llama2-70b-chat-v1', name: 'Llama 2 70B Chat' },
    { id: 'meta.llama2-13b-chat-v1', name: 'Llama 2 13B Chat' },
    { id: 'meta.llama2-7b-chat-v1', name: 'Llama 2 7B Chat' },
  ],
  ollama: [
    { id: 'llama2', name: 'Llama 2' },
    { id: 'mistral', name: 'Mistral' },
    { id: 'codellama', name: 'Code Llama' },
    { id: 'neural-chat', name: 'Neural Chat' },
  ],
  google: [
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
    { id: 'gemini-1.0-pro', name: 'Gemini 1.0 Pro' },
  ],
  mistral: [
    { id: 'mistral-large', name: 'Mistral Large' },
    { id: 'mistral-medium', name: 'Mistral Medium' },
    { id: 'mistral-small', name: 'Mistral Small' },
  ],
  groq: [
    { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B' },
    { id: 'llama2-70b-4096', name: 'Llama 2 70B' },
  ],
  deepseek: [
    { id: 'deepseek-chat', name: 'DeepSeek Chat' },
    { id: 'deepseek-coder', name: 'DeepSeek Coder' },
  ],
} as const; 