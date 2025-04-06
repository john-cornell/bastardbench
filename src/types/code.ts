import { TestCase, TestCategory } from './llm';

export interface CodeTest extends TestCase {
  prompt: string;
  expectedOutput: string;
  language: string;
}

export const codeTests: CodeTest[] = [
  {
    id: 'code-test-1',
    prompt: 'Write a function that returns the sum of two numbers',
    expectedOutput: 'function add(a, b) { return a + b; }',
    language: 'javascript',
    category: TestCategory.CODE,
    expectedResult: 'function add(a, b) { return a + b; }'
  }
]; 