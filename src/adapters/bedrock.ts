import { BaseLLMAdapter } from './base';

export class BedrockAdapter extends BaseLLMAdapter {
  constructor(accessKeyId: string, secretAccessKey: string, region: string, model: string = 'anthropic.claude-v2') {
    super({
      model,
      type: 'bedrock',
      region,
      apiKey: accessKeyId,
      endpoint: secretAccessKey
    });
  }

  async call(prompt: string): Promise<string> {
    try {
      const response = await fetch(`https://bedrock.${this.region}/models/${this.model}/invoke`, {
        method: 'POST',
        headers: {
          'Authorization': `AWS4-HMAC-SHA256 ${this.generateAWS4Signature()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Bedrock API error');
      }

      const data = await response.json();
      return data.content[0].text;
    } catch (error) {
      console.error('Bedrock adapter error:', error);
      throw error;
    }
  }

  private generateAWS4Signature(): string {
    // This is a simplified version. In production, you should use the AWS SDK
    // or a proper AWS4 signature implementation
    const date = new Date().toISOString().split('T')[0];
    const credential = `${this.apiKey}/${date}/${this.region}/bedrock/aws4_request`;
    const signature = this.calculateSignature(this.endpoint as string, date);
    return `AWS4-HMAC-SHA256 Credential=${credential}, Signature=${signature}`;
  }

  private calculateSignature(secretKey: string, date: string): string {
    // This is a placeholder for the actual AWS4 signature calculation
    // In production, use the AWS SDK or implement the full AWS4 signature algorithm
    return Buffer.from(`${secretKey}${date}`, 'utf-8').toString('hex');
  }
} 