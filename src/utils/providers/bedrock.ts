export async function callBedrock(prompt: string, model: string, config: Record<string, string>): Promise<string> {
  const { accessKey, secretKey, region } = config;
  
  try {
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
        max_tokens: 1000,
        temperature: 0.7
      })
    });

    // First try to get the response as text to see what we're dealing with
    const responseText = await response.text();

    if (!response.ok) {
      let errorMessage = 'Bedrock API error';
      try {
        const error = JSON.parse(responseText);
        errorMessage = error.error?.message || error.message || errorMessage;
      } catch (e) {
        // If we can't parse the error as JSON, use the text
        errorMessage = responseText || response.statusText || errorMessage;
      }
      throw new Error(`Bedrock API error (${response.status}): ${errorMessage}`);
    }

    try {
      const data = JSON.parse(responseText);
      
      // Handle different response formats
      if (data.completion) {
        return data.completion;
      } else if (data.generated_text) {
        return data.generated_text;
      } else if (data.output) {
        return data.output;
      } else if (data.text) {
        return data.text;
      } else if (data.response) {
        return data.response;
      } else if (Array.isArray(data) && data.length > 0) {
        return data[0].completion || data[0].text || data[0].generated_text || JSON.stringify(data[0]);
      }

      // If we can't find a recognized response format, return the raw response
      console.warn('Unrecognized Bedrock response format:', data);
      return JSON.stringify(data);
    } catch (parseError) {
      console.error('Failed to parse Bedrock response:', parseError);
      throw new Error('Invalid response format from Bedrock API');
    }
  } catch (error) {
    console.error('Bedrock provider error:', error);
    throw error;
  }
} 