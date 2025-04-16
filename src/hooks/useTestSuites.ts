import { useState, useEffect, useCallback } from 'react';
import { TestSuite, DEFAULT_TEST_SUITE } from '../types/testSuite';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'test_suites';

// Helper function to safely parse JSON with a default value
const safeJSONParse = (str: string | null, defaultValue: any = null) => {
  if (!str) return defaultValue;
  try {
    return JSON.parse(str);
  } catch (e) {
    console.error('Error parsing JSON from localStorage:', e);
    return defaultValue;
  }
};

// Helper function to safely save to localStorage
const saveToStorage = (key: string, value: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error('Error saving to localStorage:', e);
    return false;
  }
};

// Helper function to validate imported test suites
const validateTestSuites = (data: any): TestSuite[] => {
  // Check if it's an array
  if (!Array.isArray(data)) {
    console.error('Imported data is not an array');
    return [];
  }

  // Basic validation of required fields for each suite
  const validSuites = data.filter(suite => {
    return (
      suite &&
      typeof suite === 'object' &&
      typeof suite.id === 'string' &&
      typeof suite.name === 'string' &&
      Array.isArray(suite.categories) &&
      Array.isArray(suite.adapters)
    );
  });

  if (validSuites.length !== data.length) {
    console.warn(`${data.length - validSuites.length} test suites were invalid and filtered out`);
  }

  return validSuites;
};

export function useTestSuites() {
  // Initialize state with data from localStorage
  const [testSuites, setTestSuites] = useState<TestSuite[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = safeJSONParse(stored, [DEFAULT_TEST_SUITE]);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [DEFAULT_TEST_SUITE];
  });

  const [activeSuite, setActiveSuite] = useState<TestSuite | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = safeJSONParse(stored, [DEFAULT_TEST_SUITE]);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : DEFAULT_TEST_SUITE;
  });

  // Save test suites to localStorage whenever they change
  useEffect(() => {
    const success = saveToStorage(STORAGE_KEY, testSuites);
    if (!success) {
      console.warn('Failed to save test suites to localStorage');
    }
  }, [testSuites]);

  // Also save when active suite changes
  useEffect(() => {
    if (activeSuite) {
      const success = saveToStorage(STORAGE_KEY, testSuites);
      if (!success) {
        console.warn('Failed to save test suites to localStorage');
      }
    }
  }, [activeSuite, testSuites]);

  // Memoized update functions to ensure consistent behavior
  const createTestSuite = useCallback((name: string, description?: string) => {
    const newSuite: TestSuite = {
      id: uuidv4(),
      name,
      description,
      categories: [],
      selectedTests: [],
      adapters: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      settings: {
        autoUpdateAdapterNames: true
      }
    };
    
    setTestSuites(prev => {
      const updated = [...prev, newSuite];
      saveToStorage(STORAGE_KEY, updated);
      return updated;
    });
    
    setActiveSuite(newSuite);
    return newSuite;
  }, []);

  const updateTestSuite = useCallback((id: string, updates: Partial<TestSuite>) => {
    setTestSuites(prev => {
      const updated = prev.map(suite =>
        suite.id === id
          ? { ...suite, ...updates, updatedAt: new Date().toISOString() }
          : suite
      );
      saveToStorage(STORAGE_KEY, updated);
      return updated;
    });

    setActiveSuite(current =>
      current?.id === id
        ? { ...current, ...updates, updatedAt: new Date().toISOString() }
        : current
    );
  }, []);

  const deleteTestSuite = useCallback((id: string) => {
    setTestSuites(prev => {
      const updated = prev.filter(suite => suite.id !== id);
      // Ensure we always have at least one suite
      const final = updated.length > 0 ? updated : [DEFAULT_TEST_SUITE];
      saveToStorage(STORAGE_KEY, final);
      return final;
    });

    setActiveSuite(current => {
      if (current?.id === id) {
        // Find the next available suite or use default
        const nextSuite = testSuites.find(suite => suite.id !== id) || DEFAULT_TEST_SUITE;
        return nextSuite;
      }
      return current;
    });
  }, [testSuites]);

  const addAdapter = useCallback((suiteId: string, adapter: TestSuite['adapters'][0]) => {
    updateTestSuite(suiteId, {
      adapters: [...(activeSuite?.adapters || []), adapter],
    });
  }, [activeSuite, updateTestSuite]);

  const removeAdapter = useCallback((suiteId: string, adapterId: string) => {
    updateTestSuite(suiteId, {
      adapters: (activeSuite?.adapters || []).filter(a => a.id !== adapterId),
    });
  }, [activeSuite, updateTestSuite]);

  const updateAdapter = useCallback((suiteId: string, adapterId: string, updates: Partial<TestSuite['adapters'][0]>) => {
    updateTestSuite(suiteId, {
      adapters: (activeSuite?.adapters || []).map(a =>
        a.id === adapterId ? { ...a, ...updates } : a
      ),
    });
  }, [activeSuite, updateTestSuite]);
  
  // Export test suites to a JSON file
  const exportTestSuites = useCallback(() => {
    try {
      // Create a JSON string with proper formatting
      const suitesJson = JSON.stringify(testSuites, null, 2);
      
      // Create a blob and download link
      const blob = new Blob([suitesJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Create a temporary download link
      const a = document.createElement('a');
      a.href = url;
      a.download = `bastardbench-suites-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      return true;
    } catch (error) {
      console.error('Error exporting test suites:', error);
      return false;
    }
  }, [testSuites]);
  
  // Import test suites from a JSON file
  const importTestSuites = useCallback((fileContent: string, importMode: 'replace' | 'merge' = 'merge') => {
    try {
      // Parse and validate the file content
      const parsedData = JSON.parse(fileContent);
      const validSuites = validateTestSuites(parsedData);
      
      if (validSuites.length === 0) {
        throw new Error('No valid test suites found in the imported file');
      }
      
      // Update state based on import mode
      setTestSuites(prev => {
        let newSuites: TestSuite[];
        
        if (importMode === 'replace') {
          // Replace all existing suites
          newSuites = validSuites;
        } else {
          // Merge with existing suites, avoiding duplicates by ID
          const existingIds = new Set(prev.map(suite => suite.id));
          const uniqueNewSuites = validSuites.filter(suite => !existingIds.has(suite.id));
          newSuites = [...prev, ...uniqueNewSuites];
        }
        
        // Save to localStorage
        saveToStorage(STORAGE_KEY, newSuites);
        return newSuites;
      });
      
      // Set the first imported suite as active if replacing
      if (importMode === 'replace' && validSuites.length > 0) {
        setActiveSuite(validSuites[0]);
      }
      
      return {
        success: true,
        importedCount: validSuites.length
      };
    } catch (error) {
      console.error('Error importing test suites:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during import'
      };
    }
  }, []);

  return {
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
  };
} 