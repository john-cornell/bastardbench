export async function callAzure(prompt: string, model: string, config: Record<string, string>): Promise<string> {
  const { apiKey, endpoint } = config;
  
  try {
    // Ensure endpoint doesn't have trailing slash
    const cleanEndpoint = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
    
    const response = await fetch(`${cleanEndpoint}/openai/deployments/${model}/chat/completions?api-version=2024-02-15-preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    // First try to get the response as text to see what we're dealing with
    const responseText = await response.text();

    if (!response.ok) {
      let errorMessage = 'Azure API error';
      try {
        const error = JSON.parse(responseText);
        errorMessage = error.error?.message || error.message || errorMessage;
      } catch (e) {
        // If we can't parse the error as JSON, use the text
        errorMessage = responseText || response.statusText || errorMessage;
      }
      throw new Error(`Azure API error (${response.status}): ${errorMessage}`);
    }

    try {
      const data = JSON.parse(responseText);
      return data.choices[0].message.content;
    } catch (parseError) {
      console.error('Failed to parse Azure response:', parseError);
      throw new Error('Invalid response format from Azure API');
    }
  } catch (error) {
    console.error('Azure provider error:', error);
    throw error;
  }
} 