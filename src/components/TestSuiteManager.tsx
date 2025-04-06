import React, { useState, useEffect, useRef } from 'react';
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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const stripMarkdown = (text: string) => {
  return text.replace(/```[a-z]*\n/g, '').replace(/```/g, '');
};

// Update rate limit tracking
interface RateLimitInfo {
  lastRequestTime: number;
  requestCount: number;
  resetTime: number;
  minuteStartTime: number;
  requestsThisMinute: number;
  quotaExceededTime: number | null;
  quotaExceededCount: number;
}

const rateLimitMap = new Map<string, RateLimitInfo>();
const MAX_REQUESTS_PER_MINUTE = 10;
const QUOTA_RESET_TIME = 60 * 60 * 1000; // 1 hour in milliseconds (more reasonable than 24 hours)

// Load rate limit info from localStorage on component mount
const loadRateLimitInfo = () => {
  try {
    const savedInfo = localStorage.getItem('rateLimitInfo');
    if (savedInfo) {
      const parsedInfo = JSON.parse(savedInfo);
      Object.entries(parsedInfo).forEach(([key, value]) => {
        rateLimitMap.set(key, value as RateLimitInfo);
      });
      console.log('Loaded rate limit info from localStorage:', rateLimitMap);
    }
  } catch (error) {
    console.error('Error loading rate limit info:', error);
  }
};

// Save rate limit info to localStorage
const saveRateLimitInfo = () => {
  try {
    const infoToSave: Record<string, RateLimitInfo> = {};
    rateLimitMap.forEach((value, key) => {
      infoToSave[key] = value;
    });
    localStorage.setItem('rateLimitInfo', JSON.stringify(infoToSave));
    console.log('Saved rate limit info to localStorage');
  } catch (error) {
    console.error('Error saving rate limit info:', error);
  }
};

const getRateLimitInfo = (adapterId: string): RateLimitInfo => {
  if (!rateLimitMap.has(adapterId)) {
    rateLimitMap.set(adapterId, {
      lastRequestTime: 0,
      requestCount: 0,
      resetTime: 0,
      minuteStartTime: Date.now(),
      requestsThisMinute: 0,
      quotaExceededTime: null,
      quotaExceededCount: 0
    });
  }
  return rateLimitMap.get(adapterId)!;
};

const updateRateLimitInfo = (adapterId: string, isRateLimited: boolean, resetTime?: number, isQuotaExceeded: boolean = false) => {
  const info = getRateLimitInfo(adapterId);
  const now = Date.now();
  
  // Check if we need to reset the minute counter
  if (now - info.minuteStartTime >= 60000) {
    info.minuteStartTime = now;
    info.requestsThisMinute = 0;
  }
  
  // Reset counter if we're past the reset time
  if (now > info.resetTime) {
    info.requestCount = 0;
  }
  
  // Handle quota exceeded
  if (isQuotaExceeded) {
    info.quotaExceededTime = now;
    info.quotaExceededCount++;
    console.log(`%cQuota exceeded for ${adapterId} at ${new Date(now).toLocaleTimeString()} (count: ${info.quotaExceededCount})`, 'color: red');
  } else if (info.quotaExceededTime && (now - info.quotaExceededTime > QUOTA_RESET_TIME)) {
    // Reset quota exceeded status after 1 hour
    info.quotaExceededTime = null;
    console.log(`%cQuota exceeded status reset for ${adapterId}`, 'color: green');
  }
  
  info.lastRequestTime = now;
  info.requestCount++;
  info.requestsThisMinute++;
  
  if (isRateLimited && resetTime) {
    info.resetTime = resetTime;
  }
  
  // Save to localStorage after each update
  saveRateLimitInfo();
};

const calculateBackoff = (adapterId: string): number => {
  const info = getRateLimitInfo(adapterId);
  const now = Date.now();
  
  // Check if we're in a quota exceeded state
  if (info.quotaExceededTime) {
    // For quota exceeded, use a more reasonable approach:
    // 1. First few times: wait 5 minutes
    // 2. After that: wait 15 minutes
    // 3. After many failures: wait 30 minutes
    let waitTime = 5 * 60 * 1000; // 5 minutes default
    
    if (info.quotaExceededCount > 3) {
      waitTime = 15 * 60 * 1000; // 15 minutes
    }
    
    if (info.quotaExceededCount > 5) {
      waitTime = 30 * 60 * 1000; // 30 minutes
    }
    
    console.log(`%cQuota exceeded for ${adapterId}, waiting ${Math.round(waitTime/1000)} seconds before retry (attempt ${info.quotaExceededCount})`, 'color: red');
    return waitTime;
  }
  
  // If we're rate limited, wait until reset time
  if (now < info.resetTime) {
    return info.resetTime - now;
  }
  
  // Check if we've hit the per-minute limit
  if (info.requestsThisMinute >= MAX_REQUESTS_PER_MINUTE) {
    // Wait until the next minute starts
    const waitTime = 60000 - (now - info.minuteStartTime);
    return waitTime > 0 ? waitTime : 0;
  }
  
  // Add base delay between requests
  const baseDelay = adapterId.includes('google') 
    ? Math.min(2000 * Math.pow(2, info.requestCount), 60000) // More conservative for Google
    : Math.min(1000 * Math.pow(1.5, info.requestCount), 30000); // Original for others
  
  // Add jitter
  const jitter = Math.random() * 1000;
  
  return baseDelay + jitter;
};

const CRYPTIC_SYSTEM_PROMPT = `You are an expert at solving cryptic crossword clues. 

Analyze the clue and provide your response in valid JSON format. Your response must be a single-line JSON object with this exact structure:

{
  "scratchpad": "This is an area for you to write your thoughts and analysis. You should use the pipe symbol (|) to separate sections in the scratchpad instead of line breaks. In the scratchpad, you should consider the definition, indicators, components, analysis, steps, misdirection, and verification.",
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

interface TestOutput {
  prompt: string;
  testName: string;
  rawResponse: string;
  error?: string;
  duration: number;
  parsedResponse?: {
    scratchpad: string;
    answer: string;
    passed: boolean;
  };
}

const normalizeAnswer = (text: string): string => {
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
};

const getAvailableModels = (provider: ProviderType) => {
  return AVAILABLE_MODELS[provider] || [];
};

const CHART_COLORS = [
  '#2563eb', // primary-600
  '#16a34a', // green-600
  '#dc2626', // red-600
  '#9333ea', // purple-600
  '#ea580c', // orange-600
  '#0891b2', // cyan-600
];

// Update chart sizes in ResultCharts component
const ResultCharts = ({ testResults }: { testResults: Record<string, any> }) => {
  // Prepare data for charts
  const adapters = Object.values(testResults);
  
  // Prepare data for category comparison chart
  const categoryData = adapters.map((adapter: any) => {
    const data: any = { name: adapter.name };
    adapter.results.forEach((result: any) => {
      data[result.category] = result.overallScore;
    });
    return data;
  });

  // Prepare data for success rate pie chart - use test success rate, not call success
  const successRateData = adapters.map((adapter: any) => {
    let passedTests = 0;
    let totalTests = 0;
    
    // Sum up all passed tests across all categories
    adapter.results.forEach((result: any) => {
      const categoryPassed = result.results.filter((r: any) => r.passed).length;
      const categoryTotal = result.results.length;
      passedTests += categoryPassed;
      totalTests += categoryTotal;
    });
    
    return {
      name: adapter.name,
      value: totalTests > 0 ? (passedTests / totalTests) * 100 : 0
    };
  });

  // Prepare data for response time chart
  const responseTimeData = adapters.map((adapter: any) => {
    const avgTime = adapter.results.reduce((acc: number, result: any) => {
      return acc + (result.results.reduce((sum: number, r: any) => sum + r.duration, 0) / result.results.length);
    }, 0) / adapter.results.length;

    return {
      name: adapter.name,
      avgResponseTime: avgTime
    };
  });

  return (
    <div className="space-y-4">
      {/* Reduced spacing */}
      <h4 className="font-medium text-gray-900">Performance Analytics</h4>
      
      {/* Category Comparison Chart - reduced height */}
      <div className="bg-white p-3 rounded-lg border border-gray-200">
        {/* Reduced padding */}
        <h5 className="text-sm font-medium text-gray-700 mb-2">Category Performance Comparison</h5>
        <div className="h-60">
          {/* Reduced height */}
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              {Object.values(TestCategory).map((category, index) => (
                <Bar 
                  key={category} 
                  dataKey={category} 
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                  name={category.charAt(0).toUpperCase() + category.slice(1)}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Success Rate Pie Chart - reduced height */}
      <div className="bg-white p-3 rounded-lg border border-gray-200">
        {/* Reduced padding */}
        <h5 className="text-sm font-medium text-gray-700 mb-2">Test Success Rate</h5>
        <div className="h-48">
          {/* Reduced height */}
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={successRateData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={60}
                label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
              >
                {successRateData.map((entry, index) => (
                  <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => `${Number(value).toFixed(1)}%`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Average Response Time Chart - reduced height */}
      <div className="bg-white p-3 rounded-lg border border-gray-200">
        {/* Reduced padding */}
        <h5 className="text-sm font-medium text-gray-700 mb-2">Average Response Time</h5>
        <div className="h-48">
          {/* Reduced height */}
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={responseTimeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value: any) => `${Number(value).toFixed(0)}ms`} />
              <Line 
                type="monotone" 
                dataKey="avgResponseTime" 
                stroke={CHART_COLORS[0]} 
                name="Response Time"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// Add a global request queue to prevent concurrent requests
interface QueuedRequest {
  adapterId: string;
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  timestamp: number;
}

const requestQueue: QueuedRequest[] = [];
let isProcessingQueue = false;
const GLOBAL_REQUEST_INTERVAL = 2000; // 2 seconds between requests globally

// Process the request queue
const processRequestQueue = async () => {
  if (isProcessingQueue || requestQueue.length === 0) return;
  
  isProcessingQueue = true;
  
  try {
    // Sort by timestamp to ensure FIFO order
    requestQueue.sort((a, b) => a.timestamp - b.timestamp);
    
    // Process the next request
    const request = requestQueue.shift();
    if (request) {
      // Wait for the global interval
      await new Promise(resolve => setTimeout(resolve, GLOBAL_REQUEST_INTERVAL));
      
      // Resolve the request (the actual API call happens in the adapter)
      request.resolve(true);
    }
  } catch (error) {
    console.error('Error processing request queue:', error);
  } finally {
    isProcessingQueue = false;
    
    // Process the next request if there are any
    if (requestQueue.length > 0) {
      setTimeout(processRequestQueue, 100);
    }
  }
};

// Add a request to the queue
const queueRequest = (adapterId: string): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    requestQueue.push({
      adapterId,
      resolve,
      reject,
      timestamp: Date.now()
    });
    
    // Start processing the queue if it's not already being processed
    if (!isProcessingQueue) {
      processRequestQueue();
    }
  });
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
  const resultsContainerRef = useRef<HTMLDivElement>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const cancelTestRef = useRef(false);
  const [discoveredModelsCache, setDiscoveredModelsCache] = useState<Record<string, any[]>>({});
  
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

      // Check if we have cached models for this type
      if (discoveredModelsCache[newAdapterType]) {
        console.log(`Using cached models for ${newAdapterType}`);
        setDiscoveredModels(prev => ({
          ...prev,
          [newAdapterType]: discoveredModelsCache[newAdapterType]
        }));
      } else {
        // If no cache, use fallback models initially
        setDiscoveredModels(prev => ({
          ...prev,
          [newAdapterType]: getAvailableModels(newAdapterType as ProviderType)
        }));
        // Then try to discover models
        if (initialConfig.apiKey || (newAdapterType === 'ollama' && initialConfig.endpoint)) {
          discoverModelsForType(newAdapterType, initialConfig);
        }
      }
    }
  }, [newAdapterType]);

  // Remove automatic discovery for active suite
  useEffect(() => {
    if (activeSuite?.adapters.length) {
      // Don't automatically discover models
      // Models will be discovered only when user clicks the discover button
    }
  }, [activeSuite]);

  const discoverModelsForType = async (
    type: TestSuite['adapters'][0]['type'],
    adapterConfig: any
  ) => {
    setIsDiscovering(true);
    setDiscoveryError(null);

    // Check if we already have cached models for this type
    if (discoveredModelsCache[type] && discoveredModelsCache[type].length > 0) {
      console.log(`Using ${discoveredModelsCache[type].length} cached models for ${type}`);
      setDiscoveredModels(prev => ({
        ...prev,
        [type]: discoveredModelsCache[type]
      }));
      setIsDiscovering(false);
      return;
    }

    try {
      console.log(`Discovering models for ${type}...`);
      const tempAdapter = {
        id: 'temp-discovery',
        name: 'Temporary Discovery Adapter',
        type,
        model: '',
        config: adapterConfig
      };
      
      const models = await discoverAvailableModels([tempAdapter]);
      const discoveredModels = models[type] || [];
      
      // Update both the current state and cache
      setDiscoveredModels(prev => ({
        ...prev,
        [type]: discoveredModels
      }));
      setDiscoveredModelsCache(prev => ({
        ...prev,
        [type]: discoveredModels
      }));

      console.log(`Successfully discovered ${discoveredModels.length} models for ${type}`);
    } catch (error) {
      console.error('Error discovering models:', error);
      setDiscoveryError(error instanceof Error ? error.message : 'Failed to discover models');
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

  // Add a helper function for chunking the test queue
  const chunkArray = <T,>(array: T[], size: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  };

  // Add reset function for test state
  const resetTestState = () => {
    setIsRunningTests(false);
    setTestProgress(null);
    setIsCancelling(false);
    cancelTestRef.current = false;
  };

  // Update handleRunTests
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
    cancelTestRef.current = false;

    // Clear rate limit tracking at the start of a new test run
    rateLimitMap.clear();
    // Clear the request queue
    requestQueue.length = 0;
    isProcessingQueue = false;

    try {
      const results: Record<string, any> = {};
      
      // Initialize results structure for all adapters
      for (const adapterConfig of activeSuite.adapters) {
        results[adapterConfig.id] = {
          name: adapterConfig.name,
          type: adapterConfig.type,
          model: adapterConfig.model,
          results: [],
          outputs: [] as TestOutput[]
        };
      }

      // Create test queue
      type TestQueueItem = {
        category: TestCategory;
        test: CrypticTest | CodeTest;
        iteration: number;
        adapter: {
          config: any;
          adapter: LLMAdapter;
          runner: TestRunner;
        };
      };

      const testQueue: TestQueueItem[] = [];

      // Create all adapters upfront
      const adapters = activeSuite.adapters.map(adapterConfig => ({
        config: adapterConfig,
        adapter: createAdapter(adapterConfig),
        runner: new TestRunner({
          iterations,
          categories: activeSuite.categories,
          validators: {
            default: createAdapter(adapterConfig)
          }
        })
      }));

      // Build test queue - IMPORTANT: Process one adapter at a time
      for (const adapterSetup of adapters) {
        for (const category of activeSuite.categories) {
          const testsToRun = (category === TestCategory.CRYPTIC ? crypticTests : codeTests) as (CrypticTest | CodeTest)[];
          for (let i = 0; i < iterations; i++) {
            for (const test of testsToRun) {
              testQueue.push({
                category,
                test,
                iteration: i,
                adapter: adapterSetup
              });
            }
          }
        }
      }

      const totalTests = testQueue.length;
      let completedTests = 0;

      // Process test queue sequentially
      for (const queueItem of testQueue) {
        // Check for cancellation
        if (cancelTestRef.current) {
          console.log('%cTest execution cancelled by user', 'color: orange');
          break;
        }

        const { category, test, iteration, adapter: { config: adapterConfig, adapter, runner } } = queueItem;

        setTestProgress({
          currentAdapter: adapterConfig.name,
          currentCategory: category,
          currentTest: test.prompt,
          completedTests: completedTests++,
          totalTests,
          currentIteration: iteration + 1,
          totalIterations: iterations
        });

        // Add delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000));

        const output = await callWithRetry(adapter, test.prompt, category);

        // Compare normalized answers and update the passed status
        const normalizedExpected = normalizeAnswer(test.expectedResult.toString());
        const normalizedResponse = output.parsedResponse?.answer ? normalizeAnswer(output.parsedResponse.answer) : '';
        const passed = normalizedExpected === normalizedResponse;

        // Update the passed status in the output
        if (output.parsedResponse) {
          output.parsedResponse.passed = passed;
        }

        results[adapterConfig.id].outputs.push(output);

        // Create result for test runner
        const result = {
          ...await runner.runTest(adapter, test, iteration),
          passed
        };

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
        setTestResults(prevResults => {
          const newResults = { ...prevResults };
          newResults[adapterConfig.id] = { ...results[adapterConfig.id] };
          return newResults;
        });

        // Small delay to ensure UI updates
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      console.log('\n%cAll tests completed. Final results:', 'color: blue; font-weight: bold', results);
      setTestResults({ ...results });
    } catch (error) {
      console.error('%cError running tests:', 'color: red', error);
      setTestResults({
        error: error instanceof Error ? error.message : 'An error occurred while running tests'
      });
    } finally {
      resetTestState();
    }
  };

  const callWithRetry = async (adapter: any, prompt: string, category: TestCategory, maxRetries = 10): Promise<TestOutput> => {
    let retryCount = 0;
    let lastError: Error | null = null;
    const adapterId = (adapter as any).id || 'unknown';

    // Keep retrying indefinitely until we get a successful response
    while (true) {
      try {
        console.log(`\n%cAttempt ${retryCount + 1}`, 'color: blue');
        
        // Calculate and apply backoff
        const backoff = calculateBackoff(adapterId);
        if (backoff > 0) {
          console.log(`%cWaiting ${Math.round(backoff/1000)} seconds before request...`, 'color: orange');
          await new Promise(resolve => setTimeout(resolve, backoff));
        }

        const fullPrompt = `${CRYPTIC_SYSTEM_PROMPT}\n\nClue: ${prompt}`;
        console.log('%cSending prompt:', 'color: blue', fullPrompt);
        
        // Queue the request to prevent concurrent API calls
        await queueRequest(adapterId);
        
        const startTime = Date.now();
        const response = await adapter.call(fullPrompt);
        const duration = Date.now() - startTime;
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
            testName: prompt,
            rawResponse: cleanResponse,
            duration,
            parsedResponse: {
              scratchpad: parsedResponse.scratchpad,
              answer: parsedResponse.answer,
              passed: false
            }
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
              testName: prompt,
              rawResponse: cleanerResponse,
              duration,
              parsedResponse: {
                scratchpad: parsedResponse.scratchpad,
                answer: parsedResponse.answer,
                passed: false
              }
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
          error.message.includes('too many requests')
        );

        const isQuotaExceeded = error instanceof Error && (
          error.message.includes('exceeded your current quota') ||
          error.message.includes('quota exceeded') ||
          error.message.includes('billing details')
        );

        const isNetworkError = error instanceof Error && (
          error.message.includes('Failed to fetch') ||
          error.message.includes('network') ||
          error.message.includes('ERR_CONNECTION') ||
          error.message.includes('connection closed') ||
          error.message.includes('timeout') ||
          error.message.includes('503')
        );
        
        if (isRateLimit) {
          // For rate limits, use standard reset time
          const resetTime = Date.now() + 60000; // 1 minute
          updateRateLimitInfo(adapterId, true, resetTime);
          console.log(`%cRate limit hit for ${adapterId}, will retry after ${new Date(resetTime).toLocaleTimeString()}`, 'color: orange');
          retryCount++;
          continue;
        }
        
        if (isQuotaExceeded) {
          // For quota exceeded, mark it in the rate limit info
          updateRateLimitInfo(adapterId, false, undefined, true);
          
          // Calculate wait time based on how many times we've hit the quota
          const info = getRateLimitInfo(adapterId);
          let waitTime = 5 * 60 * 1000; // 5 minutes default
          
          if (info.quotaExceededCount > 3) {
            waitTime = 15 * 60 * 1000; // 15 minutes
          }
          
          if (info.quotaExceededCount > 5) {
            waitTime = 30 * 60 * 1000; // 30 minutes
          }
          
          console.log(`%cQuota exceeded for ${adapterId}, waiting ${Math.round(waitTime/1000)} seconds before retry (attempt ${info.quotaExceededCount})`, 'color: red');
          await new Promise(resolve => setTimeout(resolve, waitTime));
          retryCount++;
          continue;
        }
        
        if (isNetworkError) {
          console.log('%cNetwork error detected, will retry', 'color: orange');
          retryCount++;
          // Add exponential backoff for network errors
          await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(2, retryCount), 10000)));
          continue;
        }
        
        // For non-retryable errors, we'll still retry but with a longer delay
        console.log('%cNon-retryable error detected, will still retry with longer delay', 'color: red');
        retryCount++;
        await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second delay for other errors
        continue;
      }
    }
  };

  // Add stop handler
  const handleStopTests = () => {
    setIsCancelling(true);
    cancelTestRef.current = true;
  };

  // Update the progress render function
  const renderProgress = () => {
    if (!testProgress) return null;

    const progress = (testProgress.completedTests / (testProgress.totalTests)) * 100;

    return (
      <div className="mb-8 p-4 bg-white border border-gray-200 rounded-lg">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-medium text-gray-900">Test Progress</h4>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">
                {testProgress.completedTests} / {testProgress.totalTests} tests completed
              </span>
              <button
                onClick={handleStopTests}
                disabled={isCancelling}
                className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 text-sm"
              >
                {isCancelling ? 'Stopping...' : 'Stop Tests'}
              </button>
            </div>
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
              {isCancelling && (
                <p className="mt-2 text-sm text-orange-600">
                  Stopping after current test completes...
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Add effect to scroll to bottom when test results update
  useEffect(() => {
    if (resultsContainerRef.current && testResults && Object.keys(testResults).length > 0) {
      resultsContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [testResults]);

  const renderTestResults = () => {
    if (testResults.error) {
      return (
        <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{testResults.error}</p>
        </div>
      );
    }

    if (!Object.keys(testResults).length) return null;

    // Group results by category for comparison
    const categoryResults: Record<string, Array<{
      adapterId: string;
      adapterName: string;
      adapterType: string;
      model: string;
      score: number;
      outputs: TestOutput[];
    }>> = {};

    Object.entries(testResults).forEach(([adapterId, data]: [string, any]) => {
      data.results.forEach((result: any) => {
        const category = result.category;
        if (!categoryResults[category]) {
          categoryResults[category] = [];
        }
        categoryResults[category].push({
          adapterId,
          adapterName: data.name,
          adapterType: data.type,
          model: data.model,
          score: result.overallScore,
          outputs: data.outputs || []
        });
      });
    });

    return (
      <div ref={resultsContainerRef} className="mt-8 space-y-6">
        <h3 className="text-lg font-medium text-gray-900">Test Results</h3>

        {/* Comparison Summary */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="font-medium text-gray-900 mb-4">Performance Comparison</h4>
          {Object.entries(categoryResults).map(([category, results]) => (
            <div key={category} className="mb-6 last:mb-0">
              <h5 className="font-medium text-gray-700 mb-2">
                {category.charAt(0).toUpperCase() + category.slice(1)} Category
              </h5>
              <div className="space-y-2">
                {results
                  .sort((a, b) => b.score - a.score) // Sort by score descending
                  .map((result, index) => (
                  <div key={result.adapterId} className="flex items-center gap-4">
                    <div className="w-48 truncate">
                      <span className={`inline-block w-6 text-${index === 0 ? 'yellow' : 'gray'}-600`}>
                        {index === 0 ? '🏆' : `${index + 1}.`}
                      </span>
                      {result.adapterName}
                    </div>
                    <div className="flex-1">
                      <div className="relative h-6 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="absolute left-0 top-0 h-full bg-primary-600 transition-all duration-500"
                          style={{ width: `${result.score}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-end px-2">
                          <span className="text-sm font-medium text-gray-900">
                            {result.score.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="w-48 text-sm text-gray-500 truncate">
                      {result.model}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Detailed Results by Adapter */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Detailed Results by Adapter</h4>
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
                    <div key={index} className="p-3 bg-gray-50 rounded-lg text-sm">
                      <div className="flex justify-between mb-2">
                        <span className="font-medium">{output.testName}</span>
                        <span className={output.error ? 'text-red-600' : (output.parsedResponse?.passed ? 'text-green-600' : 'text-red-600')}>
                          {output.error ? 'Error' : (output.parsedResponse?.passed ? 'Passed' : 'Failed')}
                        </span>
                      </div>
                      {output.error ? (
                        <div className="text-red-600 whitespace-pre-wrap">{output.error}</div>
                      ) : (
                        <>
                          <div className="text-gray-700 mb-2">
                            <strong>Q:</strong> {output.prompt}
                          </div>
                          <div className="text-gray-700 whitespace-pre-wrap">
                            <strong>A:</strong> {output.parsedResponse?.answer || output.rawResponse}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Category Results */}
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
        
        {/* Charts Section - moved to bottom so always visible */}
        <div id="performance-charts" className="sticky bottom-0 pt-6 pb-4 bg-white border-t border-gray-200">
          {Object.keys(testResults).length > 0 && <ResultCharts testResults={testResults} />}
        </div>
      </div>
    );
  };

  // Update the model selection handler
  const handleModelSelect = (modelId: string) => {
    setNewAdapterModel(modelId);
    
    // Find the model name from discovered models
    const selectedModel = discoveredModels[newAdapterType]?.find((model: any) => model.id === modelId);
    if (selectedModel) {
      // Only set the name if it's empty or was previously auto-set
      if (!newAdapterName || newAdapterName === newAdapterModel) {
        setNewAdapterName(selectedModel.name || modelId);
      }
    }
  };

  // Add a function to clear the cache for a specific type and rediscover models
  const handleRefreshModels = () => {
    if (newAdapterType) {
      // Clear the cache for this type
      setDiscoveredModelsCache(prev => ({
        ...prev,
        [newAdapterType]: []
      }));
      
      // Re-discover models
      discoverModelsForType(
        newAdapterType, 
        newAdapterConfig
      );
    }
  };

  // Load rate limit info when component mounts
  useEffect(() => {
    loadRateLimitInfo();
  }, []);

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
                            <div className="space-y-2">
                              {isDiscovering ? (
                                <div className="text-sm text-gray-500">Discovering models...</div>
                              ) : (
                                <>
                                  <div className="flex gap-2">
                                    <select
                                      value={newAdapterModel}
                                      onChange={(e) => handleModelSelect(e.target.value)}
                                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    >
                                      <option value="">Select a model</option>
                                      {discoveredModels[newAdapterType]?.map((model: any) => (
                                        <option key={model.id} value={model.id}>
                                          {model.name}
                                        </option>
                                      ))}
                                    </select>
                                    <button
                                      type="button"
                                      onClick={handleRefreshModels}
                                      className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                      disabled={isDiscovering}
                                    >
                                      <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                      </svg>
                                      Refresh
                                    </button>
                                  </div>
                                  {discoveryError && (
                                    <div className="text-sm text-red-500 mt-1 flex items-center">
                                      <span className="mr-2">Error: {discoveryError}</span>
                                      <button 
                                        onClick={() => useFallbackModels(newAdapterType)} 
                                        className="text-xs text-blue-500 hover:underline"
                                      >
                                        Use fallback models
                                      </button>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
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