import React, { useState } from 'react';
import { CrypticTest } from '../types/cryptic';

interface CrypticTestProps {
  test: CrypticTest;
  onResult: (testId: string, isCorrect: boolean) => void;
}

export function CrypticTestComponent({ test, onResult }: CrypticTestProps) {
  const [answer, setAnswer] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const correct = answer.toLowerCase().trim() === test.answer.toLowerCase().trim();
    setIsCorrect(correct);
    onResult(test.id, correct);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="space-y-4">
        <div>
          <p className="text-lg font-medium text-gray-900">{test.prompt}</p>
          <p className="text-sm text-gray-500">Answer length: {test.answerLength}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor={`answer-${test.id}`} className="sr-only">
              Your answer
            </label>
            <input
              type="text"
              id={`answer-${test.id}`}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="Enter your answer"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Submit
            </button>
            <button
              type="button"
              onClick={() => setShowAnswer(!showAnswer)}
              className="inline-flex justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {showAnswer ? 'Hide Answer' : 'Show Answer'}
            </button>
          </div>
        </form>

        {isCorrect !== null && (
          <div className={`p-3 rounded-md ${
            isCorrect ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {isCorrect ? 'Correct!' : 'Incorrect. Try again.'}
          </div>
        )}

        {showAnswer && (
          <div className="p-3 bg-gray-50 rounded-md">
            <p className="text-sm font-medium text-gray-900">Answer:</p>
            <p className="mt-1 text-sm text-gray-700">{test.answer}</p>
          </div>
        )}
      </div>
    </div>
  );
} 