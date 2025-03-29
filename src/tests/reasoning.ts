import { TestCase, TestCategory } from '../types/llm';

export const reasoningTests: TestCase[] = [
  {
    id: 'logical-deduction-1',
    name: 'Simple Logical Deduction',
    description: 'Tests basic logical reasoning capabilities',
    category: TestCategory.REASONING,
    prompt: 'If all A are B, and all B are C, is it true that all A are C? Answer with yes or no.',
    expectedResult: 'yes'
  },
  // Add more tests...
]; 