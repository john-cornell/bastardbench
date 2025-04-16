import React, { useState, useEffect, useRef } from 'react';
import { useTestSuites } from '../hooks/useTestSuites';
import { TestCategory } from '../types/llm';
import { TestSuite, AVAILABLE_MODELS } from '../types/testSuite';
import { discoverAvailableModels } from '../utils/modelDiscovery';
import { loadConfig } from '../utils/storage';
import { v4 as uuidv4 } from 'uuid';
import { crypticTests } from '../types/cryptic';
import { codeTests } from '../types/code';
import { createAdapter } from '../utils/adapterFactory';
import { CRYPTIC_SYSTEM_PROMPT } from '../utils/systemPrompts';
import { saveTestResults, StoredTestResult } from '../utils/testResultsStorage';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { ProviderType, ProviderModels, ModelInfo } from '../utils/modelDiscovery';

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
  if (!testResults) return null;

  // Prepare data for charts
  const adapters = Object.values(testResults);
  
  // Prepare data for category comparison chart
  const categoryData = adapters.map((adapter: any) => {
    const data: any = { name: adapter.name };
    (adapter.results || []).forEach((result: any) => {
      data[result.category] = result.overallScore || 0;
    });
    return data;
  });

  // Prepare data for success rate pie chart
  const successRateData = adapters.map((adapter: any) => {
    let passedTests = 0;
    let totalTests = 0;
    
    (adapter.results || []).forEach((result: any) => {
      const categoryPassed = (result.tests || []).filter((t: any) => t.passed).length;
      const categoryTotal = (result.tests || []).length;
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
    const avgTime = (adapter.results || []).reduce((acc: number, result: any) => {
      const categoryAvg = (result.tests || []).reduce((sum: number, t: any) => sum + (t.duration || 0), 0) / (result.tests || []).length;
      return acc + (isNaN(categoryAvg) ? 0 : categoryAvg);
    }, 0) / (adapter.results || []).length;

    return {
      name: adapter.name,
      avgResponseTime: isNaN(avgTime) ? 0 : avgTime
    };
  });

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-gray-900">Performance Analytics</h4>
      
      {/* Category Comparison Chart */}
      <div className="bg-white p-3 rounded-lg border border-gray-200">
        <h5 className="text-sm font-medium text-gray-700 mb-2">Category Performance Comparison</h5>
        <div className="h-60">
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

      {/* Success Rate Pie Chart */}
      <div className="bg-white p-3 rounded-lg border border-gray-200">
        <h5 className="text-sm font-medium text-gray-700 mb-2">Test Success Rate</h5>
        <div className="h-48">
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

      {/* Average Response Time Chart */}
      <div className="bg-white p-3 rounded-lg border border-gray-200">
        <h5 className="text-sm font-medium text-gray-700 mb-2">Average Response Time</h5>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={responseTimeData}
                dataKey="avgResponseTime"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={60}
                label={({ name, value }) => `${name}: ${value.toFixed(0)}ms`}
              >
                {responseTimeData.map((entry, index) => (
                  <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => `${Number(value).toFixed(0)}ms`} />
            </PieChart>
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

// Update the test type definition
interface Test {
  name: string;
  prompt: string;
  answer: string;
  evaluate: (response: string) => boolean;
}

// Update the getTestsForCategory function
const getTestsForCategory = (category: TestCategory): Test[] => {
  switch (category) {
    case TestCategory.CRYPTIC:
      return crypticTests.map(test => ({
        name: test.name || 'Unnamed Cryptic Test',
        prompt: test.prompt,
        answer: test.answer,
        evaluate: (response: string) => {
          try {
            const parsed = JSON.parse(response);
            return parsed.answer.toLowerCase() === test.answer.toLowerCase();
          } catch {
            return false;
          }
        }
      }));
    case TestCategory.CODE:
      return codeTests.map(test => ({
        name: test.name || 'Unnamed Code Test',
        prompt: test.prompt,
        answer: test.answer,
        evaluate: (response: string) => {
          try {
            const parsed = JSON.parse(response);
            return parsed.code.includes(test.expectedOutput);
          } catch {
            return false;
          }
        }
      }));
    default:
      return [];
  }
};

// Add this type definition near the top of the file
interface TestResult {
  name: string;
  type: string;
  model: string;
  results: Array<{
    category: string;
    tests: Array<{
      testName: string;
      prompt: string;
      response?: string;
      error?: string;
      duration: number;
      passed: boolean;
      retryCount?: number;
    }>;
    overallScore: number;
  }>;
}

// Update the TestOutput component to handle JSON responses
const TestOutput = ({ testName, prompt, response, error, duration, passed, retryCount }: {
  testName: string;
  prompt: string;
  response?: any;
  error?: string;
  duration: number;
  passed: boolean;
  retryCount?: number;
}) => {
  // Format the response for display
  const formatResponse = (response: any) => {
    if (typeof response === 'string') {
      return response;
    }
    try {
      return JSON.stringify(response, null, 2);
    } catch (e) {
      return String(response);
    }
  };

  return (
    <div className="p-4 border border-gray-200 rounded-lg mb-4">
      <div className="flex justify-between items-start mb-2">
        <h5 className="font-medium text-gray-900">{testName}</h5>
        <div className="flex flex-col items-end">
          <span className={`px-2 py-1 rounded text-sm ${
            passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {passed ? 'Passed' : 'Failed'} ({duration}ms)
          </span>
          {retryCount && retryCount > 0 && (
            <span className="text-xs text-gray-500 mt-1">
              After {retryCount} {retryCount === 1 ? 'retry' : 'retries'}
            </span>
          )}
        </div>
      </div>
      <div className="space-y-4">
        <div>
          <h6 className="text-sm font-medium text-gray-700 mb-1">Prompt</h6>
          <div className="bg-gray-50 p-3 rounded text-sm font-mono">
            {prompt}
          </div>
        </div>
        {response && (
          <div>
            <h6 className="text-sm font-medium text-gray-700 mb-1">Response</h6>
            <div className="bg-gray-50 p-3 rounded text-sm font-mono whitespace-pre-wrap">
              {formatResponse(response)}
            </div>
          </div>
        )}
        {error && (
          <div>
            <h6 className="text-sm font-medium text-gray-700 mb-1">Error</h6>
            <div className="bg-red-50 p-3 rounded text-sm font-mono text-red-600">
              {error}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Update the parseOllamaResponse function
const parseOllamaResponse = (response: string): { parsedResponse: any; passed: boolean; modelAnswer?: string } => {
  try {
    console.log('Raw Ollama response:', response);
    
    // First try to extract JSON from markdown code block
    const jsonMatch = response.match(/```(?:json)?\n([\s\S]*?)\n```/);
    console.log('JSON match:', jsonMatch);
    
    if (jsonMatch) {
      try {
        // Parse the JSON content from the code block
        const parsed = JSON.parse(jsonMatch[1].trim());
        console.log('Parsed JSON:', parsed);
        
        // Extract the answer field
        const modelAnswer = parsed.answer?.toLowerCase().trim();
        return {
          parsedResponse: parsed,
          passed: false, // We'll set this later based on the test
          modelAnswer
        };
      } catch (e) {
        console.error('Error parsing JSON from code block:', e);
        return {
          parsedResponse: jsonMatch[1].trim(),
          passed: false
        };
      }
    } else {
      // If no code block found, try to parse the entire response as JSON
      try {
        const parsed = JSON.parse(response);
        console.log('Parsed response as JSON:', parsed);
        const modelAnswer = parsed.answer?.toLowerCase().trim();
        return {
          parsedResponse: parsed,
          passed: false,
          modelAnswer
        };
      } catch (e) {
        console.error('Error parsing response as JSON:', e);
        return {
          parsedResponse: response,
          passed: false
        };
      }
    }
  } catch (e) {
    console.error('Error parsing Ollama response:', e);
    return {
      parsedResponse: response,
      passed: false
    };
  }
};

interface GoogleResponse {
  scratchpad: string;
  answer: string;
}

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
    exportTestSuites,
    importTestSuites
  } = useTestSuites();

  const [config, setConfig] = useState(() => loadConfig());
  const [newSuiteName, setNewSuiteName] = useState('');
  const [newSuiteDescription, setNewSuiteDescription] = useState('');
  const [newAdapterType, setNewAdapterType] = useState<TestSuite['adapters'][0]['type']>('openai');
  const [newAdapterName, setNewAdapterName] = useState('');
  const [newAdapterModel, setNewAdapterModel] = useState('');
  const [newAdapterConfig, setNewAdapterConfig] = useState<Record<string, string>>({});
  const [isAdapterNameManuallyChanged, setIsAdapterNameManuallyChanged] = useState(false);
  const [discoveredModels, setDiscoveredModels] = useState<Record<string, any>>({});
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const [adapterTestStatus, setAdapterTestStatus] = useState<Record<string, AdapterTestStatus>>({});
  const [discoveredModelsCache, setDiscoveredModelsCache] = useState<Record<string, any[]>>({});
  const [activeTab, setActiveTab] = useState<'manage' | 'run'>('manage');
  const [selectedHistoryResult, setSelectedHistoryResult] = useState<StoredTestResult | null>(null);
  
  // Run Tests state
  const [iterations, setIterations] = useState(1);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [selectedSuiteId, setSelectedSuiteId] = useState<string | null>(null);
  const [shouldStopTests, setShouldStopTests] = useState(false);
  const [isStoppingTests, setIsStoppingTests] = useState(false);
  const [isTestsStopped, setIsTestsStopped] = useState(false);
  const [activeRequestIds, setActiveRequestIds] = useState<Set<string>>(new Set());
  const [isTestRunning, setIsTestRunning] = useState(false); // Track if a test is actively running
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('merge');
  const [showImportOptions, setShowImportOptions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportDropdownRef = useRef<HTMLDivElement>(null);
  
  // Add effect to handle clicks outside dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        const dropdown = document.getElementById('export-options-dropdown');
        if (dropdown && !dropdown.classList.contains('hidden')) {
          dropdown.classList.add('hidden');
        }
      }
    }
    
    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);
    
    // Clean up
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Add effect to trigger model discovery when adapter type changes
  useEffect(() => {
    if (!newAdapterType) return;

    // Get the required credentials based on adapter type
    let hasRequiredCredentials = false;
    const adapterConfig: Record<string, string> = {};

    switch(newAdapterType) {
      case 'openai':
        hasRequiredCredentials = !!config.openAIKey;
        adapterConfig.apiKey = config.openAIKey || '';
        break;
      case 'anthropic':
        hasRequiredCredentials = !!config.anthropicKey;
        adapterConfig.apiKey = config.anthropicKey || '';
        break;
      case 'azure':
        hasRequiredCredentials = !!config.azureKey && !!config.azureEndpoint;
        adapterConfig.apiKey = config.azureKey || '';
        adapterConfig.endpoint = config.azureEndpoint || '';
        break;
      case 'bedrock':
        hasRequiredCredentials = !!config.bedrockKey && !!config.bedrockRegion;
        adapterConfig.accessKey = config.bedrockKey || '';
        adapterConfig.region = config.bedrockRegion || '';
        break;
      case 'ollama':
        hasRequiredCredentials = !!config.ollamaEndpoint;
        adapterConfig.endpoint = config.ollamaEndpoint || '';
        break;
      case 'google':
        hasRequiredCredentials = !!config.googleKey;
        adapterConfig.apiKey = config.googleKey || '';
        break;
    }

    // Only discover models if we have the required credentials
    if (hasRequiredCredentials) {
      discoverModelsForType(newAdapterType, adapterConfig);
    }
  }, [newAdapterType, config]);

  // Reset state when modal is opened
  useEffect(() => {
    if (isOpen) {
      setNewSuiteName('');
      setNewSuiteDescription('');
      setNewAdapterName('');
      setNewAdapterModel('');
      setNewAdapterConfig({});
      setDiscoveryError(null);
      setTestResults({});
      setSelectedSuiteId(null);
    }
  }, [isOpen]);

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
        adapterConfig.secretKey = newAdapterConfig.secretKey || '';
        adapterConfig.region = config.bedrockRegion || '';
        break;
      case 'ollama':
        adapterConfig.endpoint = config.ollamaEndpoint || '';
        break;
      case 'google':
        adapterConfig.apiKey = config.googleKey || '';
        break;
      case 'mistral':
        adapterConfig.apiKey = newAdapterConfig.apiKey || '';
        break;
      case 'groq':
        adapterConfig.apiKey = newAdapterConfig.apiKey || '';
        break;
      case 'deepseek':
        adapterConfig.apiKey = newAdapterConfig.apiKey || '';
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

  const handleNewAdapterConfigChange = (key: string, value: string) => {
    setNewAdapterConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const testAdapterConnection = async (adapter: TestSuite['adapters'][0]) => {
    setAdapterTestStatus(prev => ({
      ...prev,
      [adapter.id]: { isLoading: true }
    }));

    try {
      const llmAdapter = createAdapter(adapter);
      const testPrompt = "Respond with 'OK' if you can read this message.";
      console.log('Testing connection with prompt:', testPrompt);
      
      const response = await llmAdapter.call(testPrompt);
      console.log('Adapter response:', response);
      
      const success = typeof response === 'string' && response.toLowerCase().includes('ok');
      
      setAdapterTestStatus(prev => ({
        ...prev,
        [adapter.id]: { 
          isLoading: false, 
          success,
          error: success ? undefined : `Unexpected response: "${response}"`
        }
      }));
    } catch (error) {
      console.error('Connection test error:', error);
      setAdapterTestStatus(prev => ({
        ...prev,
        [adapter.id]: { 
          isLoading: false, 
          success: false,
          error: error instanceof Error ? error.message : 'Connection failed'
        }
      }));
    }
  };

  const discoverModelsForType = async (
    type: TestSuite['adapters'][0]['type'],
    adapterConfig: any
  ) => {
    setIsDiscovering(true);
    setDiscoveryError(null);

    try {
      console.log(`Discovering models for ${type}...`);
      const tempAdapter = {
        id: 'temp-discovery',
        name: 'Temporary Discovery Adapter',
        type,
        model: '',
        config: adapterConfig
      };
      
      // Always use the model discovery function
      const models = await discoverAvailableModels([tempAdapter]);
      
      const discoveredModels = models[type] || [];
      
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

  const handleRefreshModels = () => {
    if (newAdapterType) {
      setDiscoveredModelsCache(prev => ({
        ...prev,
        [newAdapterType]: []
      }));
      
      discoverModelsForType(
        newAdapterType, 
        newAdapterConfig
      );
    }
  };

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
    if (!selectedSuiteId) return;
    
    setIsRunningTests(true);
    setShouldStopTests(false);
    setIsStoppingTests(false);
    setActiveRequestIds(new Set());
    setIsTestRunning(false);
    setTestResults({}); // Initialize empty results object
    
    // Store a reference to the current test run so we can identify if it's been cancelled
    const testRunId = Date.now().toString();
    // @ts-ignore - Add this property to the component instance
    (window as any).__currentTestRunId = testRunId;
    
    try {
      const suite = testSuites.find(s => s.id === selectedSuiteId);
      if (!suite) return;

      const results: Record<string, any> = {};
      
      // Function to check if current test run is still active
      const isTestRunActive = () => {
        return (window as any).__currentTestRunId === testRunId && !shouldStopTests;
      };
      
      // Run a single test and respect cancellation
      const runSingleTest = async (adapter: any, category: string, test: { name: string; prompt: string; answer: string }) => {
        if (!isTestRunActive()) {
          console.log('Test run cancelled, skipping test');
          return null;
        }
        
        let passed = false;
        let retryCount = 0;
        const maxRetries = 5;
        
        const executeTest = async (): Promise<any> => {
          try {
            setIsTestRunning(true);
            const llmAdapter = createAdapter(adapter);
            const startTime = Date.now();
            
            // Generate a unique ID for this request
            const requestId = `${adapter.id}-${category}-${test.name}-${Date.now()}`;
            trackRequest(requestId);
            console.log(`Starting test request ${requestId}${retryCount > 0 ? ` (retry ${retryCount}/${maxRetries})` : ''}`);
            
            let response;
            try {
              response = await llmAdapter.call(CRYPTIC_SYSTEM_PROMPT + test.prompt);
              
              // Add detailed logging for Google adapter
              if (adapter.type === 'google') {
                console.log('Google Adapter Raw Response:', response);
                try {
                  const parsedGoogleResponse = typeof response === 'string' ? JSON.parse(response) : response;
                  const googleAnswer = (parsedGoogleResponse as unknown as GoogleResponse).answer?.toLowerCase().trim();
                  passed = googleAnswer === test.answer.toLowerCase().trim();
                  console.log('Google adapter comparison:', {
                    modelAnswer: googleAnswer,
                    expectedAnswer: test.answer.toLowerCase().trim(),
                    passed
                  });
                } catch (parseError) {
                  console.error('Error parsing Google response:', parseError);
                  passed = false;
                }
              }
              
              // Check if test run was cancelled while this request was in flight
              if (!isTestRunActive()) {
                console.log(`Ignoring response from request ${requestId} as tests were stopped`);
                untrackRequest(requestId);
                setIsTestRunning(false);
                return null;
              }
            } catch (llmError) {
              untrackRequest(requestId);
              setIsTestRunning(false);
              
              if (!isTestRunActive()) {
                console.log('LLM call was cancelled due to test stopping');
                return null;
              }
              
              // Check if error is a 500 status that should be retried
              const is500Error = llmError instanceof Error && 
                (llmError.toString().includes('500') || 
                 llmError.toString().includes('Internal Server Error') ||
                 (llmError as any)?.status === 500);
              
              if (is500Error && retryCount < maxRetries) {
                retryCount++;
                const backoffTime = Math.min(1000 * Math.pow(2, retryCount), 30000); // Exponential backoff, max 30 seconds
                console.log(`500 error detected, retrying ${retryCount}/${maxRetries} after ${backoffTime}ms: ${llmError.message}`);
                await new Promise(resolve => setTimeout(resolve, backoffTime));
                return executeTest(); // Retry the test
              }
              
              throw llmError; // Re-throw if not a 500 error or max retries exceeded
            }
            
            const duration = Date.now() - startTime;
            untrackRequest(requestId);
            console.log(`Completed test request ${requestId}`);
            
            // Check again if the test run was cancelled
            if (!isTestRunActive()) {
              console.log('Tests stopped after LLM call completed');
              setIsTestRunning(false);
              return null;
            }
            
            // Parse Ollama response if it's an Ollama adapter
            let parsedResponse = response;
            if (adapter.type === 'ollama') {
              const { parsedResponse: ollamaParsedResponse, modelAnswer } = parseOllamaResponse(response);
              parsedResponse = ollamaParsedResponse;
              passed = modelAnswer ? modelAnswer === test.answer.toLowerCase().trim() : false;
              console.log('Comparing answers:', { modelAnswer, expectedAnswer: test.answer.toLowerCase().trim(), passed });
            } else if (adapter.type === 'google') {
              // Handle Google adapter response
              try {
                const parsedGoogleResponse = typeof response === 'string' ? JSON.parse(response) : response;
                const googleAnswer = (parsedGoogleResponse as unknown as GoogleResponse).answer?.toLowerCase().trim();
                passed = googleAnswer === test.answer.toLowerCase().trim();
                console.log('Google adapter comparison:', {
                  modelAnswer: googleAnswer,
                  expectedAnswer: test.answer.toLowerCase().trim(),
                  passed
                });
              } catch (parseError) {
                console.error('Error parsing Google response:', parseError);
                passed = false;
              }
            }
            
            setIsTestRunning(false);
            return {
              testName: test.name,
              prompt: test.prompt,
              response: parsedResponse,
              duration,
              passed,
              retryCount: retryCount // Include retry information in result
            };
          } catch (error) {
            console.error(`Error running test ${test.name} for adapter ${adapter.name}:`, error);
            setIsTestRunning(false);
            return {
              testName: test.name,
              prompt: test.prompt,
              error: error instanceof Error ? error.message : 'Unknown error',
              duration: 0,
              passed: false,
              retryCount: retryCount // Include retry information in result
            };
          }
        };
        
        return executeTest();
      };
      
      // Process each adapter
      for (const adapter of suite.adapters) {
        if (!isTestRunActive()) break;
        
        const adapterResults = {
          name: adapter.name,
          type: adapter.type,
          model: adapter.model,
          results: [] as any[]
        };
        
        // Process each category
        for (const category of suite.categories) {
          if (!isTestRunActive()) break;
          
          const categoryTests = getTestsForCategory(category);
          const categoryResults = {
            category,
            tests: [] as any[],
            overallScore: 0
          };
          
          // Process each test
          for (const test of categoryTests) {
            if (!isTestRunActive()) break;
            
            // Run the test and wait for its completion
            const testResult = await runSingleTest(adapter, category, test);
            
            // If null, test was cancelled
            if (testResult === null) break;
            
            // Add to results
            categoryResults.tests.push(testResult);
            
            // Calculate running average for the category
            const passedTests = categoryResults.tests.filter(t => t.passed).length;
            const totalTests = categoryResults.tests.length;
            categoryResults.overallScore = (passedTests / totalTests) * 100;
            
            // Update results after each test
            results[adapter.id] = {
              ...adapterResults,
              results: [...adapterResults.results.filter(r => r.category !== category), categoryResults]
            };
            setTestResults({ ...results });
            
            // Add a small delay between tests
            if (isTestRunActive()) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
          
          if (isTestRunActive() && categoryResults.tests.length > 0) {
            adapterResults.results.push(categoryResults);
          }
        }
        
        if (isTestRunActive() && adapterResults.results.length > 0) {
          results[adapter.id] = adapterResults;
          setTestResults({ ...results });
        }
      }
      
      // After all tests are complete, save the results
      if (Object.keys(results).length > 0) {
        const success = saveTestResults(selectedSuiteId, suite.name, results);
        if (!success) {
          console.warn('Failed to save test results to storage');
        }
      }
      
    } catch (error) {
      console.error('Error running tests:', error);
    } finally {
      // Clean up the test run ID
      if ((window as any).__currentTestRunId === testRunId) {
        (window as any).__currentTestRunId = null;
      }
      setIsRunningTests(false);
      setShouldStopTests(false);
      setIsStoppingTests(false);
      setActiveRequestIds(new Set());
      setIsTestRunning(false);
    }
  };
  
  const handleStopTests = () => {
    setShouldStopTests(true);
    setIsStoppingTests(true);
    
    // Clear the test run ID to signal cancellation
    (window as any).__currentTestRunId = null;
    
    // Clear the request queue to prevent any more LLM calls
    while (requestQueue.length > 0) {
      const request = requestQueue.shift();
      if (request) {
        request.reject(new Error('Tests stopped by user request'));
      }
    }
    console.log('Test run cancelled, request queue cleared');
    
    // Force reset after a short delay if needed
    setTimeout(() => {
      if (isStoppingTests) {
        console.log('Force resetting test state after timeout');
        setIsRunningTests(false);
        setIsStoppingTests(false);
        setActiveRequestIds(new Set());
        setIsTestRunning(false);
      }
    }, 5000); // 5 second safety timeout
  };
  
  const trackRequest = (requestId: string) => {
    setActiveRequestIds(prev => {
      const newSet = new Set(prev);
      newSet.add(requestId);
      return newSet;
    });
    return requestId;
  };
  
  const untrackRequest = (requestId: string) => {
    setActiveRequestIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(requestId);
      return newSet;
    });
  };

  // Add effect to reset UI when all requests are done after stopping
  useEffect(() => {
    if (isStoppingTests && activeRequestIds.size === 0) {
      // Small delay to allow the user to see the "All requests completed" message
      const timer = setTimeout(() => {
        setIsRunningTests(false);
        setIsStoppingTests(false);
        console.log('All in-flight requests completed, tests have been stopped');
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isStoppingTests, activeRequestIds.size]);

  // Update the adapter name input handler
  const handleNewAdapterNameChange = (value: string) => {
    setNewAdapterName(value);
    setIsAdapterNameManuallyChanged(true);
  };

  // Update the model selection handler
  const handleNewAdapterModelChange = (value: string) => {
    setNewAdapterModel(value);
    if (!isAdapterNameManuallyChanged) {
      setNewAdapterName(value);
    }
  };

  const handleAdapterModelChange = (adapterId: string, model: string) => {
    setActiveSuite(prev => {
      if (!prev) return prev;
      const updatedAdapters = prev.adapters.map(adapter => {
        if (adapter.id === adapterId) {
          const updatedAdapter = {
            ...adapter,
            model,
            name: prev.settings.autoUpdateAdapterNames ? model : adapter.name
          };
          return updatedAdapter;
        }
        return adapter;
      });
      return {
        ...prev,
        adapters: updatedAdapters,
        updatedAt: new Date().toISOString()
      };
    });
  };

  const handleAutoUpdateAdapterNamesChange = (enabled: boolean) => {
    setActiveSuite(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        settings: {
          ...prev.settings,
          autoUpdateAdapterNames: enabled
        },
        updatedAt: new Date().toISOString()
      };
    });
  };

  const handleMoveAdapter = (adapterId: string, direction: 'up' | 'down') => {
    setActiveSuite(prev => {
      if (!prev) return prev;
      
      const currentIndex = prev.adapters.findIndex(a => a.id === adapterId);
      if (currentIndex === -1) return prev;
      
      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (newIndex < 0 || newIndex >= prev.adapters.length) return prev;
      
      const newAdapters = [...prev.adapters];
      [newAdapters[currentIndex], newAdapters[newIndex]] = [newAdapters[newIndex], newAdapters[currentIndex]];
      
      const updatedSuite = {
        ...prev,
        adapters: newAdapters,
        updatedAt: new Date().toISOString()
      };

      // Persist the changes
      updateTestSuite(prev.id, { adapters: newAdapters });
      
      return updatedSuite;
    });
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const fileContent = event.target?.result as string;
      if (fileContent) {
        const result = importTestSuites(fileContent, importMode);
        if (result.success) {
          alert(`Successfully imported ${result.importedCount} test suites`);
          setShowImportOptions(false);
        } else {
          alert(`Error importing test suites: ${result.error}`);
        }
      }
    };
    reader.readAsText(file);
    
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Add function to export test results
  const exportTestResults = (format: 'json' | 'csv' = 'json') => {
    if (Object.keys(testResults).length === 0) {
      alert('No test results to export');
      return;
    }
    
    try {
      if (format === 'json') {
        // Create formatted test results object with metadata
        const suite = testSuites.find(s => s.id === selectedSuiteId);
        const resultsToExport = {
          metadata: {
            exportedAt: new Date().toISOString(),
            suiteName: suite?.name || 'Unknown Suite',
            suiteId: selectedSuiteId,
            totalAdapters: Object.keys(testResults).length
          },
          results: testResults
        };
        
        // Create a JSON string with proper formatting
        const resultsJson = JSON.stringify(resultsToExport, null, 2);
        
        // Create a blob and download link
        const blob = new Blob([resultsJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // Create a temporary download link
        const a = document.createElement('a');
        a.href = url;
        a.download = `bastardbench-results-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);
      } else if (format === 'csv') {
        // Create CSV content
        const csvRows = [];
        
        // Add CSV header
        csvRows.push(['Adapter Name', 'Model', 'Type', 'Category', 'Test Name', 'Passed', 'Duration (ms)', 'Retries', 'Error'].join(','));
        
        // Add data rows
        Object.entries(testResults).forEach(([_, adapterResult]) => {
          const adapterName = adapterResult.name;
          const model = adapterResult.model;
          const type = adapterResult.type;
          
          adapterResult.results.forEach((categoryResult) => {
            const category = categoryResult.category;
            
            categoryResult.tests.forEach((test) => {
              const row = [
                `"${adapterName.replace(/"/g, '""')}"`, // Escape quotes in CSV
                `"${model.replace(/"/g, '""')}"`,
                `"${type.replace(/"/g, '""')}"`,
                `"${category.replace(/"/g, '""')}"`,
                `"${test.testName.replace(/"/g, '""')}"`,
                test.passed ? 'true' : 'false',
                test.duration,
                test.retryCount || 0,
                test.error ? `"${test.error.replace(/"/g, '""')}"` : ''
              ];
              
              csvRows.push(row.join(','));
            });
          });
        });
        
        // Convert CSV array to string
        const csvContent = csvRows.join('\n');
        
        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        // Create a temporary download link
        const a = document.createElement('a');
        a.href = url;
        a.download = `bastardbench-results-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);
      }
    } catch (error) {
      console.error('Error exporting test results:', error);
      alert('Failed to export test results');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 className="text-xl font-semibold text-gray-900">Test Suite Manager</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowImportOptions(true)}
              className="px-3 py-1 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Import
            </button>
            <button
              onClick={exportTestSuites}
              className="px-3 py-1 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Export
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-500"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Import Dialog */}
        {showImportOptions && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
              <h3 className="text-lg font-semibold mb-4">Import Test Suites</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Import Mode
                  </label>
                  <select
                    value={importMode}
                    onChange={(e) => setImportMode(e.target.value as 'replace' | 'merge')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="merge">Merge with existing suites</option>
                    <option value="replace">Replace all existing suites</option>
                  </select>
                </div>
                <div className="pt-2">
                  <p className="text-sm text-gray-600 mb-4">
                    {importMode === 'merge' 
                      ? 'New test suites will be added to your existing suites. Suites with the same ID will not be duplicated.'
                      : 'All existing test suites will be replaced with the imported ones.'}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowImportOptions(false)}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={triggerFileInput}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Select File
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileImport}
                    className="hidden"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('manage')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'manage'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Manage Suites
            </button>
            <button
              onClick={() => setActiveTab('run')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'run'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Run Tests
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'manage' ? (
            <>
              {/* Test Suites List */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Test Suites</h3>
                <div className="space-y-4">
                  {testSuites.map(suite => (
                    <div
                      key={suite.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors duration-150 ${
                        activeSuite?.id === suite.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setActiveSuite(suite)}
                    >
                      <div className="flex justify-between items-start">
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
              </div>

              {/* Create New Suite */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Suite</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Suite Name
                    </label>
                    <input
                      type="text"
                      value={newSuiteName}
                      onChange={(e) => setNewSuiteName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Enter suite name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description (Optional)
                    </label>
                    <textarea
                      value={newSuiteDescription}
                      onChange={(e) => setNewSuiteDescription(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Enter suite description"
                      rows={3}
                    />
                  </div>
                  <button
                    onClick={handleCreateSuite}
                    disabled={!newSuiteName}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                  >
                    Create Suite
                  </button>
                </div>
              </div>

              {/* Active Suite Management */}
              {activeSuite && (
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium text-gray-900">
                        Active Suite: {activeSuite.name}
                      </h3>
                    </div>

                    {/* Test Groups Selection */}
                    <div className="mb-6">
                      <h4 className="font-medium text-gray-900 mb-2">Test Groups</h4>
                      <div className="space-y-2">
                        {Object.values(TestCategory).map(category => (
                          <div key={category} className="flex items-center">
                            <input
                              type="checkbox"
                              id={`category-${category}`}
                              checked={activeSuite.categories.includes(category)}
                              onChange={(e) => {
                                const newCategories = e.target.checked
                                  ? [...activeSuite.categories, category]
                                  : activeSuite.categories.filter(c => c !== category);
                                handleUpdateCategories(newCategories);
                              }}
                              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            />
                            <label
                              htmlFor={`category-${category}`}
                              className="ml-2 block text-sm text-gray-900"
                            >
                              {category.charAt(0).toUpperCase() + category.slice(1)}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Adapters Section */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Adapters</h4>
                      
                      {/* Existing Adapters */}
                      <div className="space-y-4 mb-4">
                        {activeSuite.adapters.map((adapter, index) => (
                          <div key={adapter.id} className="p-4 border border-gray-200 rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                              <div className="flex-1">
                                <h5 className="font-medium text-gray-900">{adapter.name}</h5>
                                <p className="text-sm text-gray-600">{adapter.model}</p>
                              </div>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleMoveAdapter(adapter.id, 'up')}
                                  disabled={index === 0}
                                  className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                  aria-label="Move adapter up"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleMoveAdapter(adapter.id, 'down')}
                                  disabled={index === (activeSuite?.adapters.length ?? 0) - 1}
                                  className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                  aria-label="Move adapter down"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
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
                              {adapterTestStatus[adapter.id]?.error && (
                                <p className="text-red-600 mt-1">{adapterTestStatus[adapter.id].error}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Add New Adapter */}
                      <div className="p-4 border border-gray-200 rounded-lg">
                        <h5 className="font-medium text-gray-900 mb-4">Add New Adapter</h5>
                        <div className="space-y-4">
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
                              <option value="mistral">Mistral</option>
                              <option value="groq">Groq</option>
                              <option value="deepseek">DeepSeek</option>
                            </select>
                          </div>

                          {/* Render credential fields */}
                          {renderCredentialFields()}

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Adapter Name
                            </label>
                            <input
                              type="text"
                              value={newAdapterName}
                              onChange={(e) => handleNewAdapterNameChange(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                              placeholder="Enter adapter name"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Model
                            </label>
                            <select
                              value={newAdapterModel}
                              onChange={(e) => handleNewAdapterModelChange(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                              disabled={!newAdapterType}
                            >
                              <option value="">Select a model</option>
                              {discoveredModels[newAdapterType]?.map((model: ModelInfo) => (
                                <option
                                  key={model.id || model.name}
                                  value={model.id || model.name}
                                >
                                  {model.name}
                                </option>
                              ))}
                            </select>
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
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Run Tests</h3>
              
              {/* Suite Selection */}
              <div className="p-4 border border-gray-200 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-4">Select Test Suite</h4>
                <div className="space-y-2">
                  {testSuites.map(suite => (
                    <div
                      key={suite.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors duration-150 ${
                        selectedSuiteId === suite.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedSuiteId(suite.id)}
                    >
                      <h5 className="font-medium text-gray-900">{suite.name}</h5>
                      {suite.description && (
                        <p className="text-sm text-gray-500 mt-1">{suite.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {selectedSuiteId && (
                <div className="space-y-4">
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-4">Test Configuration</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Number of Iterations
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={iterations}
                          onChange={(e) => setIterations(parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleRunTests}
                          disabled={isRunningTests}
                          className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                        >
                          {isRunningTests ? 'Running Tests...' : 'Run Tests'}
                        </button>
                        {isRunningTests && (
                          <button
                            onClick={handleStopTests}
                            disabled={isStoppingTests}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-150"
                          >
                            {isStoppingTests ? 'Stopping...' : 'Stop Tests'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Show results during and after test execution */}
                  <div className="space-y-4">
                    <ResultCharts testResults={testResults} />
                    
                    {/* Add Export Results button if there are results */}
                    {Object.keys(testResults).length > 0 && (
                      <div className="flex justify-end mb-4">
                        <div className="relative inline-block text-left" ref={exportDropdownRef}>
                          <div>
                            <button
                              type="button"
                              className="inline-flex justify-center w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                              id="export-options-menu"
                              onClick={() => {
                                const menu = document.getElementById('export-options-dropdown');
                                if (menu) {
                                  menu.classList.toggle('hidden');
                                }
                              }}
                            >
                              Export Results
                              <svg className="-mr-1 ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                          
                          <div
                            id="export-options-dropdown"
                            className="hidden origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20"
                          >
                            <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="export-options-menu">
                              <button
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                role="menuitem"
                                onClick={() => {
                                  exportTestResults('json');
                                  document.getElementById('export-options-dropdown')?.classList.add('hidden');
                                }}
                              >
                                Export as JSON
                              </button>
                              <button
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                role="menuitem"
                                onClick={() => {
                                  exportTestResults('csv');
                                  document.getElementById('export-options-dropdown')?.classList.add('hidden');
                                }}
                              >
                                Export as CSV
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Add the test output section */}
                    {Object.entries(testResults).map(([adapterId, adapterResult]) => (
                      <div key={adapterId} className="space-y-4">
                        <h4 className="font-medium text-gray-900">
                          {adapterResult.name} ({adapterResult.type} - {adapterResult.model})
                        </h4>
                        {adapterResult.results.map((categoryResult, index) => (
                          <div key={index} className="space-y-4">
                            <h5 className="text-sm font-medium text-gray-700">
                              {categoryResult.category}
                            </h5>
                            {categoryResult.tests.map((test, testIndex) => (
                              <TestOutput
                                key={testIndex}
                                testName={test.testName}
                                prompt={test.prompt}
                                response={test.response}
                                error={test.error}
                                duration={test.duration}
                                passed={test.passed}
                                retryCount={test.retryCount}
                              />
                            ))}
                          </div>
                        ))}
                      </div>
                    ))}
                    
                    {isRunningTests && (
                      <div className="text-center py-4">
                        <div className="inline-flex items-center">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span className="text-gray-600">Running tests...</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Test Suite Settings</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-medium">Auto-update Adapter Names</h3>
                <p className="text-sm text-gray-600">
                  Automatically update adapter names when changing models
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={activeSuite?.settings?.autoUpdateAdapterNames ?? true}
                onClick={() => handleAutoUpdateAdapterNamesChange(!(activeSuite?.settings?.autoUpdateAdapterNames ?? true))}
                className={`${
                  activeSuite?.settings?.autoUpdateAdapterNames ? 'bg-blue-600' : 'bg-gray-200'
                } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
              >
                <span
                  className={`${
                    activeSuite?.settings?.autoUpdateAdapterNames ? 'translate-x-5' : 'translate-x-1'
                  } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}