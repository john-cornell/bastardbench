import React, { useState, useEffect } from 'react';
import { useTestSuites } from '../hooks/useTestSuites';
import { TestCategory } from '../types/llm';
import { TestSuite, AVAILABLE_MODELS } from '../types/testSuite';
import { discoverAvailableModels } from '../utils/modelDiscovery';
import { loadConfig } from '../utils/storage';
import { v4 as uuidv4 } from 'uuid';

export function TestSuiteManager() {
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
        [newAdapterType]: AVAILABLE_MODELS[newAdapterType] || []
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
    
    const adapter = {
      id: uuidv4(),
      name: newAdapterName,
      type: newAdapterType,
      model: newAdapterModel,
      config: newAdapterConfig,
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
      [type]: AVAILABLE_MODELS[type] || []
    }));
    setDiscoveryError(null);
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
              <input
                type="password"
                value={newAdapterConfig.apiKey || ''}
                onChange={(e) => handleNewAdapterConfigChange('apiKey', e.target.value)}
                placeholder="OpenAI API Key"
                className="px-3 py-2 border rounded-md"
              />
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
              <input
                type="password"
                value={newAdapterConfig.apiKey || ''}
                onChange={(e) => handleNewAdapterConfigChange('apiKey', e.target.value)}
                placeholder="Anthropic API Key"
                className="px-3 py-2 border rounded-md"
              />
            )}
          </div>
        );
      case 'azure':
        return (
          <div className="flex flex-col gap-2 mt-2">
            <div className="text-sm text-gray-600">
              Using Azure credentials from settings: {config.azureKey ? '●●●●●●●●●●' : 'Not set'}
            </div>
            {!config.azureKey && (
              <input
                type="password"
                value={newAdapterConfig.apiKey || ''}
                onChange={(e) => handleNewAdapterConfigChange('apiKey', e.target.value)}
                placeholder="Azure API Key"
                className="px-3 py-2 border rounded-md"
              />
            )}
            {!config.azureEndpoint && (
              <input
                type="text"
                value={newAdapterConfig.endpoint || ''}
                onChange={(e) => handleNewAdapterConfigChange('endpoint', e.target.value)}
                placeholder="Azure Endpoint"
                className="px-3 py-2 border rounded-md"
              />
            )}
          </div>
        );
      case 'bedrock':
        return (
          <div className="flex flex-col gap-2 mt-2">
            <div className="text-sm text-gray-600">
              Using AWS credentials from settings: {config.bedrockKey ? '●●●●●●●●●●' : 'Not set'}
            </div>
            {!config.bedrockKey && (
              <input
                type="password"
                value={newAdapterConfig.accessKey || ''}
                onChange={(e) => handleNewAdapterConfigChange('accessKey', e.target.value)}
                placeholder="AWS Access Key"
                className="px-3 py-2 border rounded-md"
              />
            )}
            <input
              type="password"
              value={newAdapterConfig.secretKey || ''}
              onChange={(e) => handleNewAdapterConfigChange('secretKey', e.target.value)}
              placeholder="AWS Secret Key (required)"
              className="px-3 py-2 border rounded-md"
            />
            {!config.bedrockRegion && (
              <input
                type="text"
                value={newAdapterConfig.region || ''}
                onChange={(e) => handleNewAdapterConfigChange('region', e.target.value)}
                placeholder="AWS Region"
                className="px-3 py-2 border rounded-md"
              />
            )}
          </div>
        );
      case 'ollama':
        return (
          <div className="flex flex-col gap-2 mt-2">
            <div className="text-sm text-gray-600">
              Using Ollama endpoint from settings: {config.ollamaEndpoint ? config.ollamaEndpoint : 'Not set'}
            </div>
            {!config.ollamaEndpoint && (
              <input
                type="text"
                value={newAdapterConfig.endpoint || ''}
                onChange={(e) => handleNewAdapterConfigChange('endpoint', e.target.value)}
                placeholder="Ollama Endpoint"
                className="px-3 py-2 border rounded-md"
              />
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
              <input
                type="password"
                value={newAdapterConfig.apiKey || ''}
                onChange={(e) => handleNewAdapterConfigChange('apiKey', e.target.value)}
                placeholder="Google API Key"
                className="px-3 py-2 border rounded-md"
              />
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Test Suite List */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Test Suites</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={newSuiteName}
            onChange={(e) => setNewSuiteName(e.target.value)}
            placeholder="New suite name"
            className="px-3 py-2 border rounded-md"
          />
          <input
            type="text"
            value={newSuiteDescription}
            onChange={(e) => setNewSuiteDescription(e.target.value)}
            placeholder="Description (optional)"
            className="px-3 py-2 border rounded-md"
          />
          <button
            onClick={handleCreateSuite}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Create Suite
          </button>
        </div>
        <div className="space-y-2">
          {testSuites.map((suite) => (
            <div
              key={suite.id}
              className={`p-3 border rounded-md cursor-pointer ${
                activeSuite?.id === suite.id ? 'border-blue-500 bg-blue-50' : ''
              }`}
              onClick={() => setActiveSuite(suite)}
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium">{suite.name}</h3>
                  {suite.description && (
                    <p className="text-sm text-gray-600">{suite.description}</p>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteTestSuite(suite.id);
                  }}
                  className="text-red-500 hover:text-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Active Suite Configuration */}
      {activeSuite && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Configure {activeSuite.name}</h2>
          
          {/* Categories */}
          <div className="space-y-2">
            <h3 className="font-medium">Categories</h3>
            <div className="flex gap-2">
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={activeSuite.categories.includes(TestCategory.CRYPTIC)}
                  onChange={(e) => {
                    const categories = [...activeSuite.categories];
                    if (e.target.checked) {
                      categories.push(TestCategory.CRYPTIC);
                    } else {
                      const index = categories.indexOf(TestCategory.CRYPTIC);
                      if (index !== -1) categories.splice(index, 1);
                    }
                    handleUpdateCategories(categories);
                  }}
                />
                cryptic
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={activeSuite.categories.includes(TestCategory.CODE)}
                  onChange={(e) => {
                    const categories = [...activeSuite.categories];
                    if (e.target.checked) {
                      categories.push(TestCategory.CODE);
                    } else {
                      const index = categories.indexOf(TestCategory.CODE);
                      if (index !== -1) categories.splice(index, 1);
                    }
                    handleUpdateCategories(categories);
                  }}
                />
                code
              </label>
            </div>
          </div>
          
          {/* Adapters */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">Adapters</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => useFallbackModels(newAdapterType)}
                  className="px-3 py-1 text-sm bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Use Default Models
                </button>
                <button
                  onClick={handleDiscoverModels}
                  disabled={isDiscovering}
                  className="px-3 py-1 text-sm bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
                >
                  {isDiscovering ? 'Discovering...' : 'Refresh Models'}
                </button>
              </div>
            </div>
            {discoveryError && (
              <div className="text-sm text-red-500 mb-2">
                {discoveryError}
              </div>
            )}
            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <select
                    value={newAdapterType}
                    onChange={(e) => setNewAdapterType(e.target.value as TestSuite['adapters'][0]['type'])}
                    className="px-3 py-2 border rounded-md"
                  >
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="azure">Azure</option>
                    <option value="bedrock">Bedrock</option>
                    <option value="ollama">Ollama</option>
                    <option value="google">Google</option>
                  </select>
                  <select
                    value={newAdapterModel}
                    onChange={(e) => setNewAdapterModel(e.target.value)}
                    className="px-3 py-2 border rounded-md"
                    disabled={isDiscovering}
                  >
                    <option value="">{isDiscovering ? 'Discovering models...' : 'Select Model'}</option>
                    {discoveredModels[newAdapterType]?.map((model: any) => (
                      <option key={model.id} value={model.id}>
                        {model.name} ({model.contextWindow ? `${model.contextWindow.toLocaleString()} tokens` : 'N/A'})
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={newAdapterName}
                    onChange={(e) => setNewAdapterName(e.target.value)}
                    placeholder="Adapter name"
                    className="px-3 py-2 border rounded-md"
                  />
                  <button
                    onClick={handleAddAdapter}
                    className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                    disabled={!newAdapterModel || !newAdapterName}
                  >
                    Add Adapter
                  </button>
                </div>
                
                {/* Render credential fields */}
                {renderCredentialFields()}
                
                {/* Display existing adapters */}
                <div className="space-y-4 mt-4">
                  {activeSuite.adapters.map((adapter) => (
                    <div key={adapter.id} className="p-4 border rounded-md space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">{adapter.name}</span>
                          <span className="text-sm text-gray-600 ml-2">
                            ({adapter.type} - {discoveredModels[adapter.type]?.find((m: any) => m.id === adapter.model)?.name || adapter.model})
                          </span>
                        </div>
                        <button
                          onClick={() => removeAdapter(activeSuite.id, adapter.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>

                      {/* Display adapter-specific configuration (show masked values) */}
                      <div className="space-y-2 text-sm text-gray-700">
                        {Object.entries(adapter.config).map(([key, value]) => (
                          <div key={key} className="flex justify-between items-center">
                            <span className="font-medium">{key}:</span>
                            <span>
                              {key.includes('Key') || key.includes('Secret') ? '●●●●●●●●●●' : value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 