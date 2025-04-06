import React, { useState, useEffect } from 'react';
import { useTestSuites } from '../hooks/useTestSuites';
import { TestCategory, LLMAdapter } from '../types/llm';
import { TestSuite, AVAILABLE_MODELS } from '../types/testSuite';
import { discoverAvailableModels } from '../utils/modelDiscovery';
import { loadConfig } from '../utils/storage';
import { v4 as uuidv4 } from 'uuid';
import { crypticTests, CrypticTest } from '../types/cryptic';
import { codeTests, CodeTest } from '../types/code';
import { TestRunner } from '../benchmark/TestRunner';
import { createAdapter } from '../utils/adapterFactory';

const stripMarkdown = (text: string) => {
  return text.replace(/```[a-z]*\n/g, '').replace(/```/g, '');
};

// Add rate limit tracking
interface RateLimitInfo {
  lastRequestTime: number;
  requestCount: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitInfo>();

const getRateLimitInfo = (adapterId: string): RateLimitInfo => {
  if (!rateLimitMap.has(adapterId)) {
    rateLimitMap.set(adapterId, {
      lastRequestTime: 0,
      requestCount: 0,
      resetTime: 0
    });
  }
  return rateLimitMap.get(adapterId)!;
};

const updateRateLimitInfo = (adapterId: string, isRateLimited: boolean, resetTime?: number) => {
  const info = getRateLimitInfo(adapterId);
  const now = Date.now();
  
  // Reset counter if we're past the reset time
  if (now > info.resetTime) {
    info.requestCount = 0;
  }
  
  info.lastRequestTime = now;
  info.requestCount++;
  
  if (isRateLimited && resetTime) {
    info.resetTime = resetTime;
  }
};

const calculateBackoff = (adapterId: string): number => {
  const info = getRateLimitInfo(adapterId);
  const now = Date.now();
  
  // If we're rate limited, wait until reset time
  if (now < info.resetTime) {
    return info.resetTime - now;
  }
  
  // Increase base delay for Google API to avoid rate limits
  const baseDelay = adapterId.includes('google') 
    ? Math.min(2000 * Math.pow(2, info.requestCount), 60000) // More conservative for Google: 2s base, up to 60s
    : Math.min(1000 * Math.pow(1.5, info.requestCount), 30000); // Original for others
  
  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 1000;
  
  return baseDelay + jitter;
};

const CRYPTIC_SYSTEM_PROMPT = `You are an expert at solving cryptic crossword clues. 

Analyze the clue and provide your response in valid JSON format. Your response must be a single-line JSON object with this exact structure:

{
  "scratchpad": "1. Definition: [identify the definition part] | 2. Indicators: [list wordplay indicators] | 3. Components: [list clue components] | 4. Analysis: [analyze wordplay devices] | 5. Steps: [explain solution steps] | 6. Misdirection: [explain any clever surface reading] | 7. Verification: [confirm definition and wordplay match]",
  "answer": "single word or phrase answer"
}

Use the pipe symbol (|) to separate sections in the scratchpad instead of line breaks. Keep all content in a single line.

Remember that cryptic clues typically have:
- A definition (usually at start or end)
- Wordplay (anagrams, hidden words, containers, etc.)
- Fair misdirection
- Surface reading that may mislead

Think through each step carefully before providing your answer.

IMPORTANT: Ensure your response is valid JSON with NO line breaks in the strings. Use | for separation. The answer will be compared case-insensitively.`;

type ProviderType = keyof typeof AVAILABLE_MODELS;

interface TestSuiteManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TestProgress {
  currentAdapter: string;
  currentCategory: string;
  currentTest: string;
  completedTests: number;
  totalTests: number;
  currentIteration: number;
  totalIterations: number;
}

interface AdapterTestStatus {
  isLoading: boolean;
  error?: string;
  success?: boolean;
}

type TestOutput = {
  prompt: string;
  rawResponse: string;
  parsedResponse?: {
    scratchpad: string;
    answer: string;
  };
  error?: string;
};

const normalizeAnswer = (text: string): string => {
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
};

const getAvailableModels = (provider: ProviderType) => {
  return AVAILABLE_MODELS[provider] || [];
};

export function TestSuiteManager({ isOpen, onClose }: TestSuiteManagerProps) {
  const {
    testSuites,
    activeSuite,
    setActiveSuite,
    createTestSuite,
    updateTestSuite,
    deleteTestSuite,
    addAdapter,
    removeAdapter,
    updateAdapter,
  } = useTestSuites();

  const [config, setConfig] = useState(() => loadConfig());
  const [newSuiteName, setNewSuiteName] = useState('');
  const [newSuiteDescription, setNewSuiteDescription] = useState('');
  const [newAdapterType, setNewAdapterType] = useState<TestSuite['adapters'][0]['type']>('openai');
  const [newAdapterName, setNewAdapterName] = useState('');
  const [newAdapterModel, setNewAdapterModel] = useState('');
  const [newAdapterConfig, setNewAdapterConfig] = useState<Record<string, string>>({});
  const [discoveredModels, setDiscoveredModels] = useState<Record<string, any>>({});
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [iterations, setIterations] = useState<number>(5);
  const [activeTab, setActiveTab] = useState<'suites' | 'tests'>('suites');
  const [testProgress, setTestProgress] = useState<TestProgress | null>(null);
  const [adapterTestStatus, setAdapterTestStatus] = useState<Record<string, AdapterTestStatus>>({});

  // Reset state when modal is opened
  useEffect(() => {
    if (isOpen) {
      setNewSuiteName('');
      setNewSuiteDescription('');
      setNewAdapterName('');
      setNewAdapterModel('');
      setNewAdapterConfig({});
      setDiscoveryError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Load API keys from config when adapter type changes
  useEffect(() => {
    if (newAdapterType) {
      // Set the initial config based on the adapter type
      const initialConfig: Record<string, string> = {};
      
      // Use stored API keys from config
      switch(newAdapterType) {
        case 'openai':
          initialConfig.apiKey = config.openAIKey || '';
          break;
        case 'anthropic':
          initialConfig.apiKey = config.anthropicKey || '';
          break;
        case 'azure':
          initialConfig.apiKey = config.azureKey || '';
          initialConfig.endpoint = config.azureEndpoint || '';
          break;
        case 'bedrock':
          initialConfig.accessKey = config.bedrockKey || '';
          initialConfig.secretKey = ''; // Secret key needs to be entered by user
          initialConfig.region = config.bedrockRegion || '';
          break;
        case 'ollama':
          initialConfig.endpoint = config.ollamaEndpoint || '';
          break;
        case 'google':
          initialConfig.apiKey = config.googleKey || '';
          break;
      }
      
      setNewAdapterConfig(initialConfig);
      
      // First set the available models from the static list
      setDiscoveredModels(prev => ({
        ...prev,
        [newAdapterType]: getAvailableModels(newAdapterType as ProviderType)
      }));

      // Automatically attempt to discover models if we have credentials
      const hasCredentials = 
        (initialConfig.apiKey) || 
        (newAdapterType === 'ollama' && initialConfig.endpoint) ||
        (newAdapterType === 'bedrock' && initialConfig.accessKey && initialConfig.region);
        
      if (hasCredentials) {
        discoverModelsForType(newAdapterType, initialConfig);
      }
    }
  }, [newAdapterType]);

  // Discover models for active suite
  useEffect(() => {
    if (activeSuite?.adapters.length) {
      discoverModels();
    }
  }, [activeSuite]);

  const discoverModelsForType = async (
    type: TestSuite['adapters'][0]['type'], 
    configOverride?: Record<string, string>
  ) => {
    setIsDiscovering(true);
    setDiscoveryError(null);
    
    // Clear previous models for this type
    setDiscoveredModels(prev => ({
      ...prev,
      [type]: []
    }));
    
    try {
      // Use provided config override or the current new adapter config
      const adapterConfig = configOverride || newAdapterConfig;
      
      // Create a temporary adapter with the current config
      const tempAdapter = {
        id: 'temp',
        name: 'temp',
        type,
        model: '',
        config: {
          apiKey: adapterConfig.apiKey || '',
          endpoint: adapterConfig.endpoint || '',
          accessKey: adapterConfig.accessKey || '',
          secretKey: adapterConfig.secretKey || '',
          region: adapterConfig.region || '',
        },
      };

      console.log('[Model Discovery] Attempting discovery for:', type);
      console.log('[Model Discovery] Using stored credentials from config');
      
      const models = await discoverAvailableModels([tempAdapter]);
      
      if (models[type] && models[type].length > 0) {
        console.log(`[TestSuiteManager] Setting ${models[type].length} discovered models for ${type}`);
        setDiscoveredModels(prev => ({
          ...prev,
          [type]: models[type] || []
        }));
      } else {
        setDiscoveryError(`No models found for ${type}. Please check your credentials and try again.`);
        // Don't set fallback models unless specifically requested by the user
      }
    } catch (error) {
      console.error(`[TestSuiteManager] Failed to discover models for ${type}:`, error);
      setDiscoveryError(`Error discovering models: ${error instanceof Error ? error.message : String(error)}`);
      // Don't set fallback models unless specifically requested by the user
    } finally {
      setIsDiscovering(false);
    }
  };

  const discoverModels = async () => {
    if (!activeSuite) return;
    setIsDiscovering(true);
    setDiscoveryError(null);
    try {
      const models = await discoverAvailableModels(activeSuite.adapters);
      setDiscoveredModels(models);
    } catch (error) {
      console.error('Failed to discover models:', error);
      setDiscoveryError('Failed to discover models');
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleCreateSuite = () => {
    if (!newSuiteName) return;
    createTestSuite(newSuiteName, newSuiteDescription);
    setNewSuiteName('');
    setNewSuiteDescription('');
  };

  const handleAddAdapter = () => {
    if (!activeSuite || !newAdapterName || !newAdapterModel) return;
    
    // Use the API keys from the global configuration
    const adapterConfig: Record<string, string> = {};
    
    switch(newAdapterType) {
      case 'openai':
        adapterConfig.apiKey = config.openAIKey || '';
        break;
      case 'anthropic':
        adapterConfig.apiKey = config.anthropicKey || '';
        break;
      case 'azure':
        adapterConfig.apiKey = config.azureKey || '';
        adapterConfig.endpoint = config.azureEndpoint || '';
        break;
      case 'bedrock':
        adapterConfig.accessKey = config.bedrockKey || '';
        adapterConfig.secretKey = newAdapterConfig.secretKey || ''; // Secret key needs to be entered by user
        adapterConfig.region = config.bedrockRegion || '';
        break;
      case 'ollama':
        adapterConfig.endpoint = config.ollamaEndpoint || '';
        break;
      case 'google':
        adapterConfig.apiKey = config.googleKey || '';
        break;
    }
    
    const adapter = {
      id: uuidv4(),
      name: newAdapterName,
      type: newAdapterType,
      model: newAdapterModel,
      config: adapterConfig,
    };
    
    addAdapter(activeSuite.id, adapter);
    setNewAdapterName('');
    setNewAdapterModel('');
    setNewAdapterConfig({});
    discoverModels();
  };

  const handleUpdateCategories = (categories: TestCategory[]) => {
    if (!activeSuite) return;
    updateTestSuite(activeSuite.id, { categories });
  };

  const handleUpdateSelectedTests = (testIds: string[]) => {
    if (!activeSuite) return;
    updateTestSuite(activeSuite.id, { selectedTests: testIds });
  };

  const handleUpdateAdapterConfig = (adapterId: string, key: string, value: string) => {
    if (!activeSuite) return;
    const adapter = activeSuite.adapters.find(a => a.id === adapterId);
    if (!adapter) return;

    updateAdapter(activeSuite.id, adapterId, {
      config: { ...adapter.config, [key]: value }
    });
  };

  // Add this new function to handle config updates for new adapters
  const handleNewAdapterConfigChange = (key: string, value: string) => {
    setNewAdapterConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleDiscoverModels = async () => {
    await discoverModels();
  };

  // Add a function to use fallback models when API discovery fails
  const useFallbackModels = (type: TestSuite['adapters'][0]['type']) => {
    console.log(`[TestSuiteManager] Using fallback models for ${type}`);
    setDiscoveredModels(prev => ({
      ...prev,
      [type]: getAvailableModels(type as ProviderType)
    }));
    setDiscoveryError(null);
  };

  const testAdapterConnection = async (adapter: TestSuite['adapters'][0]) => {
    setAdapterTestStatus(prev => ({
      ...prev,
      [adapter.id]: { isLoading: true }
    }));

    try {
      const llmAdapter = createAdapter(adapter);
      const testPrompt = "Respond with 'OK' if you can read this message.";
      const response = await llmAdapter.call(testPrompt);
      
      const success = response.toLowerCase().includes('ok');
      setAdapterTestStatus(prev => ({
        ...prev,
        [adapter.id]: { 
          isLoading: false, 
          success,
          error: success ? undefined : 'Unexpected response from model'
        }
      }));
    } catch (error) {
      setAdapterTestStatus(prev => ({
        ...prev,
        [adapter.id]: { 
          isLoading: false, 
          success: false,
          error: error instanceof Error ? error.message : 'Failed to connect to the model'
        }
      }));
    }
  };

  // Render credential fields based on adapter type
  const renderCredentialFields = () => {
    switch(newAdapterType) {
      case 'openai':
        return (
          <div className="flex flex-col gap-2 mt-2">
            <div className="text-sm text-gray-600">
              Using OpenAI key from settings: {config.openAIKey ? '●●●●●●●●●●' : 'Not set'}
            </div>
            {!config.openAIKey && (
              <div className="text-sm text-red-600">
                Please set your OpenAI API key in the settings first.
              </div>
            )}
          </div>
        );
      case 'anthropic':
        return (
          <div className="flex flex-col gap-2 mt-2">
            <div className="text-sm text-gray-600">
              Using Anthropic key from settings: {config.anthropicKey ? '●●●●●●●●●●' : 'Not set'}
            </div>
            {!config.anthropicKey && (
              <div className="text-sm text-red-600">
                Please set your Anthropic API key in the settings first.
              </div>
            )}
          </div>
        );
      case 'azure':
        return (
          <div className="flex flex-col gap-2 mt-2">
            <div className="text-sm text-gray-600">
              Using Azure key from settings: {config.azureKey ? '●●●●●●●●●●' : 'Not set'}
            </div>
            <div className="text-sm text-gray-600">
              Using Azure endpoint from settings: {config.azureEndpoint || 'Not set'}
            </div>
            {(!config.azureKey || !config.azureEndpoint) && (
              <div className="text-sm text-red-600">
                Please set your Azure API key and endpoint in the settings first.
              </div>
            )}
          </div>
        );
      case 'bedrock':
        return (
          <div className="flex flex-col gap-2 mt-2">
            <div className="text-sm text-gray-600">
              Using Bedrock key from settings: {config.bedrockKey ? '●●●●●●●●●●' : 'Not set'}
            </div>
            <div className="text-sm text-gray-600">
              Using Bedrock region from settings: {config.bedrockRegion || 'Not set'}
            </div>
            {(!config.bedrockKey || !config.bedrockRegion) && (
              <div className="text-sm text-red-600">
                Please set your Bedrock key and region in the settings first.
              </div>
            )}
            <div className="mt-2">
              <label className="block text-sm font-medium text-gray-700">Secret Key</label>
              <input
                type="password"
                value={newAdapterConfig.secretKey || ''}
                onChange={(e) => handleNewAdapterConfigChange('secretKey', e.target.value)}
                placeholder="AWS Secret Key"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>
          </div>
        );
      case 'ollama':
        return (
          <div className="flex flex-col gap-2 mt-2">
            <div className="text-sm text-gray-600">
              Using Ollama endpoint from settings: {config.ollamaEndpoint || 'Not set'}
            </div>
            {!config.ollamaEndpoint && (
              <div className="text-sm text-red-600">
                Please set your Ollama endpoint in the settings first.
              </div>
            )}
          </div>
        );
      case 'google':
        return (
          <div className="flex flex-col gap-2 mt-2">
            <div className="text-sm text-gray-600">
              Using Google key from settings: {config.googleKey ? '●●●●●●●●●●' : 'Not set'}
            </div>
            {!config.googleKey && (
              <div className="text-sm text-red-600">
                Please set your Google API key in the settings first.
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  const handleRunTests = async () => {
    if (!activeSuite || !activeSuite.adapters.length) return;
    
    if (activeSuite.categories.length === 0) {
      console.error('No test categories selected');
      return;
    }

    console.log('%cStarting test execution...', 'color: blue; font-weight: bold');
    setIsRunningTests(true);
    setTestResults({});
    setTestProgress(null);

    // Clear rate limit tracking at the start of a new test run
    rateLimitMap.clear();

    try {
      const results: Record<string, any> = {};

      // Calculate total tests
      const totalTests = activeSuite.adapters.length * 
        activeSuite.categories.reduce((sum, category) => {
          const testCount = category === TestCategory.CRYPTIC ? crypticTests.length : codeTests.length;
          console.log(`Category ${category} has ${testCount} tests`);
          return sum + testCount;
        }, 0) * iterations;

      console.log(`Total tests to run: ${totalTests}`);
      let completedTests = 0;

      for (const adapterConfig of activeSuite.adapters) {
        console.log(`\n%cTesting Adapter: ${adapterConfig.name}`, 'color: purple; font-weight: bold');
        console.log('Type:', adapterConfig.type);
        console.log('Model:', adapterConfig.model);
        
        const adapter = createAdapter(adapterConfig);
        
        results[adapterConfig.id] = {
          name: adapterConfig.name,
          type: adapterConfig.type,
          model: adapterConfig.model,
          results: [],
          outputs: [] as TestOutput[]
        };

        for (const category of activeSuite.categories) {
          console.log(`\n%cRunning ${category} tests for ${adapterConfig.name}`, 'color: blue; font-weight: bold');
          
          const config = {
            iterations,
            categories: [category],
            validators: {
              default: adapter
            }
          };

          const runner = new TestRunner(config);
          const testsToRun = (category === TestCategory.CRYPTIC ? crypticTests : codeTests) as (CrypticTest | CodeTest)[];

          console.log(`Starting ${testsToRun.length} tests with ${iterations} iterations each`);
          
          setTestProgress({
            currentAdapter: adapterConfig.name,
            currentCategory: category,
            currentTest: '',
            completedTests: 0,
            totalTests,
            currentIteration: 0,
            totalIterations: iterations
          });

          switch (category) {
            case TestCategory.CRYPTIC:
            case TestCategory.CODE:
              for (let i = 0; i < iterations; i++) {
                console.log(`\n%cIteration ${i + 1}/${iterations}`, 'color: purple');
                
                for (const test of testsToRun) {
                  console.group(`\n%cTest: ${test.prompt}`, 'color: blue');
                  const expectedAnswer = test.expectedResult;
                  console.log('%cExpected answer:', 'color: orange', expectedAnswer);
                  
                  setTestProgress(prev => ({
                    ...prev!,
                    currentTest: test.prompt,
                    currentIteration: i + 1,
                    completedTests: (prev?.completedTests || 0) + 1
                  }));

                  const output = await callWithRetry(adapter, test.prompt, category);
                  results[adapterConfig.id].outputs.push(output);

                  // Compare normalized answers
                  const normalizedExpected = normalizeAnswer(expectedAnswer.toString());
                  const normalizedResponse = output.parsedResponse?.answer ? normalizeAnswer(output.parsedResponse.answer) : '';
                  const passed = normalizedExpected === normalizedResponse;

                  const result = {
                    ...await runner.runTest(adapter, test, i),
                    passed // Override the passed value with our normalized comparison
                  };

                  console.log('%cTest result:', 'color: ' + (result.passed ? 'green' : 'red'), {
                    passed: result.passed,
                    duration: result.duration + 'ms',
                    response: result.response,
                    expected: expectedAnswer,
                    normalizedResponse,
                    normalizedExpected
                  });
                  console.groupEnd();

                  // Update results in real-time
                  const currentResults = results[adapterConfig.id].results;
                  const categoryResult = currentResults.find((r: any) => r.category === category);
                  
                  if (categoryResult) {
                    categoryResult.results.push(result);
                  } else {
                    currentResults.push({
                      category,
                      results: [result],
                      categoryScores: new Map([[category, 0]]),
                      overallScore: 0
                    });
                  }

                  // Update scores
                  const categoryResults = currentResults.find((r: any) => r.category === category);
                  const passedTests = categoryResults.results.filter((r: any) => r.passed).length;
                  const totalTestsInCategory = categoryResults.results.length;
                  const score = (passedTests / totalTestsInCategory) * 100;
                  
                  categoryResults.categoryScores.set(category, score);
                  categoryResults.overallScore = score;

                  // Force a re-render with new results
                  setTestResults({ ...results });
                }
              }
              break;
            default:
              console.log(`Unknown category: ${category}`);
              continue;
          }
        }
      }

      console.log('\n%cAll tests completed. Final results:', 'color: blue; font-weight: bold', results);
      setTestResults(results);
    } catch (error) {
      console.error('%cError running tests:', 'color: red', error);
      setTestResults({
        error: error instanceof Error ? error.message : 'An error occurred while running tests'
      });
    } finally {
      setIsRunningTests(false);
      setTestProgress(null);
    }
  };

  const callWithRetry = async (adapter: any, prompt: string, category: TestCategory, maxRetries = 3): Promise<TestOutput> => {
    let retryCount = 0;
    let lastError: Error | null = null;
    const adapterId = (adapter as any).id || 'unknown';

    while (retryCount < maxRetries) {
      try {
        console.log(`\n%cAttempt ${retryCount + 1}/${maxRetries}`, 'color: blue');
        
        // Calculate and apply backoff
        const backoff = calculateBackoff(adapterId);
        if (backoff > 0) {
          console.log(`%cWaiting ${Math.round(backoff)}ms before request...`, 'color: orange');
          await new Promise(resolve => setTimeout(resolve, backoff));
        }

        const fullPrompt = `${CRYPTIC_SYSTEM_PROMPT}\n\nClue: ${prompt}`;
        console.log('%cSending prompt:', 'color: blue', fullPrompt);
        
        const response = await adapter.call(fullPrompt);
        console.log('%cRaw response received:', 'color: green', response);

        // Update rate limit info on success
        updateRateLimitInfo(adapterId, false);

        const cleanResponse = stripMarkdown(response)
          .replace(/\n/g, ' ')
          .replace(/\r/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        console.log('\n%cCleaned response:', 'color: green', cleanResponse);
        
        try {
          const parsedResponse = JSON.parse(cleanResponse);
          // Normalize the answer
          parsedResponse.answer = normalizeAnswer(parsedResponse.answer);
          console.log('%cParsed response:', 'color: green', {
            scratchpad: parsedResponse.scratchpad,
            answer: parsedResponse.answer
          });
          return {
            prompt: fullPrompt,
            rawResponse: cleanResponse,
            parsedResponse
          };
        } catch (parseError) {
          console.warn('%cFailed to parse JSON response:', 'color: orange', parseError);
          // Try to clean the response further if parsing failed
          const cleanerResponse = cleanResponse
            .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
          try {
            const parsedResponse = JSON.parse(cleanerResponse);
            // Normalize the answer
            parsedResponse.answer = normalizeAnswer(parsedResponse.answer);
            console.log('%cParsed response (after additional cleaning):', 'color: green', parsedResponse);
            return {
              prompt: fullPrompt,
              rawResponse: cleanerResponse,
              parsedResponse
            };
          } catch (secondError: unknown) {
            const errorMessage = secondError instanceof Error ? secondError.message : String(secondError);
            throw new Error(`Failed to parse JSON response after cleaning: ${errorMessage}`);
          }
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`%cAttempt ${retryCount + 1} failed:`, 'color: red', lastError);
        
        // Check if we should retry based on error type
        const isRateLimit = error instanceof Error && (
          error.message.includes('rate limit') ||
          error.message.includes('429') ||
          error.message.includes('too many requests') ||
          error.message.toLowerCase().includes('google api error') // Add specific check for Google API errors
        );
        
        if (isRateLimit) {
          // For Google API, use longer reset times
          const resetTime = adapterId.includes('google')
            ? Date.now() + 120000 // 2 minutes for Google
            : Date.now() + 60000; // 1 minute for others
          updateRateLimitInfo(adapterId, true, resetTime);
          console.log(`%cRate limit hit for ${adapterId}, will retry after ${new Date(resetTime).toLocaleTimeString()}`, 'color: orange');
          retryCount++; // Increment retry count for rate limits
          continue; // Skip the shouldRetry check and continue with retry
        }
        
        const shouldRetry = 
          error instanceof Error && (
            error.message.includes('timeout') ||
            error.message.includes('network') ||
            error.message.includes('connection') ||
            error.message.includes('503')
          );
        
        if (!shouldRetry) {
          console.log('%cError is not retryable, giving up', 'color: red');
          break;
        }
        
        retryCount++;
        if (retryCount === maxRetries) {
          console.log('%cMax retries reached, giving up', 'color: red');
          break;
        }
      }
    }

    return {
      prompt,
      rawResponse: '',
      error: `API Error after ${retryCount} attempts: ${lastError?.message || 'Unknown error'}`
    };
  };

  const renderProgress = () => {
    if (!testProgress) return null;

    const progress = (testProgress.completedTests / (testProgress.totalTests)) * 100;

    return (
      <div className="mb-8 p-4 bg-white border border-gray-200 rounded-lg">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-medium text-gray-900">Test Progress</h4>
            <span className="text-sm text-gray-500">
              {testProgress.completedTests} / {testProgress.totalTests} tests completed
            </span>
          </div>
          
          <div className="space-y-2">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            
            <div className="text-sm text-gray-600">
              <p>Testing: {testProgress.currentAdapter}</p>
              <p>Category: {testProgress.currentCategory}</p>
              <p>Iteration: {testProgress.currentIteration} / {testProgress.totalIterations}</p>
              <p className="mt-2 text-xs italic">{testProgress.currentTest}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTestResults = () => {
    if (testResults.error) {
      return (
        <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{testResults.error}</p>
        </div>
      );
    }

    if (!Object.keys(testResults).length) return null;

    return (
      <div className="mt-8 space-y-6">
        <h3 className="text-lg font-medium text-gray-900">Test Results</h3>
        {Object.entries(testResults).map(([adapterId, data]: [string, any]) => (
          <div key={adapterId} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="mb-4">
              <h4 className="font-medium text-gray-900">{data.name}</h4>
              <p className="text-sm text-gray-500">
                {data.type} - {data.model}
              </p>
            </div>
            
            {/* Test Outputs */}
            {data.outputs?.length > 0 && (
              <div className="mb-4 space-y-4">
                <h5 className="font-medium text-gray-700">Test Outputs</h5>
                {data.outputs.map((output: TestOutput, index: number) => (
                  <div key={index} className="border border-gray-100 rounded p-3 bg-gray-50">
                    <p className="font-medium text-sm">Prompt: {output.prompt}</p>
                    {output.error ? (
                      <p className="text-red-600 text-sm mt-2">{output.error}</p>
                    ) : (
                      <>
                        <div className="mt-2 text-sm">
                          <p className="text-gray-600">Scratchpad:</p>
                          <pre className="mt-1 whitespace-pre-wrap text-gray-800 bg-gray-100 p-2 rounded">
                            {output.parsedResponse?.scratchpad || 'No scratchpad available'}
                          </pre>
                        </div>
                        <div className="mt-2 text-sm">
                          <p className="text-gray-600">Answer:</p>
                          <pre className="mt-1 whitespace-pre-wrap text-gray-800 bg-gray-100 p-2 rounded">
                            {output.parsedResponse?.answer || output.rawResponse}
                          </pre>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Existing Results Display */}
            {data.results.map((result: any, index: number) => (
              <div key={index} className="mt-4">
                <h5 className="font-medium text-gray-700">
                  {result.category.charAt(0).toUpperCase() + result.category.slice(1)} Tests
                </h5>
                <div className="mt-2 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Overall Score</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {result.overallScore.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Category Score</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {result.categoryScores.get(result.category)?.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-900">Test Suite Manager</h2>
            <div className="flex border border-gray-200 rounded-lg">
              <button
                onClick={() => setActiveTab('suites')}
                className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
                  activeTab === 'suites'
                    ? 'bg-primary-100 text-primary-800'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Manage Suites
              </button>
              <button
                onClick={() => setActiveTab('tests')}
                className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
                  activeTab === 'tests'
                    ? 'bg-primary-100 text-primary-800'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
                disabled={!activeSuite}
              >
                Run Tests
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-150"
            aria-label="Close"
          >
            <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'suites' ? (
            <>
              {/* Test Suites List */}
              <div className="mb-8">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Test Suites</h3>
                <div className="space-y-2">
                  {testSuites.map(suite => (
                    <div
                      key={suite.id}
                      className={`p-4 rounded-lg border ${
                        activeSuite?.id === suite.id
                          ? 'border-primary-200 bg-primary-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      } cursor-pointer transition-colors duration-150`}
                      onClick={() => setActiveSuite(suite)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium text-gray-900">{suite.name}</h4>
                          {suite.description && (
                            <p className="text-sm text-gray-500 mt-1">{suite.description}</p>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTestSuite(suite.id);
                          }}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors duration-150"
                        >
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Create New Suite */}
                <div className="mt-6 p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Create New Suite</h4>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={newSuiteName}
                      onChange={(e) => setNewSuiteName(e.target.value)}
                      placeholder="Suite Name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <input
                      type="text"
                      value={newSuiteDescription}
                      onChange={(e) => setNewSuiteDescription(e.target.value)}
                      placeholder="Description (optional)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <button
                      onClick={() => {
                        if (newSuiteName) {
                          createTestSuite(newSuiteName, newSuiteDescription);
                          setNewSuiteName('');
                          setNewSuiteDescription('');
                        }
                      }}
                      disabled={!newSuiteName}
                      className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                    >
                      Create Suite
                    </button>
                  </div>
                </div>
              </div>

              {/* Active Suite Configuration */}
              {activeSuite && (
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium text-gray-900">
                        Active Suite: {activeSuite.name}
                      </h3>
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <label className="text-sm text-gray-700">Iterations:</label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={iterations}
                            onChange={(e) => setIterations(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                            className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm"
                          />
                        </div>
                        <button
                          onClick={handleRunTests}
                          disabled={isRunningTests || !activeSuite.adapters.length}
                          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                        >
                          {isRunningTests ? 'Running Tests...' : (
                            !activeSuite.adapters.length ? 'Add an adapter first' : 'Run Tests'
                          )}
                        </button>
                        {!activeSuite.adapters.length && (
                          <p className="text-sm text-red-600">
                            Please add at least one adapter to run tests
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Categories */}
                    <div className="mb-6">
                      <h4 className="font-medium text-gray-900 mb-2">Test Categories</h4>
                      <div className="flex flex-wrap gap-2">
                        {Object.values(TestCategory).map(category => (
                          <button
                            key={category}
                            onClick={() => {
                              const newCategories = activeSuite.categories.includes(category)
                                ? activeSuite.categories.filter(c => c !== category)
                                : [...activeSuite.categories, category];
                              handleUpdateCategories(newCategories);
                            }}
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                              activeSuite.categories.includes(category)
                                ? 'bg-primary-100 text-primary-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {category.charAt(0).toUpperCase() + category.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Adapters */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Adapters</h4>
                      
                      {/* Existing Adapters */}
                      <div className="space-y-4 mb-4">
                        {activeSuite.adapters.map(adapter => (
                          <div key={adapter.id} className="p-4 border border-gray-200 rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                              <h5 className="font-medium text-gray-900">{adapter.name}</h5>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => testAdapterConnection(adapter)}
                                  disabled={adapterTestStatus[adapter.id]?.isLoading}
                                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-150 ${
                                    adapterTestStatus[adapter.id]?.success
                                      ? 'bg-green-100 text-green-800'
                                      : adapterTestStatus[adapter.id]?.error
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                                  }`}
                                >
                                  {adapterTestStatus[adapter.id]?.isLoading ? (
                                    <span className="flex items-center">
                                      Testing...
                                      <svg className="animate-spin ml-2 h-4 w-4" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                                      </svg>
                                    </span>
                                  ) : adapterTestStatus[adapter.id]?.success ? (
                                    <span className="flex items-center">
                                      Connected
                                      <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                    </span>
                                  ) : adapterTestStatus[adapter.id]?.error ? (
                                    <span className="flex items-center">
                                      Failed
                                      <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </span>
                                  ) : (
                                    'Test Connection'
                                  )}
                                </button>
                                <button
                                  onClick={() => removeAdapter(activeSuite.id, adapter.id)}
                                  className="p-1 text-gray-400 hover:text-red-500 transition-colors duration-150"
                                >
                                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                            <div className="text-sm text-gray-500">
                              <p>Type: {adapter.type}</p>
                              <p>Model: {adapter.model}</p>
                              {adapterTestStatus[adapter.id]?.error && (
                                <p className="text-red-600 mt-1">{adapterTestStatus[adapter.id].error}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Add New Adapter */}
                      <div className="p-4 border border-gray-200 rounded-lg">
                        <h5 className="font-medium text-gray-900 mb-2">Add New Adapter</h5>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Adapter Name
                            </label>
                            <input
                              type="text"
                              value={newAdapterName}
                              onChange={(e) => setNewAdapterName(e.target.value)}
                              placeholder="e.g., GPT-4 Adapter"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Adapter Type
                            </label>
                            <select
                              value={newAdapterType}
                              onChange={(e) => setNewAdapterType(e.target.value as TestSuite['adapters'][0]['type'])}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            >
                              <option value="openai">OpenAI</option>
                              <option value="anthropic">Anthropic</option>
                              <option value="azure">Azure OpenAI</option>
                              <option value="bedrock">AWS Bedrock</option>
                              <option value="ollama">Ollama</option>
                              <option value="google">Google</option>
                            </select>
                          </div>

                          {/* Render credential fields */}
                          {renderCredentialFields()}

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Model
                            </label>
                            {isDiscovering ? (
                              <div className="text-sm text-gray-500">Discovering models...</div>
                            ) : discoveryError ? (
                              <div className="space-y-2">
                                <div className="text-sm text-red-600">{discoveryError}</div>
                                <button
                                  onClick={() => useFallbackModels(newAdapterType)}
                                  className="text-sm text-primary-600 hover:text-primary-700"
                                >
                                  Use available models instead
                                </button>
                              </div>
                            ) : (
                              <select
                                value={newAdapterModel}
                                onChange={(e) => setNewAdapterModel(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                              >
                                <option value="">Select a model</option>
                                {discoveredModels[newAdapterType]?.map((model: any) => (
                                  <option key={model.id} value={model.id}>
                                    {model.name}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>

                          <button
                            onClick={() => {
                              if (newAdapterName && newAdapterModel) {
                                handleAddAdapter();
                              }
                            }}
                            disabled={!newAdapterName || !newAdapterModel || isDiscovering}
                            className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                          >
                            Add Adapter
                          </button>
                          {(!newAdapterName || !newAdapterModel) && (
                            <p className="text-sm text-red-600 mt-2">
                              {!newAdapterName ? "Please enter an adapter name" : ""}
                              {!newAdapterName && !newAdapterModel ? " and " : ""}
                              {!newAdapterModel ? "select a model" : ""}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Test Results */}
                    {isRunningTests && renderProgress()}
                    {renderTestResults()}
                  </div>
                </div>
              )}
            </>
          ) : (
            // Test Running Tab
            <div className="space-y-6">
              <div className="flex flex-col space-y-4">
                {/* Suite Selector */}
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Run Tests</h3>
                  <div className="flex items-center space-x-4">
                    <select
                      value={activeSuite?.id || ''}
                      onChange={(e) => {
                        const suite = testSuites.find(s => s.id === e.target.value);
                        if (suite) setActiveSuite(suite);
                      }}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="" disabled>Select a test suite</option>
                      {testSuites.map(suite => (
                        <option key={suite.id} value={suite.id}>
                          {suite.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Test Configuration */}
                {activeSuite && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <label className="text-sm text-gray-700">Categories:</label>
                        <div className="flex gap-2">
                          {Object.values(TestCategory).map(category => (
                            <button
                              key={category}
                              onClick={() => {
                                const newCategories = activeSuite.categories.includes(category)
                                  ? activeSuite.categories.filter(c => c !== category)
                                  : [...activeSuite.categories, category];
                                handleUpdateCategories(newCategories);
                              }}
                              className={`px-3 py-1 rounded-full text-sm font-medium ${
                                activeSuite.categories.includes(category)
                                  ? 'bg-primary-100 text-primary-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {category.charAt(0).toUpperCase() + category.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <label className="text-sm text-gray-700">Iterations:</label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={iterations}
                          onChange={(e) => setIterations(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                          className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleRunTests}
                      disabled={isRunningTests || !activeSuite?.adapters.length || !activeSuite?.categories.length}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                    >
                      {isRunningTests ? 'Running Tests...' : 'Run Tests'}
                    </button>
                  </div>
                )}
              </div>

              {!activeSuite && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-700">
                    Please select a test suite to run tests
                  </p>
                </div>
              )}

              {activeSuite && (!activeSuite.adapters.length || !activeSuite.categories.length) && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-700">
                    {!activeSuite.adapters.length && 'Please add at least one adapter to run tests. '}
                    {!activeSuite.categories.length && 'Please select at least one test category to run tests.'}
                  </p>
                </div>
              )}

              {/* Test Results */}
              {isRunningTests && renderProgress()}
              {renderTestResults()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 