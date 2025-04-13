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
    type: 'openai' | 'anthropic' | 'azure' | 'bedrock' | 'ollama' | 'google';
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
    { id: 'gpt-4', name: 'GPT-4' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
  ],
  anthropic: [
    { id: 'claude-3-opus', name: 'Claude 3 Opus' },
    { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet' },
    { id: 'claude-2.1', name: 'Claude 2.1' },
  ],
  azure: [
    { id: 'gpt-4', name: 'GPT-4' },
    { id: 'gpt-35-turbo', name: 'GPT-3.5 Turbo' },
  ],
  bedrock: [
    { id: 'anthropic.claude-3-opus', name: 'Claude 3 Opus' },
    { id: 'anthropic.claude-3-sonnet', name: 'Claude 3 Sonnet' },
    { id: 'anthropic.claude-2.1', name: 'Claude 2.1' },
  ],
  ollama: [
    { id: 'llama2', name: 'Llama 2' },
    { id: 'mistral', name: 'Mistral' },
    { id: 'codellama', name: 'Code Llama' },
  ],
  google: [
    { id: 'gemini-pro', name: 'Gemini Pro' },
    { id: 'gemini-ultra', name: 'Gemini Ultra' },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' }
  ],
} as const; 