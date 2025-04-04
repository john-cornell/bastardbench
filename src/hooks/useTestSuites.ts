import { useState, useEffect } from 'react';
import { TestSuite, DEFAULT_TEST_SUITE } from '../types/testSuite';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'test_suites';

export function useTestSuites() {
  const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
  const [activeSuite, setActiveSuite] = useState<TestSuite | null>(null);

  // Load test suites from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const suites = JSON.parse(stored);
      setTestSuites(suites);
      if (suites.length > 0) {
        setActiveSuite(suites[0]);
      }
    } else {
      // Initialize with default suite if no suites exist
      setTestSuites([DEFAULT_TEST_SUITE]);
      setActiveSuite(DEFAULT_TEST_SUITE);
    }
  }, []);

  // Save test suites to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(testSuites));
  }, [testSuites]);

  const createTestSuite = (name: string, description?: string) => {
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
    setTestSuites([...testSuites, newSuite]);
    setActiveSuite(newSuite);
    return newSuite;
  };

  const updateTestSuite = (id: string, updates: Partial<TestSuite>) => {
    setTestSuites(testSuites.map(suite => 
      suite.id === id 
        ? { ...suite, ...updates, updatedAt: new Date().toISOString() }
        : suite
    ));
    if (activeSuite?.id === id) {
      setActiveSuite({ ...activeSuite, ...updates, updatedAt: new Date().toISOString() });
    }
  };

  const deleteTestSuite = (id: string) => {
    setTestSuites(testSuites.filter(suite => suite.id !== id));
    if (activeSuite?.id === id) {
      setActiveSuite(testSuites.find(suite => suite.id !== id) || null);
    }
  };

  const addAdapter = (suiteId: string, adapter: TestSuite['adapters'][0]) => {
    updateTestSuite(suiteId, {
      adapters: [...(activeSuite?.adapters || []), adapter],
    });
  };

  const removeAdapter = (suiteId: string, adapterId: string) => {
    updateTestSuite(suiteId, {
      adapters: (activeSuite?.adapters || []).filter(a => a.id !== adapterId),
    });
  };

  const updateAdapter = (suiteId: string, adapterId: string, updates: Partial<TestSuite['adapters'][0]>) => {
    updateTestSuite(suiteId, {
      adapters: (activeSuite?.adapters || []).map(a => 
        a.id === adapterId ? { ...a, ...updates } : a
      ),
    });
  };

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