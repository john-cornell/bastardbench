import { useState } from 'react'
import { TestCategory } from './types/llm'
import { CrypticTestComponent } from './components/CrypticTest'
import { ConfigOverlay } from './components/ConfigOverlay'
import { crypticTests } from './types/cryptic'
import { TestSuiteManager } from './components/TestSuiteManager'

function App() {
  const [selectedCategory, setSelectedCategory] = useState<TestCategory | null>(null)
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [isTestSuiteOpen, setIsTestSuiteOpen] = useState(false)

  const handleCloseTestSuite = () => {
    setIsTestSuiteOpen(false)
  }

  const renderTests = () => {
    if (!selectedCategory) return null

    switch (selectedCategory) {
      case TestCategory.CRYPTIC:
        return (
          <div className="max-w-4xl mx-auto p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Cryptic Tests</h2>
              <p className="text-gray-600 mt-2">View test cases and their answers</p>
            </div>
            <div className="space-y-4">
              {crypticTests.map(test => (
                <CrypticTestComponent
                  key={test.id}
                  test={test}
                />
              ))}
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-gray-900">BastardBench</h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <button
                  onClick={() => setSelectedCategory(TestCategory.CRYPTIC)}
                  className={`${
                    selectedCategory === TestCategory.CRYPTIC
                      ? 'border-primary-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  Cryptic Tests
                </button>
              </div>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => setIsTestSuiteOpen(true)}
                className="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Test Suite
              </button>
              <button
                onClick={() => setIsConfigOpen(true)}
                className="ml-3 inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Settings
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main>
        {renderTests()}
      </main>

      {isConfigOpen && (
        <ConfigOverlay
          isOpen={isConfigOpen}
          onClose={() => setIsConfigOpen(false)}
        />
      )}

      {isTestSuiteOpen && (
        <TestSuiteManager
          isOpen={isTestSuiteOpen}
          onClose={handleCloseTestSuite}
        />
      )}
    </div>
  )
}

export default App
