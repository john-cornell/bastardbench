import { TestSuite } from '../types/testSuite';
import { createAdapter } from './adapterFactory';

export async function runTestSuite(suite: TestSuite, iterations: number): Promise<Record<string, any>> {
  const results: Record<string, any> = {};
  
  for (const adapter of suite.adapters) {
    const llmAdapter = createAdapter(adapter);
    const adapterResults = {
      name: adapter.name,
      type: adapter.type,
      model: adapter.model,
      results: [] as any[]
    };
    
    for (let i = 0; i < iterations; i++) {
      try {
        const response = await llmAdapter.call('Test prompt');
        adapterResults.results.push({
          iteration: i + 1,
          response,
          success: true
        });
      } catch (error) {
        adapterResults.results.push({
          iteration: i + 1,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false
        });
      }
    }
    
    results[adapter.id] = adapterResults;
  }
  
  return results;
} 