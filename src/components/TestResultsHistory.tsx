import { useState, useEffect } from 'react';
import { loadTestResults, deleteTestResult, StoredTestResult } from '../utils/testResultsStorage';

interface TestResultsHistoryProps {
  onSelectResult: (result: StoredTestResult) => void;
}

export function TestResultsHistory({ onSelectResult }: TestResultsHistoryProps) {
  const [results, setResults] = useState<StoredTestResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<string | null>(null);

  useEffect(() => {
    // Load results when component mounts
    const storedResults = loadTestResults();
    setResults(storedResults);
  }, []);

  const handleDeleteResult = (id: string) => {
    if (confirm('Are you sure you want to delete this test result?')) {
      const success = deleteTestResult(id);
      if (success) {
        setResults(prev => prev.filter(result => result.id !== id));
        if (selectedResult === id) {
          setSelectedResult(null);
        }
      }
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatDuration = (ms: number) => {
    return `${Math.round(ms)}ms`;
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Test Results History</h3>
      
      {results.length === 0 ? (
        <p className="text-gray-500">No test results found</p>
      ) : (
        <div className="space-y-2">
          {results.map(result => (
            <div
              key={result.id}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedResult === result.id
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => {
                setSelectedResult(result.id);
                onSelectResult(result);
              }}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-gray-900">{result.suiteName}</h4>
                  <p className="text-sm text-gray-500">{formatDate(result.timestamp)}</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteResult(result.id);
                    }}
                    className="p-1 text-gray-400 hover:text-red-500"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">Adapters:</span>{' '}
                  <span className="font-medium">{result.metadata.totalAdapters}</span>
                </div>
                <div>
                  <span className="text-gray-500">Tests:</span>{' '}
                  <span className="font-medium">{result.metadata.totalTests}</span>
                </div>
                <div>
                  <span className="text-gray-500">Passed:</span>{' '}
                  <span className="font-medium text-green-600">{result.metadata.passedTests}</span>
                </div>
                <div>
                  <span className="text-gray-500">Failed:</span>{' '}
                  <span className="font-medium text-red-600">{result.metadata.failedTests}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">Avg Duration:</span>{' '}
                  <span className="font-medium">{formatDuration(result.metadata.averageDuration)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 