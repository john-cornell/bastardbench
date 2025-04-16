export interface LLMAdapter {
  call(prompt: string): Promise<string>;
  getModel(): string;
  getType(): string;
  readonly name: string;
}

export interface TestCase {
  id: string;
  prompt: string;
  expectedResult: string | ((response: string) => Promise<boolean>);
  category: TestCategory;
  name?: string;
  description?: string;
}

export interface TestResult {
  testCase: TestCase;
  passed: boolean;
  response: string;
  duration: number;
}

export interface BenchmarkResult {
  adapter: LLMAdapter;
  results: TestResult[];
  categoryScores: Map<TestCategory, number>;
  overallScore: number;
}

export enum TestCategory {
  CRYPTIC = 'cryptic',
  CODE = 'code',
  REASONING = 'reasoning'
}

export interface BenchmarkConfig {
  iterations: number;
  categories: TestCategory[];
  validators: {
    [key: string]: LLMAdapter;
  };
} 