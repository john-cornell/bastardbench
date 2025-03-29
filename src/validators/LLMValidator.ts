import { LLMAdapter } from "../types/llm";

export class LLMValidator {
  constructor(private validator: LLMAdapter) {}

  async validate(prompt: string, response: string, criteria: string): Promise<boolean> {
    const validationPrompt = `
      Original prompt: "${prompt}"
      Response: "${response}"
      Evaluation criteria: "${criteria}"
      
      Does this response meet the criteria? Answer with only 'yes' or 'no'.
    `;

    const validation = await this.validator.call(validationPrompt);
    return validation.toLowerCase().trim() === 'yes';
  }
} 