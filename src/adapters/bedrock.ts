import { BaseLLMAdapter } from './base';

export class BedrockAdapter extends BaseLLMAdapter {
  private accessKey: string;
  private secretKey: string;
  private region: string;
  private model: string;

  constructor(accessKey: string, secretKey: string, region: string, model: string = 'anthropic.claude-3-opus-20240229-v1:0') {
    super('bedrock', 'AWS Bedrock Claude', 'AWS');
    this.accessKey = accessKey;
    this.secretKey = secretKey;
    this.region = region;
    this.model = model;
  }

  async call(prompt: string): Promise<string> {
    try {
      const response = await fetch(`https://bedrock.${this.region}.amazonaws.com/models/${this.model}/invoke`, {
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
    return 'AWS4-HMAC-SHA256 Credential=' + this.accessKey + '/' + new Date().toISOString().split('T')[0] + '/' + this.region + '/bedrock/aws4_request';
  }
} 