export abstract class BaseLLMAdapter implements LLMAdapter {
  constructor(
    public id: string,
    public name: string,
    public provider: string
  ) {}

  abstract call(prompt: string): Promise<string>;
} 