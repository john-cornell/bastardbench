# BastardBench

A comprehensive benchmarking suite for evaluating LLM performance across various categories of tests.

## Current Status

The project is actively under development. Currently, the Cryptic test suite is fully functional and includes:

- 56 carefully crafted cryptic crossword clues
- Automated test execution and evaluation
- Detailed logging of test results
- Support for multiple LLM providers

## Test Categories

### Cryptic Tests (Working)
- A collection of cryptic crossword clues
- Each test includes:
  - A cryptic clue
  - Expected answer length
  - Correct answer
- Tests are designed to evaluate LLM's ability to solve wordplay and cryptic definitions

### Other Categories (In Development)
- Additional test categories are being developed
- More details will be added as they become available

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Start the development server:
   ```bash
   pnpm dev
   ```

## Project Structure

```
src/
  ├── adapters/        # LLM provider adapters
  ├── components/      # React components
  ├── types/          # TypeScript type definitions
  ├── utils/          # Utility functions
  └── server/         # Server-side code
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
