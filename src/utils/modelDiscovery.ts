import { TestSuite } from '../types/testSuite';

interface ModelInfo {
  id: string;
  name: string;
  contextWindow?: number;
  maxTokens?: number;
  pricing?: {
    input: string;
    output: string;
  };
  apiPath?: string;
}

interface ProviderModels {
  openai?: ModelInfo[];
  anthropic?: ModelInfo[];
  azure?: ModelInfo[];
  bedrock?: ModelInfo[];
  ollama?: ModelInfo[];
  google?: ModelInfo[];
}

interface GoogleModelInfo extends ModelInfo {
  apiPath: string;
}

export interface GoogleModelMetadata {
  name: string;
  version: 'v1' | 'v1beta';
}

// Fallback models in case API calls fail
const FALLBACK_MODELS: ProviderModels = {
  openai: [
    { id: 'gpt-4-turbo-preview', name: 'GPT-4 Turbo', contextWindow: 128000 },
    { id: 'gpt-4', name: 'GPT-4', contextWindow: 8192 },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', contextWindow: 16385 },
  ],
  anthropic: [
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', contextWindow: 200000 },
    { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', contextWindow: 200000 },
    { id: 'claude-2.1', name: 'Claude 2.1', contextWindow: 200000 },
  ],
  azure: [
    { id: 'gpt-4', name: 'GPT-4', contextWindow: 8192 },
    { id: 'gpt-35-turbo', name: 'GPT-3.5 Turbo', contextWindow: 16385 },
  ],
  bedrock: [
    { id: 'anthropic.claude-3-opus-20240229-v1:0', name: 'Claude 3 Opus', contextWindow: 200000 },
    { id: 'anthropic.claude-3-sonnet-20240229-v1:0', name: 'Claude 3 Sonnet', contextWindow: 200000 },
  ],
  ollama: [
    { id: 'llama2', name: 'Llama 2', contextWindow: 4096 },
    { id: 'mistral', name: 'Mistral', contextWindow: 8192 },
    { id: 'codellama', name: 'Code Llama', contextWindow: 8192 },
  ],
  google: [
    { id: 'gemini-pro', name: 'Gemini Pro', contextWindow: 32768 },
    { id: 'gemini-pro-vision', name: 'Gemini Pro Vision', contextWindow: 32768 },
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', contextWindow: 32768 },
    { id: 'gemini-2.0-pro', name: 'Gemini 2.0 Pro', contextWindow: 32768 }
  ],
};

// Update version paths for Google models
const GOOGLE_API_VERSIONS = [
  {
    path: 'v1',
    models: [
      'gemini-pro',
      'gemini-pro-vision',
      'gemini-2.0-pro',
      'gemini-2.0-pro-vision',
      'gemini-2.0-pro-latest',
      'gemini-2.0-pro-vision-latest',
      'chat-bison'
    ]
  },
  {
    path: 'v1beta',
    models: [
      'gemini-pro',
      'gemini-pro-vision',
      'gemini-ultra',
      'gemini-2.0-pro',
      'gemini-2.0-pro-vision',
      'gemini-2.0-pro-latest',
      'gemini-2.0-pro-vision-latest',
      'gemini-2.0-pro-exp',
      'chat-bison-001'
    ]
  }
] as const;

// Update model metadata
export const GOOGLE_MODEL_METADATA: Record<string, GoogleModelMetadata> = {
  'gemini-pro': { name: 'Gemini Pro', version: 'v1' },
  'gemini-pro-vision': { name: 'Gemini Pro Vision', version: 'v1' },
  'gemini-ultra': { name: 'Gemini Ultra', version: 'v1beta' },
  'gemini-2.0-pro': { name: 'Gemini 2.0 Pro', version: 'v1' },
  'gemini-2.0-pro-vision': { name: 'Gemini 2.0 Pro Vision', version: 'v1' },
  'gemini-2.0-pro-latest': { name: 'Gemini 2.0 Pro (Latest)', version: 'v1' },
  'gemini-2.0-pro-vision-latest': { name: 'Gemini 2.0 Pro Vision (Latest)', version: 'v1' },
  'gemini-2.0-pro-exp': { name: 'Gemini 2.0 Pro (Experimental)', version: 'v1beta' },
  'chat-bison': { name: 'PaLM 2 Chat', version: 'v1' },
  'chat-bison-001': { name: 'PaLM 2 Chat', version: 'v1beta' }
};

export async function discoverAvailableModels(adapters: TestSuite['adapters']): Promise<ProviderModels> {
  const results: ProviderModels = {};

  for (const adapter of adapters) {
    try {
      console.log(`\n[Model Discovery] Attempting to discover models for ${adapter.type}`);
      console.log(`[Model Discovery] Adapter config:`, JSON.stringify({
        ...adapter.config,
        apiKey: adapter.config.apiKey ? "****" : undefined,
        secretKey: adapter.config.secretKey ? "****" : undefined,
        accessKey: adapter.config.accessKey ? "****" : undefined,
      }));
      
      switch (adapter.type) {
        case 'openai':
          results.openai = await discoverOpenAIModels(adapter.config.apiKey);
          break;
        case 'anthropic':
          results.anthropic = await discoverAnthropicModels(adapter.config.apiKey);
          break;
        case 'azure':
          results.azure = await discoverAzureModels(adapter.config.apiKey, adapter.config.endpoint);
          break;
        case 'bedrock':
          results.bedrock = await discoverBedrockModels(
            adapter.config.accessKey,
            adapter.config.secretKey,
            adapter.config.region
          );
          break;
        case 'ollama':
          results.ollama = await discoverOllamaModels(adapter.config.endpoint);
          break;
        case 'google':
          results.google = await discoverGoogleModels(adapter);
          break;
      }
    } catch (error) {
      console.error(`\n[Model Discovery] ❌ Failed to discover models for ${adapter.type}:`, error);
      console.log(`[Model Discovery] Using fallback models for ${adapter.type}`);
      results[adapter.type] = FALLBACK_MODELS[adapter.type];
    }
  }

  return results;
}

async function discoverOpenAIModels(apiKey: string): Promise<ModelInfo[]> {
  if (!apiKey) {
    console.log('[Model Discovery] OpenAI: No API key provided');
    throw new Error('OpenAI API key is required');
  }

  console.log('[Model Discovery] OpenAI: Fetching models from API...');
  
  try {
    // Add timeout and better error handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal
    }).finally(() => clearTimeout(timeoutId));

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Model Discovery] OpenAI: API error: ${response.status} ${response.statusText}\n${errorText}`);
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[Model Discovery] OpenAI: Raw API response sample:', JSON.stringify(data).substring(0, 500));
    
    if (!data.data || !Array.isArray(data.data)) {
      console.error('[Model Discovery] OpenAI: Unexpected API response format', data);
      throw new Error('Unexpected API response format from OpenAI');
    }

    // Log all model IDs for debugging
    console.log('[Model Discovery] OpenAI: All model IDs:', data.data.map((m: any) => m.id).join(', '));
    
    // Filter for LLM models only - exclude embeddings, image, and fine-tuned models
    let llmModels = data.data.filter((model: any) => {
      const id = model.id.toLowerCase();
      return (
        // Include chat models
        (id.includes('gpt') && !id.includes('ft')) || // Exclude fine-tuned models
        id.includes('text-davinci')
      ) && (
        // Exclude embedding models
        !id.includes('embedding') && 
        !id.includes('search') && 
        !id.includes('similarity') && 
        !id.includes('code-search') &&
        !id.includes('dall-e') &&
        !id.includes('whisper') &&
        !id.includes('tts')
      );
    });
    
    console.log(`[Model Discovery] OpenAI: Found ${llmModels.length} LLM models`);
    
    if (llmModels.length === 0) {
      console.warn('[Model Discovery] OpenAI: No LLM models found in response. Using fallback models.');
      return FALLBACK_MODELS.openai || [];
    }

    const models = llmModels.map((model: any) => ({
      id: model.id,
      name: model.id.replace(/-/g, ' ').toUpperCase(),
      contextWindow: model.context_window || 4096, // Default if not provided
      maxTokens: model.max_tokens,
    }));
    
    console.log(`[Model Discovery] OpenAI: Successfully processed ${models.length} models:`, models);
    return models;
  } catch (error) {
    console.error('[Model Discovery] OpenAI: Error fetching models:', error);
    throw error;
  }
}

async function discoverAnthropicModels(apiKey: string): Promise<ModelInfo[]> {
  if (!apiKey) {
    console.log('[Model Discovery] Anthropic: No API key provided');
    throw new Error('Anthropic API key is required');
  }

  console.log('[Model Discovery] Anthropic: Fetching models from API...');
  const response = await fetch('https://api.anthropic.com/v1/models', {
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Model Discovery] Anthropic: API error: ${response.status} ${response.statusText}\n${errorText}`);
    throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  console.log('[Model Discovery] Anthropic: Raw API response:', JSON.stringify(data).substring(0, 500));

  if (!data.models || !Array.isArray(data.models)) {
    console.error('[Model Discovery] Anthropic: Unexpected API response format');
    throw new Error('Unexpected API response format from Anthropic');
  }

  // Filter for only LLM chat models
  const llmModels = data.models.filter((model: any) => {
    const id = model.id.toLowerCase();
    return id.includes('claude') && !id.includes('instant');
  });
  
  console.log(`[Model Discovery] Anthropic: Found ${llmModels.length} Claude models`);
  
  if (llmModels.length === 0) {
    console.warn('[Model Discovery] Anthropic: No Claude models found. Using fallback models.');
    return FALLBACK_MODELS.anthropic || [];
  }

  const models = llmModels.map((model: any) => ({
    id: model.id,
    name: model.name || model.id,
    contextWindow: model.context_window,
    maxTokens: model.max_tokens,
  }));
  
  console.log(`[Model Discovery] Anthropic: Successfully fetched ${models.length} models`);
  return models;
}

async function discoverAzureModels(apiKey: string, endpoint: string): Promise<ModelInfo[]> {
  if (!apiKey || !endpoint) {
    console.log('[Model Discovery] Azure: Missing API key or endpoint');
    throw new Error('Azure API key and endpoint are required');
  }

  // Ensure endpoint doesn't have trailing slash
  const cleanEndpoint = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
  console.log(`[Model Discovery] Azure: Fetching models from endpoint: ${cleanEndpoint}`);
  
  const response = await fetch(`${cleanEndpoint}/openai/models?api-version=2023-05-15`, {
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Model Discovery] Azure: API error: ${response.status} ${response.statusText}\n${errorText}`);
    throw new Error(`Azure API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  console.log('[Model Discovery] Azure: Raw API response:', JSON.stringify(data).substring(0, 200) + '...');

  if (!data.data || !Array.isArray(data.data)) {
    console.error('[Model Discovery] Azure: Unexpected API response format');
    throw new Error('Unexpected API response format from Azure');
  }

  const models = data.data
    .filter((model: any) => model.id.includes('gpt'))
    .map((model: any) => ({
      id: model.id,
      name: model.id.replace(/-/g, ' ').toUpperCase(),
      contextWindow: model.context_window,
      maxTokens: model.max_tokens,
    }));
  
  console.log(`[Model Discovery] Azure: Successfully fetched ${models.length} models`);
  return models;
}

async function discoverBedrockModels(
  accessKey: string,
  secretKey: string,
  region: string
): Promise<ModelInfo[]> {
  if (!accessKey || !secretKey || !region) {
    console.log('[Model Discovery] Bedrock: Missing credentials or region');
    throw new Error('AWS access key, secret key, and region are required');
  }

  console.log(`[Model Discovery] Bedrock: Not implemented - using fallback models for region ${region}`);
  // Note: We're using fallback models for Bedrock since direct API authentication is complex
  return FALLBACK_MODELS.bedrock || [];
}

async function discoverOllamaModels(endpoint: string): Promise<ModelInfo[]> {
  if (!endpoint) {
    console.log('[Model Discovery] Ollama: No endpoint provided');
    throw new Error('Ollama endpoint is required');
  }

  // Ensure endpoint doesn't have trailing slash
  const cleanEndpoint = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
  console.log(`[Model Discovery] Ollama: Fetching models from endpoint: ${cleanEndpoint}`);
  
  try {
    // First try the /api/tags endpoint (newer Ollama versions)
    console.log(`[Model Discovery] Ollama: Trying endpoint ${cleanEndpoint}/api/tags`);
    let response = await fetch(`${cleanEndpoint}/api/tags`);
    
    // If that fails, try the /api/models endpoint (some Ollama versions)
    if (!response.ok) {
      console.log(`[Model Discovery] Ollama: Tags endpoint failed, trying ${cleanEndpoint}/api/models`);
      response = await fetch(`${cleanEndpoint}/api/models`);
    }
    
    // If both fail, try just /models (some Ollama server implementations)
    if (!response.ok) {
      console.log(`[Model Discovery] Ollama: Models endpoint failed, trying ${cleanEndpoint}/models`);
      response = await fetch(`${cleanEndpoint}/models`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Model Discovery] Ollama: All API endpoints failed. Error: ${response.status} ${response.statusText}\n${errorText}`);
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    // Parse the response
    const data = await response.json();
    console.log('[Model Discovery] Ollama: Raw API response:', JSON.stringify(data));

    // Handle various Ollama API response formats
    let modelsList: any[] = [];
    
    if (Array.isArray(data)) {
      // Direct array of models
      console.log('[Model Discovery] Ollama: Response is a direct array');
      modelsList = data;
    } else if (data.models && Array.isArray(data.models)) {
      // {models: [...]} format
      console.log('[Model Discovery] Ollama: Response has models array');
      modelsList = data.models;
    } else if (data.data && Array.isArray(data.data)) {
      // {data: [...]} format (some API versions)
      console.log('[Model Discovery] Ollama: Response has data array');
      modelsList = data.data;
    } else {
      console.error('[Model Discovery] Ollama: Unexpected API response format', data);
      throw new Error('Unexpected API response format from Ollama');
    }
    
    console.log('[Model Discovery] Ollama: Found models list:', modelsList);
    
    if (modelsList.length === 0) {
      console.warn('[Model Discovery] Ollama: No models found in response');
    }

    // Filter for LLM models only (exclude embeddings)
    const llmModels = modelsList.filter((model: any) => {
      const modelId = (model.name || model.id || '').toLowerCase();
      // Exclude embedding models
      return !modelId.includes('embedding') && !modelId.includes('embed');
    });
    
    console.log(`[Model Discovery] Ollama: Found ${llmModels.length} LLM models`);
    
    if (llmModels.length === 0) {
      console.warn('[Model Discovery] Ollama: No LLM models found. Using fallback models.');
      return FALLBACK_MODELS.ollama || [];
    }

    const models = llmModels.map((model: any) => {
      // Different Ollama versions have different response formats
      const modelId = model.name || model.id || (typeof model === 'string' ? model : null);
      const modelName = model.name || model.id || (typeof model === 'string' ? model : null);
      
      return {
        id: modelId,
        name: modelName,
        contextWindow: model.context_window || 
                      model.parameters?.context_length || 
                      (model.parameters?.context_window_size ? parseInt(model.parameters.context_window_size) : undefined),
        maxTokens: model.max_tokens,
      };
    });
    
    console.log(`[Model Discovery] Ollama: Successfully processed ${models.length} models:`, models);
    return models;
  } catch (error) {
    console.error('[Model Discovery] Ollama error:', error);
    throw error;
  }
}

const discoverGoogleModels = async (adapter: any): Promise<ModelInfo[]> => {
  const apiKey = adapter.config.apiKey;
  if (!apiKey) {
    console.log('[Google API] No API key provided, using fallback models');
    return [
      {
        id: 'models/gemini-pro',
        name: 'Gemini Pro',
        contextWindow: 32000,
        apiPath: 'v1/models/gemini-pro:generateContent'
      },
      {
        id: 'models/gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        contextWindow: 128000,
        apiPath: 'v1/models/gemini-1.5-pro:generateContent'
      }
    ];
  }

  let allModels: ModelInfo[] = [];

  // Try each API version
  for (const versionConfig of GOOGLE_API_VERSIONS) {
    try {
      console.log(`[Google API] Checking ${versionConfig.path} API...`);
      const response = await fetch(
        `https://generativelanguage.googleapis.com/${versionConfig.path}/models?key=${apiKey}`
      );

      if (!response.ok) {
        console.warn(`[Google API] Failed to fetch models for ${versionConfig.path}:`, response.status);
        continue;
      }

      const data = await response.json();
      if (!data.models) {
        console.warn(`[Google API] No models found in response for ${versionConfig.path}`);
        continue;
      }

      // Filter models to include all valid LLM models
      const models = data.models
        .filter((model: any) => {
          const modelName = model.name.split('/').pop();
          const isVisionModel = modelName.includes('vision');
          const isEmbeddingModel = modelName.includes('embedding') || 
                                  modelName.startsWith('embedding-') || 
                                  modelName.startsWith('text-embedding-');
          const isImageGenerationModel = modelName.includes('imagen') || modelName.includes('image');
          const supportsTextGeneration = model.supportedGenerationMethods?.includes('generateContent');
          const isGeminiOrGemma = modelName.includes('gemini') || modelName.includes('gemma');

          // Include model if:
          // 1. It's a Gemini or Gemma model
          // 2. It supports text generation
          // 3. It's NOT a vision model
          // 4. It's NOT an embedding model
          // 5. It's NOT an image generation model
          return isGeminiOrGemma && 
                 supportsTextGeneration && 
                 !isVisionModel && 
                 !isEmbeddingModel &&
                 !isImageGenerationModel;
        })
        .map((model: any) => {
          const modelName = model.name.split('/').pop();
          const displayName = model.displayName || getDisplayName(modelName);
          
          // Store the full API path used when discovered
          const modelApiPath = `${versionConfig.path}/models/${modelName}:generateContent`;
          
          return {
            id: `models/${modelName}`,
            name: displayName,
            contextWindow: model.inputTokenLimit || determineContextWindow(modelName),
            apiPath: modelApiPath
          };
        });

      if (models.length > 0) {
        console.log(`[Google API] Found ${models.length} models in ${versionConfig.path}:`, 
          models.map((m: any) => `${m.name} (${m.apiPath})`));
        // Add models to our collection
        allModels = [...allModels, ...models];
      } else {
        console.warn(`[Google API] No suitable LLM models found in ${versionConfig.path}`);
      }
    } catch (error) {
      console.error(`[Google API] Error discovering models for ${versionConfig.path}:`, error);
    }
  }

  // If no models were discovered, use fallback with non-vision models only
  if (allModels.length === 0) {
    console.log('[Google API] No models discovered, using basic fallback models');
    return [
      {
        id: 'models/gemini-pro',
        name: 'Gemini Pro',
        contextWindow: 32000,
        apiPath: 'v1/models/gemini-pro:generateContent'
      },
      {
        id: 'models/gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        contextWindow: 128000,
        apiPath: 'v1/models/gemini-1.5-pro:generateContent'
      }
    ];
  }

  // Remove duplicates based on model ID
  // If model exists in both v1 and v1beta, prefer v1beta
  const modelMap = new Map<string, ModelInfo>();
  
  // Add models to the map, with a priority system
  allModels.forEach(model => {
    const existingModel = modelMap.get(model.id);
    
    if (!existingModel) {
      // Model not in map yet, add it
      modelMap.set(model.id, model);
    } else {
      // Model already in map. For experimental versions, prefer v1beta
      const isExperimental = model.id.includes('-exp') || 
                           model.id.includes('-preview') ||
                           model.id.includes('2.0') ||
                           model.id.includes('2.5');
                           
      if (isExperimental && model.apiPath && model.apiPath.includes('v1beta')) {
        // Replace existing model with this one since it's experimental and v1beta
        modelMap.set(model.id, model);
      }
    }
  });
  
  const uniqueModels = Array.from(modelMap.values());
  console.log(`[Google API] Total unique models discovered: ${uniqueModels.length}`);
  console.log('[Google API] Final model list:', uniqueModels.map(m => `${m.name} (${m.apiPath})`));
  
  return uniqueModels;
};

// Helper function to create a nice display name from model ID
function getDisplayName(modelId: string): string {
  return modelId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Helper function to estimate context window size based on model name
function determineContextWindow(modelName: string): number {
  // Default values based on model families
  if (modelName.includes('gemini-1.0')) return 32000;
  if (modelName.includes('gemini-1.5')) return 128000;
  if (modelName.includes('gemini-2')) return 128000;
  if (modelName.includes('gemma-3')) {
    if (modelName.includes('27b')) return 128000;
    if (modelName.includes('12b')) return 128000;
    return 64000; // For smaller Gemma models
  }
  return 32000; // Default fallback
} 