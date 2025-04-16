import { TestResult } from '../types/llm';

const STORAGE_KEY = 'test_results_history';

export interface StoredTestResult {
  id: string;
  timestamp: string;
  suiteId: string;
  suiteName: string;
  results: Record<string, any>;
  metadata: {
    totalAdapters: number;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    averageDuration: number;
  };
}

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

export const saveTestResults = (suiteId: string, suiteName: string, results: Record<string, any>): boolean => {
  try {
    // Calculate metadata
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    let totalDuration = 0;

    Object.values(results).forEach((adapterResult: any) => {
      adapterResult.results.forEach((categoryResult: any) => {
        categoryResult.tests.forEach((test: any) => {
          totalTests++;
          if (test.passed) {
            passedTests++;
          } else {
            failedTests++;
          }
          totalDuration += test.duration;
        });
      });
    });

    const averageDuration = totalTests > 0 ? totalDuration / totalTests : 0;

    // Create the stored result object
    const storedResult: StoredTestResult = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      suiteId,
      suiteName,
      results,
      metadata: {
        totalAdapters: Object.keys(results).length,
        totalTests,
        passedTests,
        failedTests,
        averageDuration
      }
    };

    // Get existing results
    const existingResults = safeJSONParse(localStorage.getItem(STORAGE_KEY), []);
    
    // Add new result to the beginning of the array (most recent first)
    const updatedResults = [storedResult, ...existingResults];
    
    // Save back to localStorage
    return saveToStorage(STORAGE_KEY, updatedResults);
  } catch (error) {
    console.error('Error saving test results:', error);
    return false;
  }
};

export const loadTestResults = (): StoredTestResult[] => {
  return safeJSONParse(localStorage.getItem(STORAGE_KEY), []);
};

export const getTestResultById = (id: string): StoredTestResult | null => {
  const results = loadTestResults();
  return results.find(result => result.id === id) || null;
};

export const deleteTestResult = (id: string): boolean => {
  try {
    const results = loadTestResults();
    const updatedResults = results.filter(result => result.id !== id);
    return saveToStorage(STORAGE_KEY, updatedResults);
  } catch (error) {
    console.error('Error deleting test result:', error);
    return false;
  }
};

export const clearTestResults = (): boolean => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing test results:', error);
    return false;
  }
}; 