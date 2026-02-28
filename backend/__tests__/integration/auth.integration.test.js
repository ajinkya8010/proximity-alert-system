/**
 * Integration tests for Auth Controller
 * Tests registration, login, and logout endpoints
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import cookieParser from 'cookie-parser';
import { User } from '../../models/user.model.js';
import authRoute from '../../routes/auth.route.js';

let mongoServer;
let app;

// Setup: Create Express app and start in-memory MongoDB
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  // Create Express app for testing
  app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/auth', authRoute);
});

// Cleanup: Close connection and stop MongoDB
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Clear database between tests
afterEach(async () => {
  await User.deleteMany({});
});

describe('Auth Controller Integration Tests', () => {
  const validUserData = {
    name: 'John Doe',
    email: 'john@example.com',
    password: 'password123',
    interests: ['blood_donation', 'jobs'],
    location: {
      type: 'Point',
      coordinates: [77.5946, 12.9716]
    },
    alertRadius: 5000
  };

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.name).toBe(validUserData.name);
      expect(response.body.email).toBe(validUserData.email);
      expect(response.body).not.toHaveProperty('password'); // Password should not be in response
      expect(response.body.interests).toEqual(validUserData.interests);
      expect(response.body.alertRadius).toBe(validUserData.alertRadius);
    });

    it('should hash the password before saving', async () => {
      await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);

      const user = await User.findOne({ email: validUserData.email });
      
      expect(user.password).not.toBe(validUserData.password);
      expect(user.password).toMatch(/^\$2[aby]\$/); // bcrypt hash pattern
    });

    it('should reject duplicate email registration', async () => {
      // Register first user
      await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);

      // Try to register with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(400);

      expect(response.body.message).toBe('User with this email already exists');
    });

    it('should reject registration without required fields', async () => {
      const incompleteData = {
        name: 'John Doe',
        email: 'john@example.com'
        // Missing password and location
      };

      await request(app)
        .post('/api/auth/register')
        .send(incompleteData)
        .expect(500); // Mongoose validation error
    });

    it('should register user with minimal required fields', async () => {
      const minimalData = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'password456',
        location: {
          type: 'Point',
          coordinates: [0, 0]
        }
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(minimalData)
        .expect(201);

      expect(response.body.interests).toEqual([]); // Default empty array
      expect(response.body.alertRadius).toBe(3000); // Default value
    });

    it('should convert email to lowercase', async () => {
      const upperCaseEmail = {
        ...validUserData,
        email: 'JOHN@EXAMPLE.COM'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(upperCaseEmail)
        .expect(201);

      expect(response.body.email).toBe('john@example.com');
    });

    it('should trim whitespace from name', async () => {
      const dataWithSpaces = {
        ...validUserData,
        name: '  John Doe  '
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(dataWithSpaces)
        .expect(201);

      expect(response.body.name).toBe('John Doe');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Register a user before each login test
      await request(app)
        .post('/api/auth/register')
        .send(validUserData);
    });

    it('should login successfully with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: validUserData.email,
          password: validUserData.password
        })
        .expect(200);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.email).toBe(validUserData.email);
      expect(response.body).not.toHaveProperty('password');
    });

    it('should set JWT token in httpOnly cookie', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: validUserData.email,
          password: validUserData.password
        })
        .expect(200);

      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toMatch(/token=/);
      expect(cookies[0]).toMatch(/HttpOnly/);
    });

    it('should reject login with non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        })
        .expect(400);

      expect(response.body.message).toBe('User not found. Please register.');
    });

    it('should reject login with incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: validUserData.email,
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should handle case-insensitive email login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'JOHN@EXAMPLE.COM', // Uppercase
          password: validUserData.password
        })
        .expect(200);

      expect(response.body.email).toBe(validUserData.email.toLowerCase());
    });

    it('should return user data without password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: validUserData.email,
          password: validUserData.password
        })
        .expect(200);

      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('interests');
      expect(response.body).toHaveProperty('location');
      expect(response.body).not.toHaveProperty('password');
    });

    it('should set cookie with correct maxAge', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: validUserData.email,
          password: validUserData.password
        })
        .expect(200);

      const cookies = response.headers['set-cookie'];
      const tokenCookie = cookies[0];
      
      // Cookie should have Max-Age set (7 days in seconds)
      expect(tokenCookie).toMatch(/Max-Age=/);
    });

    it('should reject login without email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          password: validUserData.password
        })
        .expect(400);

      expect(response.body.message).toBe('User not found. Please register.');
    });

    it('should reject login without password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: validUserData.email
        })
        .expect(401);

      expect(response.body.message).toBe('Invalid credentials');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(200);

      expect(response.body.message).toBe('Logout successful');
    });

    it('should clear the token cookie', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(200);

      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      
      // Cookie should be cleared (empty value or expired)
      const tokenCookie = cookies[0];
      expect(tokenCookie).toMatch(/token=/);
    });

    it('should logout even without being logged in', async () => {
      // Logout without prior login should still work
      await request(app)
        .post('/api/auth/logout')
        .expect(200);
    });
  });

  describe('Complete authentication flow', () => {
    it('should complete register -> login -> logout flow', async () => {
      // 1. Register
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);

      const userId = registerResponse.body._id;

      // 2. Login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: validUserData.email,
          password: validUserData.password
        })
        .expect(200);

      expect(loginResponse.body._id).toBe(userId);
      
      const cookies = loginResponse.headers['set-cookie'];
      expect(cookies).toBeDefined();

      // 3. Logout
      await request(app)
        .post('/api/auth/logout')
        .expect(200);
    });

    it('should not allow login after logout without re-authentication', async () => {
      // Register and login
      await request(app)
        .post('/api/auth/register')
        .send(validUserData);

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: validUserData.email,
          password: validUserData.password
        });

      const cookies = loginResponse.headers['set-cookie'];

      // Logout
      await request(app)
        .post('/api/auth/logout')
        .expect(200);

      // The cookie is cleared, so subsequent requests won't have valid auth
      // (This would be tested in protected route tests)
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle malformed JSON in request body', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);
    });

    it('should handle empty request body for registration', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({})
        .expect(500);
    });

    it('should handle empty request body for login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);

      expect(response.body.message).toBe('User not found. Please register.');
    });

    it('should handle very long passwords', async () => {
      const longPassword = 'a'.repeat(1000);
      const userData = {
        ...validUserData,
        password: longPassword
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Should be able to login with long password
      await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: longPassword
        })
        .expect(200);
    });

    it('should handle special characters in password', async () => {
      const specialPassword = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const userData = {
        ...validUserData,
        email: 'special@example.com',
        password: specialPassword
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: specialPassword
        })
        .expect(200);
    });
  });
});
