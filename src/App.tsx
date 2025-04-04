import { useState } from 'react'
import { TestCategory } from './types/llm'
import { CrypticTestComponent } from './components/CrypticTest'
import { ConfigOverlay } from './components/ConfigOverlay'
import { crypticTests } from './types/cryptic'
import { TestSuiteManager } from './components/TestSuiteManager'

function App() {
  const [selectedCategory, setSelectedCategory] = useState<TestCategory | null>(null)
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [testResults, setTestResults] = useState<Map<string, boolean>>(new Map())
  const [isTestSuiteOpen, setIsTestSuiteOpen] = useState(false)

  const handleTestResult = (testId: string, isCorrect: boolean) => {
    setTestResults(prev => new Map(prev).set(testId, isCorrect))
  }

  const renderTests = () => {
    if (!selectedCategory) return null

    switch (selectedCategory) {
      case TestCategory.CRYPTIC:
        return (
          <div className="space-y-2">
            {crypticTests.map(test => (
              <CrypticTestComponent
                key={test.id}
                test={test}
                onResult={handleTestResult}
              />
            ))}
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-secondary-50">
      {/* Header */}
      <header className="bg-white border-b border-secondary-200">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <h1 className="text-2xl font-bold text-secondary-900">Bastard Bench</h1>
              <p className="text-sm text-secondary-500">LLM Benchmarking Suite</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsTestSuiteOpen(true)}
              className="p-2 rounded-lg hover:bg-secondary-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-150"
              aria-label="Test Suites"
            >
              <svg className="h-5 w-5 text-secondary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </button>
            <button
              onClick={() => setIsConfigOpen(true)}
              className="p-2 rounded-lg hover:bg-secondary-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-150"
              aria-label="Settings"
            >
              <svg className="h-5 w-5 text-secondary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <aside className="w-72 bg-white border-r border-secondary-200 overflow-y-auto">
          <div className="p-6">
            <h2 className="text-xs font-semibold text-secondary-500 uppercase tracking-wider mb-4">
              Test Categories
            </h2>
            <nav className="space-y-2">
              {Object.values(TestCategory).map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-150 ${
                    selectedCategory === category
                      ? 'bg-primary-50 text-primary-700 border border-primary-100'
                      : 'text-secondary-700 hover:bg-secondary-50 hover:text-secondary-900'
                  }`}
                >
                  <svg className="mr-3 h-5 w-5 text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  {category.charAt(0).toUpperCase() + category.slice(1)} Tests
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-secondary-50 p-8">
          <div className="max-w-7xl mx-auto">
            {selectedCategory ? (
              <div className="bg-white shadow-sm rounded-lg">
                <div className="px-6 py-5">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-secondary-900">
                        {selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} Tests
                      </h2>
                      <p className="mt-1 text-sm text-secondary-500">
                        View test cases and their answers
                      </p>
                    </div>
                  </div>
                  <div className="border-t border-secondary-200 pt-6">
                    {renderTests()}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="bg-white p-12 rounded-xl shadow-sm">
                  <svg className="mx-auto h-12 w-12 text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <h3 className="mt-4 text-lg font-medium text-secondary-900">No category selected</h3>
                  <p className="mt-2 text-sm text-secondary-500">Select a test category from the sidebar to begin</p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Test Suite Manager Modal */}
      {isTestSuiteOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-semibold">Test Suite Manager</h2>
              <button
                onClick={() => setIsTestSuiteOpen(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <TestSuiteManager />
          </div>
        </div>
      )}

      <ConfigOverlay
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
      />
    </div>
  )
}

export default App
