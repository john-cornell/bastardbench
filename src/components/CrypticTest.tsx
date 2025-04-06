import React from 'react';
import { CrypticTest } from '../types/cryptic';

interface CrypticTestProps {
  test: CrypticTest;
}

export function CrypticTestComponent({ test }: CrypticTestProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow mb-4">
      <div className="space-y-2">
        <div className="flex justify-between items-start">
          <div className="flex-grow">
            <p className="text-lg font-medium text-gray-900">{test.prompt}</p>
            <p className="text-sm text-gray-500">Length: {test.answerLength}</p>
          </div>
          <div className="ml-4">
            <p className="text-base font-medium text-gray-700">Answer: {test.answer}</p>
          </div>
        </div>
      </div>
    </div>
  );
} 