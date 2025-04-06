export async function callGoogle(prompt: string, model: string, config: Record<string, string>): Promise<string> {
  const { apiKey } = config;
  const apiPath = config.apiPath || null; // Get API path if available
  
  // Use our proxy server instead of making direct API calls
  // This avoids CORS issues when running in the browser
  const proxyUrl = 'http://localhost:3001/api/google';
  
  try {
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        apiKey,
        prompt,
        model,
        apiPath // Pass API path to proxy
      })
    });
  
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Google API error: ${response.statusText}`);
    }
  
    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error('Error in Google provider:', error);
    throw error;
  }
} 