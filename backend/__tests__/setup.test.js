/**
 * Setup verification test
 * This test ensures that the Jest testing infrastructure is working correctly
 */

describe('Jest Setup Verification', () => {
  it('should run a basic test', () => {
    expect(true).toBe(true);
  });

  it('should have access to environment variables', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.JWT_SECRET_KEY).toBeDefined();
  });

  it('should support async/await', async () => {
    const promise = Promise.resolve('test');
    const result = await promise;
    expect(result).toBe('test');
  });
});
