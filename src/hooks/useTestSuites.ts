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

export function useTestSuites() {
  const [testSuites, setTestSuites] = useState<TestSuite[]>(() => {
    // Initialize state with data from localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = safeJSONParse(stored, [DEFAULT_TEST_SUITE]);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [DEFAULT_TEST_SUITE];
  });

  const [activeSuite, setActiveSuite] = useState<TestSuite | null>(() => {
    // Initialize active suite from localStorage or use first suite
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
  };
} 