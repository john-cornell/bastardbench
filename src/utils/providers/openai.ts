export async function callOpenAI(prompt: string, model: string, config: Record<string, string>): Promise<string> {
  const { apiKey } = config;
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    // First try to get the response as text to see what we're dealing with
    const responseText = await response.text();

    if (!response.ok) {
      let errorMessage = 'OpenAI API error';
      try {
        const error = JSON.parse(responseText);
        errorMessage = error.error?.message || error.message || errorMessage;
      } catch (e) {
        // If we can't parse the error as JSON, use the text
        errorMessage = responseText || response.statusText || errorMessage;
      }
      throw new Error(`OpenAI API error (${response.status}): ${errorMessage}`);
    }

    try {
      const data = JSON.parse(responseText);
      return data.choices[0].message.content;
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      throw new Error('Invalid response format from OpenAI API');
    }
  } catch (error) {
    console.error('OpenAI provider error:', error);
    throw error;
  }
} 