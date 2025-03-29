import { CrypticTest } from '../types/cryptic';

interface CrypticTestProps {
  test: CrypticTest;
}

export function CrypticTestComponent({ test }: CrypticTestProps) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm mb-2">
      <div className="flex justify-between items-baseline">
        <p className="text-secondary-900">{test.prompt}</p>
        <div className="flex items-center gap-4 ml-4">
          <span className="text-sm text-secondary-500">({test.answerLength})</span>
          <span className="text-sm text-secondary-700">{test.answer}</span>
        </div>
      </div>
    </div>
  );
} 