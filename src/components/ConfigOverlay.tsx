import { useState, useEffect } from 'react';
import { loadConfig, saveConfig, clearConfig } from '../utils/storage';
import { testOpenAI, testAnthropic, testAzure, testBedrock, testOllama, testGoogle } from '../utils/modelTest';

interface ConfigOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'models' | 'settings';

interface TestStatus {
  model: string;
  loading: boolean;
  result: { success: boolean; message: string } | null;
}

export function ConfigOverlay({ isOpen, onClose }: ConfigOverlayProps) {
  const [activeTab, setActiveTab] = useState<Tab>('models');
  const [openAIKey, setOpenAIKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [azureKey, setAzureKey] = useState('');
  const [azureEndpoint, setAzureEndpoint] = useState('');
  const [bedrockKey, setBedrockKey] = useState('');
  const [bedrockRegion, setBedrockRegion] = useState('');
  const [ollamaEndpoint, setOllamaEndpoint] = useState('http://localhost:11434');
  const [googleKey, setGoogleKey] = useState('');
  const [iterations, setIterations] = useState(5);
  const [timeout, setTimeout] = useState(30000);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1000);
  const [showAnswers, setShowAnswers] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [testStatus, setTestStatus] = useState<TestStatus[]>([]);

  // Load config when overlay opens
  useEffect(() => {
    if (isOpen) {
      const config = loadConfig();
      setOpenAIKey(config.openAIKey);
      setAnthropicKey(config.anthropicKey);
      setAzureKey(config.azureKey);
      setAzureEndpoint(config.azureEndpoint);
      setBedrockKey(config.bedrockKey);
      setBedrockRegion(config.bedrockRegion);
      setOllamaEndpoint(config.ollamaEndpoint);
      setGoogleKey(config.googleKey);
      setIterations(config.iterations);
      setTimeout(config.timeout);
      setTemperature(config.temperature);
      setMaxTokens(config.maxTokens);
      setShowAnswers(config.showAnswers);
      setErrors([]);
      setTestStatus([]);
    }
  }, [isOpen]);

  const handleSave = () => {
    const config = {
      openAIKey,
      anthropicKey,
      azureKey,
      azureEndpoint,
      bedrockKey,
      bedrockRegion,
      ollamaEndpoint,
      googleKey,
      iterations,
      timeout,
      temperature,
      maxTokens,
      showAnswers,
    };
    const validationErrors = saveConfig(config);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
    } else {
      onClose();
    }
  };

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear all configuration? This cannot be undone.')) {
      clearConfig();
      onClose();
    }
  };

  const handleTest = async (model: string, testFn: () => Promise<{ success: boolean; message: string }>) => {
    setTestStatus(prev => [...prev.filter(s => s.model !== model), { model, loading: true, result: null }]);
    try {
      const result = await testFn();
      setTestStatus(prev => [...prev.filter(s => s.model !== model), { model, loading: false, result }]);
    } catch (error) {
      setTestStatus(prev => [...prev.filter(s => s.model !== model), { 
        model, 
        loading: false, 
        result: { success: false, message: error instanceof Error ? error.message : 'Test failed' }
      }]);
    }
  };

  const getTestStatus = (model: string) => {
    return testStatus.find(s => s.model === model) || { loading: false, result: null };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-secondary-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-secondary-900">Configuration</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary-100 rounded-lg transition-colors duration-150"
          >
            <svg className="h-5 w-5 text-secondary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-secondary-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('models')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'models'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
              }`}
            >
              Models
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'settings'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
              }`}
            >
              Settings
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-12rem)]">
          {errors.length > 0 && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="text-sm font-medium text-red-800 mb-2">Validation Errors:</h4>
              <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {activeTab === 'models' ? (
            <div className="space-y-6">
              {/* OpenAI */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-secondary-900">OpenAI</h3>
                  <button
                    onClick={() => handleTest('openai', () => testOpenAI(openAIKey))}
                    disabled={!openAIKey || getTestStatus('openai').loading}
                    className="px-3 py-1 text-sm font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {getTestStatus('openai').loading ? 'Testing...' : 'Test Connection'}
                  </button>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-secondary-700">
                    API Key
                  </label>
                  <input
                    type="password"
                    value={openAIKey}
                    onChange={(e) => setOpenAIKey(e.target.value)}
                    className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="sk-..."
                  />
                  {getTestStatus('openai').result && (
                    <p className={`text-sm ${getTestStatus('openai').result?.success ? 'text-green-600' : 'text-red-600'}`}>
                      {getTestStatus('openai').result?.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Anthropic */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-secondary-900">Anthropic</h3>
                  <button
                    onClick={() => handleTest('anthropic', () => testAnthropic(anthropicKey))}
                    disabled={!anthropicKey || getTestStatus('anthropic').loading}
                    className="px-3 py-1 text-sm font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {getTestStatus('anthropic').loading ? 'Testing...' : 'Test Connection'}
                  </button>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-secondary-700">
                    API Key
                  </label>
                  <input
                    type="password"
                    value={anthropicKey}
                    onChange={(e) => setAnthropicKey(e.target.value)}
                    className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="sk-ant-..."
                  />
                  {getTestStatus('anthropic').result && (
                    <p className={`text-sm ${getTestStatus('anthropic').result?.success ? 'text-green-600' : 'text-red-600'}`}>
                      {getTestStatus('anthropic').result?.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Azure */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-secondary-900">Azure OpenAI</h3>
                  <button
                    onClick={() => handleTest('azure', () => testAzure(azureKey, azureEndpoint))}
                    disabled={!azureKey || !azureEndpoint || getTestStatus('azure').loading}
                    className="px-3 py-1 text-sm font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {getTestStatus('azure').loading ? 'Testing...' : 'Test Connection'}
                  </button>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-secondary-700">
                    API Key
                  </label>
                  <input
                    type="password"
                    value={azureKey}
                    onChange={(e) => setAzureKey(e.target.value)}
                    className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="..."
                  />
                  <label className="block text-sm font-medium text-secondary-700">
                    Endpoint
                  </label>
                  <input
                    type="text"
                    value={azureEndpoint}
                    onChange={(e) => setAzureEndpoint(e.target.value)}
                    className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="https://..."
                  />
                  {getTestStatus('azure').result && (
                    <p className={`text-sm ${getTestStatus('azure').result?.success ? 'text-green-600' : 'text-red-600'}`}>
                      {getTestStatus('azure').result?.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Bedrock */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-secondary-900">AWS Bedrock</h3>
                  <button
                    onClick={() => handleTest('bedrock', () => testBedrock(bedrockKey, bedrockRegion))}
                    disabled={!bedrockKey || !bedrockRegion || getTestStatus('bedrock').loading}
                    className="px-3 py-1 text-sm font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {getTestStatus('bedrock').loading ? 'Testing...' : 'Test Connection'}
                  </button>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-secondary-700">
                    Access Key
                  </label>
                  <input
                    type="password"
                    value={bedrockKey}
                    onChange={(e) => setBedrockKey(e.target.value)}
                    className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="..."
                  />
                  <label className="block text-sm font-medium text-secondary-700">
                    Region
                  </label>
                  <input
                    type="text"
                    value={bedrockRegion}
                    onChange={(e) => setBedrockRegion(e.target.value)}
                    className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="us-east-1"
                  />
                  {getTestStatus('bedrock').result && (
                    <p className={`text-sm ${getTestStatus('bedrock').result?.success ? 'text-green-600' : 'text-red-600'}`}>
                      {getTestStatus('bedrock').result?.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Ollama */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-secondary-900">Ollama</h3>
                  <button
                    onClick={() => handleTest('ollama', () => testOllama(ollamaEndpoint))}
                    disabled={!ollamaEndpoint || getTestStatus('ollama').loading}
                    className="px-3 py-1 text-sm font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {getTestStatus('ollama').loading ? 'Testing...' : 'Test Connection'}
                  </button>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-secondary-700">
                    Endpoint
                  </label>
                  <input
                    type="text"
                    value={ollamaEndpoint}
                    onChange={(e) => setOllamaEndpoint(e.target.value)}
                    className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="http://localhost:11434"
                  />
                  {getTestStatus('ollama').result && (
                    <p className={`text-sm ${getTestStatus('ollama').result?.success ? 'text-green-600' : 'text-red-600'}`}>
                      {getTestStatus('ollama').result?.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Google */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-secondary-900">Google AI</h3>
                  <button
                    onClick={() => handleTest('google', () => testGoogle(googleKey))}
                    disabled={!googleKey || getTestStatus('google').loading}
                    className="px-3 py-1 text-sm font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {getTestStatus('google').loading ? 'Testing...' : 'Test Connection'}
                  </button>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-secondary-700">
                    API Key
                  </label>
                  <input
                    type="password"
                    value={googleKey}
                    onChange={(e) => setGoogleKey(e.target.value)}
                    className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="..."
                  />
                  {getTestStatus('google').result && (
                    <p className={`text-sm ${getTestStatus('google').result?.success ? 'text-green-600' : 'text-red-600'}`}>
                      {getTestStatus('google').result?.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-secondary-900">General Settings</h3>
              
              {/* Iterations */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-secondary-700">
                  Number of Iterations
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={iterations}
                  onChange={(e) => setIterations(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-sm text-secondary-500">Number of times to run each test (1-10)</p>
              </div>

              {/* Timeout */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-secondary-700">
                  Timeout (ms)
                </label>
                <input
                  type="number"
                  min="1000"
                  max="60000"
                  step="1000"
                  value={timeout}
                  onChange={(e) => setTimeout(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-sm text-secondary-500">Maximum time to wait for responses (1000-60000ms)</p>
              </div>

              {/* Temperature */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-secondary-700">
                  Temperature
                </label>
                <input
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-sm text-secondary-500">Controls randomness in responses (0-2)</p>
              </div>

              {/* Max Tokens */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-secondary-700">
                  Max Tokens
                </label>
                <input
                  type="number"
                  min="1"
                  max="4000"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-sm text-secondary-500">Maximum length of responses (1-4000 tokens)</p>
              </div>

              {/* Show Answers */}
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="showAnswers"
                  checked={showAnswers}
                  onChange={(e) => setShowAnswers(e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-300 rounded"
                />
                <label htmlFor="showAnswers" className="text-sm font-medium text-secondary-700">
                  Show answers immediately
                </label>
                <p className="text-sm text-secondary-500">Display correct answers without waiting for user input</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-secondary-50 border-t border-secondary-200 flex justify-between items-center">
          <button
            onClick={handleClear}
            className="px-4 py-2 text-red-600 hover:text-red-700 transition-colors duration-150"
          >
            Clear All
          </button>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-secondary-700 hover:text-secondary-900 transition-colors duration-150"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors duration-150"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 