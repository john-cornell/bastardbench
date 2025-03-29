export class TestRunner {
  constructor(private config: BenchmarkConfig) {}

  async runTest(
    adapter: LLMAdapter,
    testCase: TestCase,
    iteration: number
  ): Promise<TestResult> {
    const startTime = Date.now();
    const response = await adapter.call(testCase.prompt);
    const duration = Date.now() - startTime;

    let passed: boolean;
    if (typeof testCase.expectedResult === 'string') {
      passed = response.toLowerCase().includes(testCase.expectedResult.toLowerCase());
    } else {
      passed = await testCase.expectedResult(response);
    }

    return {
      testCase,
      passed,
      response,
      duration
    };
  }

  async runBenchmark(adapter: LLMAdapter): Promise<BenchmarkResult> {
    const results: TestResult[] = [];
    const categoryScores = new Map<TestCategory, number>();

    for (const category of this.config.categories) {
      const categoryTests = testCases.filter(test => test.category === category);
      let categoryPassed = 0;

      for (const test of categoryTests) {
        for (let i = 0; i < this.config.iterations; i++) {
          const result = await this.runTest(adapter, test, i);
          results.push(result);
          if (result.passed) categoryPassed++;
        }
      }

      const categoryScore = (categoryPassed / (categoryTests.length * this.config.iterations)) * 100;
      categoryScores.set(category, categoryScore);
    }

    const overallScore = Array.from(categoryScores.values()).reduce((a, b) => a + b, 0) / categoryScores.size;

    return {
      adapter,
      results,
      categoryScores,
      overallScore
    };
  }
} 