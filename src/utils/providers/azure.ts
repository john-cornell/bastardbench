export async function callAzure(prompt: string, model: string, config: Record<string, string>): Promise<string> {
  const { apiKey, endpoint } = config;
  const response = await fetch(`${endpoint}/openai/deployments/${model}/chat/completions?api-version=2024-02-15-preview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0
    })
  });

  if (!response.ok) {
    throw new Error(`Azure API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
} 