export async function callAnthropic(prompt: string, model: string, config: Record<string, string>): Promise<string> {
  const { apiKey } = config;
  
  try {
    // Use proxy server to avoid CORS issues
    const proxyUrl = 'http://localhost:3001/api/anthropic';
    
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        apiKey,
        prompt,
        model
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Anthropic API error: ${response.statusText}`);
    }
  
    // Get the response data
    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error('Anthropic provider error:', error);
    throw error;
  }
} 