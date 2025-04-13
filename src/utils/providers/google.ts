export async function callGoogle(prompt: string, model: string, config: Record<string, string>): Promise<string> {
  const { apiKey } = config;
  const apiPath = config.apiPath || null; // Get API path if available
  
  // Use our proxy server instead of making direct API calls
  // This avoids CORS issues when running in the browser
  const proxyUrl = 'http://localhost:3001/api/google';
  
  try {
    console.log(`[Google Provider] Making request for model: ${model}`);
    
    const requestBody = {
      apiKey,
      prompt,
      model,
      apiPath // Pass API path to proxy
    };
    
    console.log(`[Google Provider] Request body: ${JSON.stringify({ ...requestBody, apiKey: "REDACTED" })}`);
    
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
  
    console.log(`[Google Provider] Response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error(`[Google Provider] Error response:`, errorData);
      throw new Error(errorData.error || `Google API error: ${response.statusText}`);
    }
  
    // Get the response data
    const responseText = await response.text();
    console.log(`[Google Provider] Raw response text (first 200 chars): ${responseText.substring(0, 200)}`);
    
    let data;
    try {
      data = JSON.parse(responseText);
      console.log(`[Google Provider] Parsed response type:`, typeof data.response);
    } catch (error) {
      console.error(`[Google Provider] Failed to parse response as JSON:`, error);
      throw new Error(`Failed to parse response from Google API`);
    }
    
    return data.response;
  } catch (error) {
    console.error('Error in Google provider:', error);
    throw error;
  }
} 