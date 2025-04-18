import { encrypt, decrypt } from './encryption';

export interface ConfigData {
  openAIKey: string;
  anthropicKey: string;
  azureKey: string;
  azureEndpoint: string;
  bedrockKey: string;
  bedrockSecretKey: string;
  bedrockRegion: string;
  ollamaEndpoint: string;
  googleKey: string;
  iterations: number;
  timeout: number;
  temperature: number;
  maxTokens: number;
  showAnswers: boolean;
}

const DEFAULT_CONFIG: ConfigData = {
  openAIKey: '',
  anthropicKey: '',
  azureKey: '',
  azureEndpoint: '',
  bedrockKey: '',
  bedrockSecretKey: '',
  bedrockRegion: '',
  ollamaEndpoint: '',
  googleKey: '',
  iterations: 5,
  timeout: 30000,
  temperature: 0.7,
  maxTokens: 2048,
  showAnswers: true
};

const STORAGE_KEY = 'bastard-bench-config';

const validateConfig = (config: Partial<ConfigData>): string[] => {
  const errors: string[] = [];

  if (config.openAIKey && !config.openAIKey.startsWith('sk-')) {
    errors.push('OpenAI API key must start with "sk-"');
  }

  if (config.anthropicKey && !config.anthropicKey.startsWith('sk-ant-')) {
    errors.push('Anthropic API key must start with "sk-ant-"');
  }

  if (config.azureEndpoint && !config.azureEndpoint.startsWith('https://')) {
    errors.push('Azure endpoint must start with "https://"');
  }

  if (config.bedrockRegion && !/^[a-z]{2}-[a-z]+-\d+$/.test(config.bedrockRegion)) {
    errors.push('AWS region must be in format "us-east-1"');
  }

  if (config.ollamaEndpoint && !config.ollamaEndpoint.startsWith('http')) {
    errors.push('Ollama endpoint must start with "http"');
  }

  if (config.iterations && (config.iterations < 1 || config.iterations > 10)) {
    errors.push('Iterations must be between 1 and 10');
  }

  if (config.timeout && (config.timeout < 1000 || config.timeout > 60000)) {
    errors.push('Timeout must be between 1000ms and 60000ms');
  }

  if (config.temperature && (config.temperature < 0 || config.temperature > 2)) {
    errors.push('Temperature must be between 0 and 2');
  }

  if (config.maxTokens && (config.maxTokens < 1 || config.maxTokens > 4000)) {
    errors.push('Max tokens must be between 1 and 4000');
  }

  return errors;
};

export const saveConfig = (config: ConfigData): string[] => {
  try {
    const errors = validateConfig(config);
    if (errors.length > 0) {
      return errors;
    }

    const jsonString = JSON.stringify(config);
    console.log('Saving config with masked keys');
    
    const encryptedData = encrypt(jsonString);
    if (!encryptedData) {
      console.warn('Failed to encrypt config data');
      return ['Failed to encrypt configuration'];
    }

    console.log('Saving encrypted data');
    localStorage.setItem(STORAGE_KEY, encryptedData);
    return [];
  } catch (e) {
    console.warn('Failed to save config:', e);
    return ['Failed to save configuration'];
  }
};

export const loadConfig = (): ConfigData => {
  try {
    const encryptedData = localStorage.getItem(STORAGE_KEY);
    if (!encryptedData) {
      console.log('No config data found in localStorage');
      return DEFAULT_CONFIG;
    }
    
    console.log('Loading encrypted data');
    const decryptedData = decrypt(encryptedData);
    
    if (!decryptedData) {
      console.warn('Failed to decrypt config data - clearing corrupted data');
      clearConfig();
      return DEFAULT_CONFIG;
    }

    try {
      const parsedData = JSON.parse(decryptedData);
      
      // Validate that the parsed data has the expected structure
      if (typeof parsedData !== 'object' || parsedData === null) {
        console.warn('Invalid config data structure - clearing corrupted data');
        clearConfig();
        return DEFAULT_CONFIG;
      }

      // Ensure all required fields are present
      const validatedData = { ...DEFAULT_CONFIG, ...parsedData };
      
      // Validate the data
      const errors = validateConfig(validatedData);
      if (errors.length > 0) {
        console.warn('Config validation errors:', errors);
        return validatedData;
      }

      return validatedData;
    } catch (parseError) {
      console.warn('Failed to parse decrypted config:', parseError);
      clearConfig();
      return DEFAULT_CONFIG;
    }
  } catch (e) {
    console.warn('Failed to load config:', e);
    clearConfig();
    return DEFAULT_CONFIG;
  }
};

export const clearConfig = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear config:', e);
  }
}; 