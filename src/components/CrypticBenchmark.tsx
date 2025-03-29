import { useState } from 'react';
import { LLMAdapter, TestResult, BenchmarkResult } from '../types/llm';
import { CrypticTest } from '../types/cryptic';
import { TestRunner } from '../benchmark/TestRunner';
import { BenchmarkConfig, TestCategory } from '../types/llm';

interface CrypticBenchmarkProps {
  adapter: LLMAdapter;
  tests: CrypticTest[];
  iterations?: number;
}

export function CrypticBenchmark({ adapter, tests, iterations = 5 }: CrypticBenchmarkProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<BenchmarkResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRunBenchmark = async () => {
    setIsRunning(true);
    setError(null);

    try {
      const config: BenchmarkConfig = {
        iterations,
        categories: [TestCategory.CRYPTIC],
        validators: {
          default: adapter
        }
      };

      const runner = new TestRunner(config);
      const benchmarkResults = await runner.runBenchmark(adapter);
      setResults(benchmarkResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while running the benchmark');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-secondary-900">Cryptic Benchmark</h3>
          <p className="text-sm text-secondary-500 mt-1">
            Run {iterations} iterations of {tests.length} cryptic tests against {adapter.name}
          </p>
        </div>
        <button
          onClick={handleRunBenchmark}
          disabled={isRunning}
          className={`px-4 py-2 rounded-lg font-medium transition-colors duration-150 ${
            isRunning
              ? 'bg-secondary-100 text-secondary-400 cursor-not-allowed'
              : 'bg-primary-600 text-white hover:bg-primary-700'
          }`}
        >
          {isRunning ? 'Running...' : 'Run Benchmark'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {results && (
        <div className="bg-white rounded-lg shadow-card p-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-secondary-500">Overall Score</h4>
              <p className="mt-1 text-3xl font-bold text-secondary-900">
                {results.overallScore.toFixed(1)}%
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-secondary-500">Category Score</h4>
              <p className="mt-1 text-3xl font-bold text-secondary-900">
                {results.categoryScores.get(TestCategory.CRYPTIC)?.toFixed(1)}%
              </p>
            </div>
          </div>

          <div className="mt-8">
            <h4 className="text-sm font-medium text-secondary-500 mb-4">Detailed Results</h4>
            <div className="space-y-4">
              {results.results.map((result, index) => (
                <div
                  key={`${result.testCase.id}-${index}`}
                  className="flex items-center justify-between p-4 bg-secondary-50 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-secondary-900">{result.testCase.name}</p>
                    <p className="text-sm text-secondary-500">{result.testCase.prompt}</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-secondary-500">{result.duration}ms</span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        result.passed
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {result.passed ? 'Passed' : 'Failed'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 