export const callGoogle = async (
  prompt: string,
  model: string,
  config: {
    apiKey: string;
    apiPath?: string;
    apiVersion?: string;
  }
): Promise<string> => {
  const MAX_RETRIES = 10;
  const INITIAL_RETRY_DELAY = 1000; // 1 second
  let retryCount = 0;
  let retryDelay = INITIAL_RETRY_DELAY;

  // Calculate timeout based on prompt length
  const getTimeoutDuration = (promptLength: number) => {
    if (promptLength > 1000) return 480000; // 8 minutes for large prompts
    if (promptLength > 500) return 360000;  // 6 minutes for medium prompts
    return 240000; // 4 minutes for small prompts
  };

  while (retryCount < MAX_RETRIES) {
    // Create fresh connection for each attempt
    const controller = new AbortController();
    const timeoutDuration = getTimeoutDuration(prompt.length);
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.log(`Request timed out after ${timeoutDuration/1000} seconds (Attempt ${retryCount + 1}/${MAX_RETRIES})
        - Model: ${model}
        - Prompt length: ${prompt.length}
        - Timeout duration: ${timeoutDuration/1000}s
      `);
    }, timeoutDuration);

    try {
      // Use proxy server to avoid CORS issues
      const proxyUrl = 'http://localhost:3001/api/google';
      
      // Generate API path if not provided
      const modelApiPath = config.apiPath || getApiPathForModel(model, config.apiVersion);
      
      console.log(`Google API request (Attempt ${retryCount + 1}/${MAX_RETRIES}):
        - Model: ${model}
        - API Path: ${modelApiPath}
        - Prompt length: ${prompt.length}
        - API Key length: ${config.apiKey ? config.apiKey.length : 0}
        - Timeout duration: ${timeoutDuration/1000}s
        - Fresh connection: true
      `);

      // Create fresh fetch options for each attempt
      const fetchOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Connection': 'close', // Ensure connection is closed after request
        },
        body: JSON.stringify({
          apiKey: config.apiKey,
          prompt,
          model,
          apiPath: modelApiPath
        }),
        signal: controller.signal
      };

      const response = await fetch(proxyUrl, fetchOptions);

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Google API error response: ${errorText}`);
        
        try {
          const error = JSON.parse(errorText);
          // Check for socket hang-up or connection errors
          if (error.error?.includes('socket hang up') || error.error?.includes('ECONNRESET')) {
            if (retryCount < MAX_RETRIES - 1) {
              console.log(`Socket error detected, retrying in ${retryDelay}ms... (Fresh connection will be used)`);
              await new Promise(resolve => setTimeout(resolve, retryDelay));
              retryDelay *= 2; // Exponential backoff
              retryCount++;
              continue;
            }
          }
          throw new Error(error.error || `Google API error: ${response.status} ${response.statusText}`);
        } catch (parseError) {
          throw new Error(`Google API error: ${response.status} ${response.statusText} - ${errorText}`);
        }
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Google API error:', error);
      
      // Check for network or socket errors
      if (
        error instanceof Error && (
          error.name === 'AbortError' || 
          error.message?.includes('socket') || 
          error.message?.includes('network')
        )
      ) {
        if (retryCount < MAX_RETRIES - 1) {
          console.log(`Network error detected, retrying in ${retryDelay}ms... (Fresh connection will be used)`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          retryDelay *= 2; // Exponential backoff
          retryCount++;
          continue;
        }
      }
      
      throw error;
    }
  }

  throw new Error('Max retries exceeded');
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