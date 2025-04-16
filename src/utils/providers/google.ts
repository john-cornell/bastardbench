export const callGoogle = async (
  prompt: string,
  model: string,
  config: {
    apiKey: string;
    apiPath?: string;
    apiVersion?: string;
  }
): Promise<string> => {
  try {
    // Use proxy server to avoid CORS issues
    const proxyUrl = 'http://localhost:3001/api/google';
    
    // Generate API path if not provided
    const modelApiPath = config.apiPath || getApiPathForModel(model, config.apiVersion);
    
    console.log(`Google API request:
      - Model: ${model}
      - API Path: ${modelApiPath}
      - Prompt length: ${prompt.length}
      - API Key length: ${config.apiKey ? config.apiKey.length : 0}
    `);
    
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey: config.apiKey,
        prompt,
        model,
        apiPath: modelApiPath
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Google API error response: ${errorText}`);
      
      try {
        const error = JSON.parse(errorText);
        throw new Error(error.error || `Google API error: ${response.status} ${response.statusText}`);
      } catch (parseError) {
        throw new Error(`Google API error: ${response.status} ${response.statusText} - ${errorText}`);
      }
    }

    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error('Google API error:', error);
    throw error;
  }
};

const getApiPathForModel = (model: string, apiVersion?: string): string => {
  // Clean up model name - remove 'models/' prefix if present
  const cleanModelName = model.replace(/^models\//, '');
  
  // If API version is provided, use that
  if (apiVersion) {
    return `${apiVersion}/models/${cleanModelName}:generateContent`;
  }
  
  // Specifically check for Gemma models - all Gemma models should use v1beta
  if (/gemma-[0-9]/.test(cleanModelName)) {
    return `v1beta/models/${cleanModelName}:generateContent`;
  }
  
  // For experimental models, use v1beta
  if (/(-preview|-exp|-\d{2}-\d{2})/.test(cleanModelName)) {
    return `v1beta/models/${cleanModelName}:generateContent`;
  }
  
  // For models with version numbers 2.0+ use v1beta
  if (/(2\.[0-9]|3\.[0-9])/.test(cleanModelName)) {
    return `v1beta/models/${cleanModelName}:generateContent`;
  }
  
  // Default to v1 for standard models
  return `v1/models/${cleanModelName}:generateContent`;
}; 