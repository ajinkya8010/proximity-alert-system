# Backend Tests

This directory contains all tests for the backend application.

## Test Structure

```
__tests__/
├── utils/           # Unit tests for utility functions
├── models/          # Unit tests for Mongoose models
├── controllers/     # Unit tests for controllers
├── middlewares/     # Unit tests for middleware
├── services/        # Unit tests for services
├── integration/     # Integration tests for API endpoints
└── setup.test.js    # Setup verification test
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (auto-rerun on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests with verbose output
npm run test:verbose
```

## Coverage Reports

After running `npm run test:coverage`, open the HTML report:
```
backend/coverage/lcov-report/index.html
```

## Writing Tests

### Test File Naming
- Unit tests: `<filename>.test.js`
- Integration tests: `<feature>.integration.test.js`

### Test Structure (AAA Pattern)
```javascript
describe('Feature Name', () => {
  it('should do something specific', () => {
    // Arrange - Set up test data
    const input = 'test';
    
    // Act - Execute the function
    const result = myFunction(input);
    
    // Assert - Verify the result
    expect(result).toBe('expected');
  });
});
```

### Async Tests
```javascript
it('should handle async operations', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});
```

### Mocking
```javascript
// Mock external dependencies
jest.mock('../config/redis.js', () => ({
  redis: {
    lpush: jest.fn(),
  },
}));
```

## Current Coverage

Run `npm run test:coverage` to see current coverage statistics.

Target: 70%+ coverage across all files.
