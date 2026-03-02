// Global test setup file
// This runs once before all tests

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET_KEY = 'test-jwt-secret-key-for-testing-only';
process.env.PORT = '3002'; // Different port for testing

// Suppress console logs during tests (optional - comment out if you need to debug)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };
