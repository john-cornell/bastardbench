import { LLMAdapter } from '../types/llm';

export abstract class BaseLLMAdapter implements LLMAdapter {
  protected model: string;
  protected type: string;
  protected apiKey?: string;
  protected endpoint?: string;
  protected region?: string;
  protected projectId?: string;
  protected location?: string;

  constructor(config: {
    model: string;
    type: string;
    apiKey?: string;
    endpoint?: string;
    region?: string;
    projectId?: string;
    location?: string;
  }) {
    this.model = config.model;
    this.type = config.type;
    this.apiKey = config.apiKey;
    this.endpoint = config.endpoint;
    this.region = config.region;
    this.projectId = config.projectId;
    this.location = config.location;
  }

  abstract call(prompt: string): Promise<string>;

  getModel(): string {
    return this.model;
  }

  getType(): string {
    return this.type;
  }

  get name(): string {
    return `${this.type}-${this.model}`;
  }
} 