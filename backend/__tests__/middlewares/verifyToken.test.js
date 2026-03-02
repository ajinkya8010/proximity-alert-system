/**
 * Unit tests for JWT Verification Middleware
 * Tests token validation, error handling, and userId attachment
 */

import jwt from 'jsonwebtoken';
import { verifyToken } from '../../middlewares/verifyToken.js';

describe('verifyToken Middleware Unit Tests', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    // Mock request object
    req = {
      cookies: {}
    };

    // Mock response object
    res = {
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        this.body = data;
        return this;
      },
      statusCode: null,
      body: null
    };

    // Mock next function
    next = (() => {
      let called = false;
      const fn = () => { called = true; };
      fn.wasCalled = () => called;
      return fn;
    })();

    // Set JWT secret for testing
    process.env.JWT_SECRET_KEY = 'test-jwt-secret-key-for-testing-only';
  });

  describe('Missing Token', () => {
    it('should return 401 when token is not provided', () => {
      verifyToken(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe('Not Authenticated!');
      expect(next.wasCalled()).toBe(false);
    });

    it('should return 401 when token is undefined', () => {
      req.cookies.token = undefined;

      verifyToken(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe('Not Authenticated!');
      expect(next.wasCalled()).toBe(false);
    });

    it('should return 401 when token is null', () => {
      req.cookies.token = null;

      verifyToken(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe('Not Authenticated!');
      expect(next.wasCalled()).toBe(false);
    });

    it('should return 401 when token is empty string', () => {
      req.cookies.token = '';

      verifyToken(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe('Not Authenticated!');
      expect(next.wasCalled()).toBe(false);
    });
  });

  describe('Invalid Token', () => {
    it('should return 403 for malformed token', (done) => {
      req.cookies.token = 'invalid-token-format';

      verifyToken(req, res, next);

      // Wait for async jwt.verify callback
      setTimeout(() => {
        expect(res.statusCode).toBe(403);
        expect(res.body.message).toBe('Token is not Valid!');
        expect(next.wasCalled()).toBe(false);
        done();
      }, 50);
    });

    it('should return 403 for token with invalid signature', (done) => {
      // Create token with different secret
      const invalidToken = jwt.sign({ id: '123' }, 'wrong-secret');
      req.cookies.token = invalidToken;

      verifyToken(req, res, next);

      setTimeout(() => {
        expect(res.statusCode).toBe(403);
        expect(res.body.message).toBe('Token is not Valid!');
        expect(next.wasCalled()).toBe(false);
        done();
      }, 50);
    });

    it('should return 403 for expired token', (done) => {
      // Create expired token
      const expiredToken = jwt.sign(
        { id: '123' },
        process.env.JWT_SECRET_KEY,
        { expiresIn: '-1s' } // Already expired
      );
      req.cookies.token = expiredToken;

      verifyToken(req, res, next);

      setTimeout(() => {
        expect(res.statusCode).toBe(403);
        expect(res.body.message).toBe('Token is not Valid!');
        expect(next.wasCalled()).toBe(false);
        done();
      }, 50);
    });

    it('should return 403 for token with invalid structure', (done) => {
      req.cookies.token = 'not.a.jwt';

      verifyToken(req, res, next);

      setTimeout(() => {
        expect(res.statusCode).toBe(403);
        expect(res.body.message).toBe('Token is not Valid!');
        expect(next.wasCalled()).toBe(false);
        done();
      }, 50);
    });
  });

  describe('Valid Token', () => {
    it('should call next() with valid token', (done) => {
      const userId = '507f1f77bcf86cd799439011';
      const validToken = jwt.sign({ id: userId }, process.env.JWT_SECRET_KEY);
      req.cookies.token = validToken;

      verifyToken(req, res, next);

      // Wait for async jwt.verify callback
      setTimeout(() => {
        expect(next.wasCalled()).toBe(true);
        expect(req.userId).toBe(userId);
        expect(res.statusCode).toBeNull();
        done();
      }, 50);
    });

    it('should attach userId to request object', (done) => {
      const userId = '123456789';
      const validToken = jwt.sign({ id: userId }, process.env.JWT_SECRET_KEY);
      req.cookies.token = validToken;

      verifyToken(req, res, next);

      setTimeout(() => {
        expect(req.userId).toBe(userId);
        expect(req).toHaveProperty('userId');
        done();
      }, 50);
    });

    it('should work with token containing additional payload data', (done) => {
      const userId = 'user-123';
      const validToken = jwt.sign(
        { 
          id: userId,
          email: 'test@example.com',
          role: 'user'
        },
        process.env.JWT_SECRET_KEY
      );
      req.cookies.token = validToken;

      verifyToken(req, res, next);

      setTimeout(() => {
        expect(req.userId).toBe(userId);
        expect(next.wasCalled()).toBe(true);
        done();
      }, 50);
    });

    it('should work with token that has long expiration', (done) => {
      const userId = 'user-456';
      const validToken = jwt.sign(
        { id: userId },
        process.env.JWT_SECRET_KEY,
        { expiresIn: '7d' }
      );
      req.cookies.token = validToken;

      verifyToken(req, res, next);

      setTimeout(() => {
        expect(req.userId).toBe(userId);
        expect(next.wasCalled()).toBe(true);
        done();
      }, 50);
    });

    it('should work with token containing ObjectId-like string', (done) => {
      const userId = '507f1f77bcf86cd799439011'; // Valid MongoDB ObjectId format
      const validToken = jwt.sign({ id: userId }, process.env.JWT_SECRET_KEY);
      req.cookies.token = validToken;

      verifyToken(req, res, next);

      setTimeout(() => {
        expect(req.userId).toBe(userId);
        expect(req.userId).toHaveLength(24);
        expect(next.wasCalled()).toBe(true);
        done();
      }, 50);
    });
  });

  describe('Edge Cases', () => {
    it('should handle token with whitespace', (done) => {
      req.cookies.token = '  ';

      verifyToken(req, res, next);

      setTimeout(() => {
        expect(res.statusCode).toBe(403);
        expect(res.body.message).toBe('Token is not Valid!');
        expect(next.wasCalled()).toBe(false);
        done();
      }, 50);
    });

    it('should not call next() multiple times', (done) => {
      const userId = 'user-789';
      const validToken = jwt.sign({ id: userId }, process.env.JWT_SECRET_KEY);
      req.cookies.token = validToken;

      let callCount = 0;
      const countingNext = () => { callCount++; };

      verifyToken(req, res, countingNext);

      setTimeout(() => {
        expect(callCount).toBe(1);
        done();
      }, 50);
    });

    it('should handle token without id in payload', (done) => {
      // Token without 'id' field
      const invalidPayloadToken = jwt.sign(
        { userId: '123' }, // Wrong field name
        process.env.JWT_SECRET_KEY
      );
      req.cookies.token = invalidPayloadToken;

      verifyToken(req, res, next);

      setTimeout(() => {
        // Should still call next but userId will be undefined
        expect(next.wasCalled()).toBe(true);
        expect(req.userId).toBeUndefined();
        done();
      }, 50);
    });

    it('should handle very long token', (done) => {
      const longPayload = {
        id: '123',
        data: 'x'.repeat(10000)
      };
      const longToken = jwt.sign(longPayload, process.env.JWT_SECRET_KEY);
      req.cookies.token = longToken;

      verifyToken(req, res, next);

      setTimeout(() => {
        expect(next.wasCalled()).toBe(true);
        expect(req.userId).toBe('123');
        done();
      }, 50);
    });

    it('should not modify response if token is valid', (done) => {
      const userId = 'user-999';
      const validToken = jwt.sign({ id: userId }, process.env.JWT_SECRET_KEY);
      req.cookies.token = validToken;

      verifyToken(req, res, next);

      setTimeout(() => {
        expect(res.statusCode).toBeNull();
        expect(res.body).toBeNull();
        done();
      }, 50);
    });
  });

  describe('Request Object Modification', () => {
    it('should only add userId property to request', (done) => {
      const userId = 'test-user';
      const validToken = jwt.sign({ id: userId }, process.env.JWT_SECRET_KEY);
      req.cookies.token = validToken;

      const originalKeys = Object.keys(req);

      verifyToken(req, res, next);

      setTimeout(() => {
        const newKeys = Object.keys(req);
        const addedKeys = newKeys.filter(key => !originalKeys.includes(key));
        
        expect(addedKeys).toEqual(['userId']);
        done();
      }, 50);
    });

    it('should not modify cookies object', (done) => {
      const userId = 'test-user';
      const validToken = jwt.sign({ id: userId }, process.env.JWT_SECRET_KEY);
      req.cookies.token = validToken;

      const originalToken = req.cookies.token;

      verifyToken(req, res, next);

      setTimeout(() => {
        expect(req.cookies.token).toBe(originalToken);
        done();
      }, 50);
    });
  });

  describe('Response Object Behavior', () => {
    it('should chain status and json methods for 401', () => {
      verifyToken(req, res, next);

      expect(res.statusCode).toBe(401);
      expect(res.body).toEqual({ message: 'Not Authenticated!' });
    });

    it('should chain status and json methods for 403', (done) => {
      req.cookies.token = 'invalid-token';

      verifyToken(req, res, next);

      setTimeout(() => {
        expect(res.statusCode).toBe(403);
        expect(res.body).toEqual({ message: 'Token is not Valid!' });
        done();
      }, 50);
    });

    it('should return response object from status()', () => {
      const result = verifyToken(req, res, next);

      // The middleware returns the result of res.status().json()
      expect(result).toBe(res);
    });
  });

  describe('JWT Secret Key', () => {
    it('should use JWT_SECRET_KEY from environment', (done) => {
      const customSecret = 'custom-test-secret';
      const originalSecret = process.env.JWT_SECRET_KEY;
      process.env.JWT_SECRET_KEY = customSecret;

      const userId = 'user-custom';
      const validToken = jwt.sign({ id: userId }, customSecret);
      req.cookies.token = validToken;

      verifyToken(req, res, next);

      setTimeout(() => {
        expect(req.userId).toBe(userId);
        expect(next.wasCalled()).toBe(true);
        
        // Restore original secret
        process.env.JWT_SECRET_KEY = originalSecret;
        done();
      }, 50);
    });

    it('should fail with token signed with different secret', (done) => {
      const wrongSecret = 'wrong-secret-key';
      const userId = 'user-wrong';
      const invalidToken = jwt.sign({ id: userId }, wrongSecret);
      req.cookies.token = invalidToken;

      verifyToken(req, res, next);

      setTimeout(() => {
        expect(res.statusCode).toBe(403);
        expect(next.wasCalled()).toBe(false);
        done();
      }, 50);
    });
  });

  describe('Concurrent Requests', () => {
    it('should handle multiple simultaneous verifications', (done) => {
      const requests = [];
      const responses = [];
      const nexts = [];

      // Create 5 concurrent requests
      for (let i = 0; i < 5; i++) {
        const userId = `user-${i}`;
        const token = jwt.sign({ id: userId }, process.env.JWT_SECRET_KEY);
        
        requests.push({
          cookies: { token }
        });

        responses.push({
          status: function(code) {
            this.statusCode = code;
            return this;
          },
          json: function(data) {
            this.body = data;
            return this;
          },
          statusCode: null,
          body: null
        });

        let called = false;
        const nextFn = () => { called = true; };
        nextFn.wasCalled = () => called;
        nexts.push(nextFn);
      }

      // Verify all tokens
      requests.forEach((req, i) => {
        verifyToken(req, responses[i], nexts[i]);
      });

      setTimeout(() => {
        // All should succeed
        requests.forEach((req, i) => {
          expect(req.userId).toBe(`user-${i}`);
          expect(nexts[i].wasCalled()).toBe(true);
        });
        done();
      }, 100);
    });
  });

  describe('Token Payload Variations', () => {
    it('should handle numeric user id', (done) => {
      const userId = 12345;
      const validToken = jwt.sign({ id: userId }, process.env.JWT_SECRET_KEY);
      req.cookies.token = validToken;

      verifyToken(req, res, next);

      setTimeout(() => {
        expect(req.userId).toBe(userId);
        expect(next.wasCalled()).toBe(true);
        done();
      }, 50);
    });

    it('should handle UUID format user id', (done) => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const validToken = jwt.sign({ id: userId }, process.env.JWT_SECRET_KEY);
      req.cookies.token = validToken;

      verifyToken(req, res, next);

      setTimeout(() => {
        expect(req.userId).toBe(userId);
        expect(next.wasCalled()).toBe(true);
        done();
      }, 50);
    });

    it('should handle special characters in user id', (done) => {
      const userId = 'user@123#test';
      const validToken = jwt.sign({ id: userId }, process.env.JWT_SECRET_KEY);
      req.cookies.token = validToken;

      verifyToken(req, res, next);

      setTimeout(() => {
        expect(req.userId).toBe(userId);
        expect(next.wasCalled()).toBe(true);
        done();
      }, 50);
    });
  });
});
