export async function callBedrock(prompt: string, model: string, config: Record<string, string>): Promise<string> {
  const { accessKey, secretKey, region } = config;
  const response = await fetch(`https://bedrock-runtime.${region}.amazonaws.com/model/${model}/invoke`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Amz-Content-Sha256': 'UNSIGNED-PAYLOAD',
      'X-Amz-Date': new Date().toISOString().replace(/[:-]|\.\d{3}/g, ''),
      'Authorization': `AWS4-HMAC-SHA256 Credential=${accessKey}/${region}/bedrock/aws4_request`
    },
    body: JSON.stringify({
      prompt,
      max_tokens: 1024,
      temperature: 0
    })
  });

  if (!response.ok) {
    throw new Error(`Bedrock API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.completion;
} 