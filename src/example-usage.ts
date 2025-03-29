import { OpenAIAdapter } from "./adapters/openai";
import { TestRunner } from "./benchmark/TestRunner";
import { BenchmarkConfig, TestCategory } from "./types/llm";

export async function runBenchmark() {
  const config: BenchmarkConfig = {
    iterations: 5,
    categories: [TestCategory.CRYPTIC, TestCategory.CODE],
    validators: {
      default: new OpenAIAdapter(process.env.OPENAI_API_KEY!)
    }
  };

  const runner = new TestRunner(config);
  
  const adapters = [
    new OpenAIAdapter(process.env.OPENAI_API_KEY!),
    // Add other adapters...
  ];

  for (const adapter of adapters) {
    const results = await runner.runBenchmark(adapter);
    console.log(`Results for ${adapter.name}:`);
    console.log(`Overall Score: ${results.overallScore.toFixed(2)}%`);
    
    for (const [category, score] of results.categoryScores) {
      console.log(`${category}: ${score.toFixed(2)}%`);
    }
  }
}       