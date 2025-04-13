export async function callAnthropic(prompt: string, model: string, config: Record<string, string>): Promise<string> {
  const { apiKey } = config;
  
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.7
      })
    });

    // First try to get the response as text to see what we're dealing with
    const responseText = await response.text();

    if (!response.ok) {
      let errorMessage = 'Anthropic API error';
      try {
        const error = JSON.parse(responseText);
        errorMessage = error.error?.message || error.message || errorMessage;
      } catch (e) {
        // If we can't parse the error as JSON, use the text
        errorMessage = responseText || response.statusText || errorMessage;
      }
      throw new Error(`Anthropic API error (${response.status}): ${errorMessage}`);
    }

    try {
      const data = JSON.parse(responseText);
      return data.content[0].text;
    } catch (parseError) {
      console.error('Failed to parse Anthropic response:', parseError);
      throw new Error('Invalid response format from Anthropic API');
    }
  } catch (error) {
    console.error('Anthropic provider error:', error);
    throw error;
  }
} 