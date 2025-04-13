export async function callOllama(prompt: string, model: string, config: Record<string, string>): Promise<string> {
  const { endpoint } = config;
  
  // Ensure endpoint doesn't have trailing slash
  const cleanEndpoint = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
  
  try {
    const response = await fetch(`${cleanEndpoint}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 1000,
        }
      })
    });

    const responseText = await response.text();
    if (!response.ok) {
      let errorMessage = 'Ollama API error';
      try {
        const error = JSON.parse(responseText);
        errorMessage = error.error?.message || error.message || errorMessage;
      } catch (e) {
        // If we can't parse the error as JSON, use the text
        errorMessage = responseText || response.statusText || errorMessage;
      }
      throw new Error(`Ollama API error (${response.status}): ${errorMessage}`);
    }

    // Check if the response starts with a JSON object
    const trimmedText = responseText.trim();
    if (trimmedText.startsWith('{') && trimmedText.endsWith('}')) {
      try {
        const data = JSON.parse(trimmedText);
        
        // Handle different JSON response formats
        if (data.response) {
          return data.response;
        } else if (data.generated_text) {
          return data.generated_text;
        } else if (data.output) {
          return data.output;
        } else if (data.completion) {
          return data.completion;
        } else if (data.text) {
          return data.text;
        } else if (Array.isArray(data) && data.length > 0) {
          // Some Ollama versions return an array of responses
          return data[0].response || data[0].text || data[0].generated_text || JSON.stringify(data[0]);
        }

        // If we can't find a recognized response format, return the raw response
        console.warn('Unrecognized Ollama JSON response format:', data);
        return JSON.stringify(data);
      } catch (parseError) {
        console.warn('Failed to parse Ollama response as JSON:', parseError);
        // If JSON parsing fails, fall through to return the raw text
      }
    }

    // If it's not JSON or JSON parsing failed, return the raw text
    // This handles markdown, conversation, and other text formats
    return responseText;
  } catch (error) {
    console.error('Ollama provider error:', error);
    throw error;
  }
} 