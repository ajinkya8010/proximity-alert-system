/**
 * Integration tests for Alert Controller
 * Tests alert creation, geospatial queries, filtering, and deletion
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import cookieParser from 'cookie-parser';
import { User } from '../../models/user.model.js';
import { Alert } from '../../models/alert.model.js';
import authRoute from '../../routes/auth.route.js';
import alertRoute from '../../routes/alert.route.js';

let mongoServer;
let app;
let mockRedisPub;
let publishCalls;

// Setup: Create Express app and start in-memory MongoDB
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  // Mock Redis publisher
  publishCalls = [];
  mockRedisPub = {
    publish: async (channel, message) => {
      publishCalls.push({ channel, message });
      return 1;
    }
  };

  // Create Express app for testing
  app = express();
  app.use(express.json());
  app.use(cookieParser());
  
  // Set mock Redis publisher
  app.set('redisPub', mockRedisPub);
  
  app.use('/api/auth', authRoute);
  app.use('/api/alerts', alertRoute);
});

// Cleanup: Close connection and stop MongoDB
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Clear database between tests
afterEach(async () => {
  await User.deleteMany({});
  await Alert.deleteMany({});
  publishCalls = [];
});

describe('Alert Controller Integration Tests', () => {
  const validUserData = {
    name: 'John Doe',
    email: 'john@example.com',
    password: 'password123',
    interests: ['blood_donation', 'jobs'],
    location: {
      type: 'Point',
      coordinates: [77.5946, 12.9716] // Bangalore
    },
    alertRadius: 5000
  };

  const anotherUserData = {
    name: 'Jane Smith',
    email: 'jane@example.com',
    password: 'password456',
    interests: ['tutoring'],
    location: {
      type: 'Point',
      coordinates: [77.6, 12.98] // ~5km from Bangalore
    },
    alertRadius: 3000
  };

  const farUserData = {
    name: 'Bob Johnson',
    email: 'bob@example.com',
    password: 'password789',
    interests: ['jobs'],
    location: {
      type: 'Point',
      coordinates: [80.2707, 13.0827] // Chennai (~300km away)
    },
    alertRadius: 5000
  };

  // Helper function to register and login a user
  const registerAndLogin = async (userData = validUserData) => {
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(userData);

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: userData.email,
        password: userData.password
      });

    const cookies = loginResponse.headers['set-cookie'];
    return { cookies, user: registerResponse.body };
  };

  describe('POST /api/alerts', () => {
    describe('Authentication', () => {
      it('should reject request without authentication token', async () => {
        const response = await request(app)
          .post('/api/alerts')
          .send({
            title: 'Test Alert',
            category: 'blood_donation',
            description: 'Test description',
            location: { coordinates: [77.5946, 12.9716] }
          })
          .expect(401);

        expect(response.body.message).toBe('Not Authenticated!');
      });

      it('should reject request with invalid token', async () => {
        const response = await request(app)
          .post('/api/alerts')
          .set('Cookie', ['token=invalid-token'])
          .send({
            title: 'Test Alert',
            category: 'blood_donation',
            description: 'Test description',
            location: { coordinates: [77.5946, 12.9716] }
          })
          .expect(403);

        expect(response.body.message).toBe('Token is not Valid!');
      });
    });

    describe('Alert Creation', () => {
      it('should create alert successfully with valid data', async () => {
        const { cookies, user } = await registerAndLogin();

        const alertData = {
          title: 'Urgent Blood Donation Needed',
          category: 'blood_donation',
          description: 'O+ blood needed urgently at Apollo Hospital',
          location: { coordinates: [77.5946, 12.9716] }
        };

        const response = await request(app)
          .post('/api/alerts')
          .set('Cookie', cookies)
          .send(alertData)
          .expect(201);

        expect(response.body.message).toBe('Alert created successfully');
        expect(response.body.alert).toHaveProperty('_id');
        expect(response.body.alert.title).toBe(alertData.title);
        expect(response.body.alert.category).toBe(alertData.category);
        expect(response.body.alert.description).toBe(alertData.description);
        expect(response.body.alert.createdBy.toString()).toBe(user._id);
      });

      it('should save alert to database', async () => {
        const { cookies } = await registerAndLogin();

        const alertData = {
          title: 'Test Alert',
          category: 'jobs',
          description: 'Job opportunity available',
          location: { coordinates: [77.5946, 12.9716] }
        };

        const response = await request(app)
          .post('/api/alerts')
          .set('Cookie', cookies)
          .send(alertData)
          .expect(201);

        const savedAlert = await Alert.findById(response.body.alert._id);
        expect(savedAlert).not.toBeNull();
        expect(savedAlert.title).toBe(alertData.title);
      });

      it('should publish alert to Redis channel', async () => {
        const { cookies } = await registerAndLogin();

        const alertData = {
          title: 'Test Alert',
          category: 'blood_donation',
          description: 'Test description',
          location: { coordinates: [77.5946, 12.9716] }
        };

        await request(app)
          .post('/api/alerts')
          .set('Cookie', cookies)
          .send(alertData)
          .expect(201);

        expect(publishCalls).toHaveLength(1);
        expect(publishCalls[0].channel).toBe('alerts_channel');

        const publishedData = JSON.parse(publishCalls[0].message);
        expect(publishedData).toHaveProperty('alertId');
        expect(publishedData).toHaveProperty('alert');
        expect(publishedData).toHaveProperty('timestamp');
      });

      it('should create alert with all valid categories', async () => {
        const { cookies } = await registerAndLogin();

        const categories = [
          'blood_donation',
          'jobs',
          'tutoring',
          'lost_and_found',
          'urgent_help',
          'food_giveaway',
          'disaster_alert'
        ];

        for (const category of categories) {
          const response = await request(app)
            .post('/api/alerts')
            .set('Cookie', cookies)
            .send({
              title: `Test ${category}`,
              category,
              description: 'Test description',
              location: { coordinates: [77.5946, 12.9716] }
            })
            .expect(201);

          expect(response.body.alert.category).toBe(category);
        }
      });
    });

    describe('Validation', () => {
      it('should reject alert without title', async () => {
        const { cookies } = await registerAndLogin();

        const response = await request(app)
          .post('/api/alerts')
          .set('Cookie', cookies)
          .send({
            category: 'blood_donation',
            description: 'Test description',
            location: { coordinates: [77.5946, 12.9716] }
          })
          .expect(400);

        expect(response.body.message).toBe('Title is required');
      });

      it('should reject alert without category', async () => {
        const { cookies } = await registerAndLogin();

        const response = await request(app)
          .post('/api/alerts')
          .set('Cookie', cookies)
          .send({
            title: 'Test Alert',
            description: 'Test description',
            location: { coordinates: [77.5946, 12.9716] }
          })
          .expect(400);

        expect(response.body.message).toBe('Category is required');
      });

      it('should reject alert without description', async () => {
        const { cookies } = await registerAndLogin();

        const response = await request(app)
          .post('/api/alerts')
          .set('Cookie', cookies)
          .send({
            title: 'Test Alert',
            category: 'blood_donation',
            location: { coordinates: [77.5946, 12.9716] }
          })
          .expect(400);

        expect(response.body.message).toBe('Description is required');
      });

      it('should reject alert without location', async () => {
        const { cookies } = await registerAndLogin();

        const response = await request(app)
          .post('/api/alerts')
          .set('Cookie', cookies)
          .send({
            title: 'Test Alert',
            category: 'blood_donation',
            description: 'Test description'
          })
          .expect(400);

        expect(response.body.message).toBe('Valid location (longitude, latitude) is required');
      });

      it('should reject alert with invalid location format', async () => {
        const { cookies } = await registerAndLogin();

        const response = await request(app)
          .post('/api/alerts')
          .set('Cookie', cookies)
          .send({
            title: 'Test Alert',
            category: 'blood_donation',
            description: 'Test description',
            location: { coordinates: [77.5946] } // Missing latitude
          })
          .expect(400);

        expect(response.body.message).toBe('Valid location (longitude, latitude) is required');
      });

      it('should reject alert with invalid category', async () => {
        const { cookies } = await registerAndLogin();

        const response = await request(app)
          .post('/api/alerts')
          .set('Cookie', cookies)
          .send({
            title: 'Test Alert',
            category: 'invalid_category',
            description: 'Test description',
            location: { coordinates: [77.5946, 12.9716] }
          })
          .expect(500);

        expect(response.body.message).toBe('Server error');
      });
    });

    describe('Redis Error Handling', () => {
      it('should continue if Redis publish fails', async () => {
        const { cookies } = await registerAndLogin();

        // Mock Redis to throw error
        const originalPublish = mockRedisPub.publish;
        mockRedisPub.publish = async () => {
          throw new Error('Redis connection failed');
        };

        const response = await request(app)
          .post('/api/alerts')
          .set('Cookie', cookies)
          .send({
            title: 'Test Alert',
            category: 'blood_donation',
            description: 'Test description',
            location: { coordinates: [77.5946, 12.9716] }
          })
          .expect(201);

        expect(response.body.message).toBe('Alert created successfully');

        // Restore original function
        mockRedisPub.publish = originalPublish;
      });
    });
  });

  describe('GET /api/alerts', () => {
    it('should return empty array when no alerts exist', async () => {
      const response = await request(app)
        .get('/api/alerts')
        .expect(200);

      expect(response.body.alerts).toEqual([]);
    });

    it('should return all alerts sorted by createdAt descending', async () => {
      const { cookies, user } = await registerAndLogin();

      // Create multiple alerts with delays
      await request(app).post('/api/alerts').set('Cookie', cookies).send({
        title: 'First Alert',
        category: 'blood_donation',
        description: 'First',
        location: { coordinates: [77.5946, 12.9716] }
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      await request(app).post('/api/alerts').set('Cookie', cookies).send({
        title: 'Second Alert',
        category: 'jobs',
        description: 'Second',
        location: { coordinates: [77.6, 12.98] }
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      await request(app).post('/api/alerts').set('Cookie', cookies).send({
        title: 'Third Alert',
        category: 'tutoring',
        description: 'Third',
        location: { coordinates: [77.55, 12.95] }
      });

      const response = await request(app)
        .get('/api/alerts')
        .expect(200);

      expect(response.body.alerts).toHaveLength(3);
      expect(response.body.alerts[0].title).toBe('Third Alert');
      expect(response.body.alerts[1].title).toBe('Second Alert');
      expect(response.body.alerts[2].title).toBe('First Alert');
    });

    it('should not require authentication', async () => {
      const response = await request(app)
        .get('/api/alerts')
        .expect(200);

      expect(response.body).toHaveProperty('alerts');
    });
  });

  describe('GET /api/alerts/near', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/alerts/near')
        .expect(401);

      expect(response.body.message).toBe('Not Authenticated!');
    });

    it('should return alerts within user alertRadius', async () => {
      const { cookies: cookies1, user: user1 } = await registerAndLogin();
      const { cookies: cookies2 } = await registerAndLogin(anotherUserData);

      // Create alert near user1's location
      await request(app).post('/api/alerts').set('Cookie', cookies1).send({
        title: 'Nearby Alert',
        category: 'blood_donation',
        description: 'Close by',
        location: { coordinates: [77.595, 12.972] } // Very close to user1
      });

      // Create alert far from user1's location
      await request(app).post('/api/alerts').set('Cookie', cookies2).send({
        title: 'Far Alert',
        category: 'jobs',
        description: 'Far away',
        location: { coordinates: [80.2707, 13.0827] } // Chennai
      });

      const response = await request(app)
        .get('/api/alerts/near')
        .set('Cookie', cookies1)
        .expect(200);

      expect(response.body.alerts).toHaveLength(1);
      expect(response.body.alerts[0].title).toBe('Nearby Alert');
      expect(response.body.radius).toBe(5000);
    });

    it('should use user custom alertRadius', async () => {
      const customUser = {
        ...validUserData,
        email: 'custom@example.com',
        alertRadius: 1000 // 1km only
      };

      const { cookies } = await registerAndLogin(customUser);

      // Create alert 2km away
      await request(app).post('/api/alerts').set('Cookie', cookies).send({
        title: 'Medium Distance Alert',
        category: 'blood_donation',
        description: 'Test',
        location: { coordinates: [77.61, 12.99] }
      });

      const response = await request(app)
        .get('/api/alerts/near')
        .set('Cookie', cookies)
        .expect(200);

      expect(response.body.radius).toBe(1000);
      expect(response.body.alerts).toHaveLength(0); // Too far
    });

    it('should return error if user location not found', async () => {
      const { cookies, user } = await registerAndLogin();

      // Remove user location by deleting the user
      await User.findByIdAndDelete(user._id);

      const response = await request(app)
        .get('/api/alerts/near')
        .set('Cookie', cookies)
        .expect(404);

      expect(response.body.message).toBe('User location not found');
    });

    it('should return alerts sorted by createdAt descending', async () => {
      const { cookies } = await registerAndLogin();

      // Create multiple nearby alerts
      await request(app).post('/api/alerts').set('Cookie', cookies).send({
        title: 'First',
        category: 'blood_donation',
        description: 'Test',
        location: { coordinates: [77.595, 12.972] }
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      await request(app).post('/api/alerts').set('Cookie', cookies).send({
        title: 'Second',
        category: 'jobs',
        description: 'Test',
        location: { coordinates: [77.596, 12.973] }
      });

      const response = await request(app)
        .get('/api/alerts/near')
        .set('Cookie', cookies)
        .expect(200);

      expect(response.body.alerts[0].title).toBe('Second');
      expect(response.body.alerts[1].title).toBe('First');
    });
  });

  describe('GET /api/alerts/category/:category', () => {
    it('should return alerts for specific category', async () => {
      const { cookies } = await registerAndLogin();

      // Create alerts with different categories
      await request(app).post('/api/alerts').set('Cookie', cookies).send({
        title: 'Blood Alert',
        category: 'blood_donation',
        description: 'Test',
        location: { coordinates: [77.5946, 12.9716] }
      });

      await request(app).post('/api/alerts').set('Cookie', cookies).send({
        title: 'Job Alert',
        category: 'jobs',
        description: 'Test',
        location: { coordinates: [77.6, 12.98] }
      });

      const response = await request(app)
        .get('/api/alerts/category/blood_donation')
        .expect(200);

      expect(response.body.alerts).toHaveLength(1);
      expect(response.body.alerts[0].category).toBe('blood_donation');
    });

    it('should return empty array for category with no alerts', async () => {
      const response = await request(app)
        .get('/api/alerts/category/tutoring')
        .expect(200);

      expect(response.body.alerts).toEqual([]);
    });

    it('should not require authentication', async () => {
      const response = await request(app)
        .get('/api/alerts/category/jobs')
        .expect(200);

      expect(response.body).toHaveProperty('alerts');
    });

    it('should return alerts sorted by createdAt descending', async () => {
      const { cookies } = await registerAndLogin();

      await request(app).post('/api/alerts').set('Cookie', cookies).send({
        title: 'First Job',
        category: 'jobs',
        description: 'Test',
        location: { coordinates: [77.5946, 12.9716] }
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      await request(app).post('/api/alerts').set('Cookie', cookies).send({
        title: 'Second Job',
        category: 'jobs',
        description: 'Test',
        location: { coordinates: [77.6, 12.98] }
      });

      const response = await request(app)
        .get('/api/alerts/category/jobs')
        .expect(200);

      expect(response.body.alerts[0].title).toBe('Second Job');
      expect(response.body.alerts[1].title).toBe('First Job');
    });
  });

  describe('POST /api/alerts/near-by-category', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .post('/api/alerts/near-by-category')
        .send({ categories: ['blood_donation'] })
        .expect(401);

      expect(response.body.message).toBe('Not Authenticated!');
    });

    it('should return nearby alerts matching categories', async () => {
      const { cookies } = await registerAndLogin();

      // Create alerts with different categories
      await request(app).post('/api/alerts').set('Cookie', cookies).send({
        title: 'Blood Alert',
        category: 'blood_donation',
        description: 'Test',
        location: { coordinates: [77.595, 12.972] }
      });

      await request(app).post('/api/alerts').set('Cookie', cookies).send({
        title: 'Job Alert',
        category: 'jobs',
        description: 'Test',
        location: { coordinates: [77.596, 12.973] }
      });

      await request(app).post('/api/alerts').set('Cookie', cookies).send({
        title: 'Tutoring Alert',
        category: 'tutoring',
        description: 'Test',
        location: { coordinates: [77.597, 12.974] }
      });

      const response = await request(app)
        .post('/api/alerts/near-by-category')
        .set('Cookie', cookies)
        .send({ categories: ['blood_donation', 'jobs'] })
        .expect(200);

      expect(response.body.alerts).toHaveLength(2);
      expect(response.body.alerts.every(a => 
        ['blood_donation', 'jobs'].includes(a.category)
      )).toBe(true);
    });

    it('should reject empty categories array', async () => {
      const { cookies } = await registerAndLogin();

      const response = await request(app)
        .post('/api/alerts/near-by-category')
        .set('Cookie', cookies)
        .send({ categories: [] })
        .expect(400);

      expect(response.body.message).toBe('Categories must be a non-empty array.');
    });

    it('should reject non-array categories', async () => {
      const { cookies } = await registerAndLogin();

      const response = await request(app)
        .post('/api/alerts/near-by-category')
        .set('Cookie', cookies)
        .send({ categories: 'blood_donation' })
        .expect(400);

      expect(response.body.message).toBe('Categories must be a non-empty array.');
    });

    it('should reject invalid categories', async () => {
      const { cookies } = await registerAndLogin();

      const response = await request(app)
        .post('/api/alerts/near-by-category')
        .set('Cookie', cookies)
        .send({ categories: ['invalid_category', 'another_invalid'] })
        .expect(400);

      expect(response.body.message).toBe('No valid categories provided.');
    });

    it('should filter out invalid categories and use valid ones', async () => {
      const { cookies } = await registerAndLogin();

      await request(app).post('/api/alerts').set('Cookie', cookies).send({
        title: 'Blood Alert',
        category: 'blood_donation',
        description: 'Test',
        location: { coordinates: [77.595, 12.972] }
      });

      const response = await request(app)
        .post('/api/alerts/near-by-category')
        .set('Cookie', cookies)
        .send({ categories: ['blood_donation', 'invalid_category'] })
        .expect(200);

      expect(response.body.alerts).toHaveLength(1);
      expect(response.body.alerts[0].category).toBe('blood_donation');
    });

    it('should respect pagination parameters', async () => {
      const { cookies } = await registerAndLogin();

      // Create 5 alerts
      for (let i = 0; i < 5; i++) {
        await request(app).post('/api/alerts').set('Cookie', cookies).send({
          title: `Alert ${i}`,
          category: 'blood_donation',
          description: 'Test',
          location: { coordinates: [77.595 + i * 0.001, 12.972] }
        });
        await new Promise(resolve => setTimeout(resolve, 5));
      }

      const response = await request(app)
        .post('/api/alerts/near-by-category?page=1&limit=2')
        .set('Cookie', cookies)
        .send({ categories: ['blood_donation'] })
        .expect(200);

      expect(response.body.alerts).toHaveLength(2);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(2);
      expect(response.body.pagination.total).toBe(5);
      expect(response.body.pagination.totalPages).toBe(3);
    });

    it('should limit max results to 50 per page', async () => {
      const { cookies } = await registerAndLogin();

      const response = await request(app)
        .post('/api/alerts/near-by-category?limit=100')
        .set('Cookie', cookies)
        .send({ categories: ['blood_donation'] })
        .expect(200);

      expect(response.body.pagination.limit).toBe(50);
    });

    it('should populate createdBy field with user name', async () => {
      const { cookies } = await registerAndLogin();

      await request(app).post('/api/alerts').set('Cookie', cookies).send({
        title: 'Test Alert',
        category: 'blood_donation',
        description: 'Test',
        location: { coordinates: [77.595, 12.972] }
      });

      const response = await request(app)
        .post('/api/alerts/near-by-category')
        .set('Cookie', cookies)
        .send({ categories: ['blood_donation'] })
        .expect(200);

      expect(response.body.alerts[0].createdBy).toHaveProperty('name');
      expect(response.body.alerts[0].createdBy.name).toBe('John Doe');
    });

    it('should only return alerts within user alertRadius', async () => {
      const { cookies } = await registerAndLogin();
      const { cookies: farCookies } = await registerAndLogin(farUserData);

      // Create alert far away
      await request(app).post('/api/alerts').set('Cookie', farCookies).send({
        title: 'Far Alert',
        category: 'blood_donation',
        description: 'Test',
        location: { coordinates: [80.2707, 13.0827] } // Chennai
      });

      const response = await request(app)
        .post('/api/alerts/near-by-category')
        .set('Cookie', cookies)
        .send({ categories: ['blood_donation'] })
        .expect(200);

      expect(response.body.alerts).toHaveLength(0);
    });
  });

  describe('GET /api/alerts/my-alerts', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/alerts/my-alerts')
        .expect(401);

      expect(response.body.message).toBe('Not Authenticated!');
    });

    it('should return only user own alerts', async () => {
      const { cookies: cookies1, user: user1 } = await registerAndLogin();
      const { cookies: cookies2 } = await registerAndLogin(anotherUserData);

      // User 1 creates 2 alerts
      await request(app).post('/api/alerts').set('Cookie', cookies1).send({
        title: 'User 1 Alert 1',
        category: 'blood_donation',
        description: 'Test',
        location: { coordinates: [77.5946, 12.9716] }
      });

      await request(app).post('/api/alerts').set('Cookie', cookies1).send({
        title: 'User 1 Alert 2',
        category: 'jobs',
        description: 'Test',
        location: { coordinates: [77.6, 12.98] }
      });

      // User 2 creates 1 alert
      await request(app).post('/api/alerts').set('Cookie', cookies2).send({
        title: 'User 2 Alert',
        category: 'tutoring',
        description: 'Test',
        location: { coordinates: [77.55, 12.95] }
      });

      const response = await request(app)
        .get('/api/alerts/my-alerts')
        .set('Cookie', cookies1)
        .expect(200);

      expect(response.body.alerts).toHaveLength(2);
      expect(response.body.alerts.every(a => 
        a.createdBy._id.toString() === user1._id
      )).toBe(true);
    });

    it('should return empty array when user has no alerts', async () => {
      const { cookies } = await registerAndLogin();

      const response = await request(app)
        .get('/api/alerts/my-alerts')
        .set('Cookie', cookies)
        .expect(200);

      expect(response.body.alerts).toEqual([]);
    });

    it('should respect pagination parameters', async () => {
      const { cookies } = await registerAndLogin();

      // Create 5 alerts
      for (let i = 0; i < 5; i++) {
        await request(app).post('/api/alerts').set('Cookie', cookies).send({
          title: `Alert ${i}`,
          category: 'blood_donation',
          description: 'Test',
          location: { coordinates: [77.5946, 12.9716] }
        });
        await new Promise(resolve => setTimeout(resolve, 5));
      }

      const response = await request(app)
        .get('/api/alerts/my-alerts?page=2&limit=2')
        .set('Cookie', cookies)
        .expect(200);

      expect(response.body.alerts).toHaveLength(2);
      expect(response.body.pagination.page).toBe(2);
      expect(response.body.pagination.limit).toBe(2);
      expect(response.body.pagination.total).toBe(5);
    });

    it('should populate createdBy field', async () => {
      const { cookies } = await registerAndLogin();

      await request(app).post('/api/alerts').set('Cookie', cookies).send({
        title: 'Test Alert',
        category: 'blood_donation',
        description: 'Test',
        location: { coordinates: [77.5946, 12.9716] }
      });

      const response = await request(app)
        .get('/api/alerts/my-alerts')
        .set('Cookie', cookies)
        .expect(200);

      expect(response.body.alerts[0].createdBy).toHaveProperty('name');
    });

    it('should return alerts sorted by createdAt descending', async () => {
      const { cookies } = await registerAndLogin();

      await request(app).post('/api/alerts').set('Cookie', cookies).send({
        title: 'First',
        category: 'blood_donation',
        description: 'Test',
        location: { coordinates: [77.5946, 12.9716] }
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      await request(app).post('/api/alerts').set('Cookie', cookies).send({
        title: 'Second',
        category: 'jobs',
        description: 'Test',
        location: { coordinates: [77.6, 12.98] }
      });

      const response = await request(app)
        .get('/api/alerts/my-alerts')
        .set('Cookie', cookies)
        .expect(200);

      expect(response.body.alerts[0].title).toBe('Second');
      expect(response.body.alerts[1].title).toBe('First');
    });
  });

  describe('DELETE /api/alerts/:id', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .delete('/api/alerts/507f1f77bcf86cd799439011')
        .expect(401);

      expect(response.body.message).toBe('Not Authenticated!');
    });

    it('should delete own alert successfully', async () => {
      const { cookies } = await registerAndLogin();

      const createResponse = await request(app)
        .post('/api/alerts')
        .set('Cookie', cookies)
        .send({
          title: 'Test Alert',
          category: 'blood_donation',
          description: 'Test',
          location: { coordinates: [77.5946, 12.9716] }
        });

      const alertId = createResponse.body.alert._id;

      const response = await request(app)
        .delete(`/api/alerts/${alertId}`)
        .set('Cookie', cookies)
        .expect(200);

      expect(response.body.message).toBe('Alert deleted successfully');

      // Verify deletion
      const deletedAlert = await Alert.findById(alertId);
      expect(deletedAlert).toBeNull();
    });

    it('should return 404 for non-existent alert', async () => {
      const { cookies } = await registerAndLogin();
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .delete(`/api/alerts/${fakeId}`)
        .set('Cookie', cookies)
        .expect(404);

      expect(response.body.message).toBe('Alert not found');
    });

    it('should not allow deleting another user alert', async () => {
      const { cookies: cookies1 } = await registerAndLogin();
      const { cookies: cookies2 } = await registerAndLogin(anotherUserData);

      // User 2 creates alert
      const createResponse = await request(app)
        .post('/api/alerts')
        .set('Cookie', cookies2)
        .send({
          title: 'User 2 Alert',
          category: 'blood_donation',
          description: 'Test',
          location: { coordinates: [77.5946, 12.9716] }
        });

      const alertId = createResponse.body.alert._id;

      // User 1 tries to delete
      const response = await request(app)
        .delete(`/api/alerts/${alertId}`)
        .set('Cookie', cookies1)
        .expect(403);

      expect(response.body.message).toBe('Unauthorized to delete this alert');

      // Verify alert still exists
      const alert = await Alert.findById(alertId);
      expect(alert).not.toBeNull();
    });

    it('should handle invalid alert ID format', async () => {
      const { cookies } = await registerAndLogin();

      const response = await request(app)
        .delete('/api/alerts/invalid-id')
        .set('Cookie', cookies)
        .expect(500);

      expect(response.body.message).toBe('Server error');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle location at boundary coordinates', async () => {
      const { cookies } = await registerAndLogin();

      const response = await request(app)
        .post('/api/alerts')
        .set('Cookie', cookies)
        .send({
          title: 'Boundary Alert',
          category: 'blood_donation',
          description: 'Test',
          location: { coordinates: [180, 90] }
        })
        .expect(201);

      expect(response.body.alert.location.coordinates).toEqual([180, 90]);
    });

    it('should handle negative coordinates', async () => {
      const { cookies } = await registerAndLogin();

      const response = await request(app)
        .post('/api/alerts')
        .set('Cookie', cookies)
        .send({
          title: 'Negative Coords Alert',
          category: 'blood_donation',
          description: 'Test',
          location: { coordinates: [-180, -90] }
        })
        .expect(201);

      expect(response.body.alert.location.coordinates).toEqual([-180, -90]);
    });

    it('should handle very long title and description', async () => {
      const { cookies } = await registerAndLogin();

      const longTitle = 'A'.repeat(500);
      const longDescription = 'B'.repeat(2000);

      const response = await request(app)
        .post('/api/alerts')
        .set('Cookie', cookies)
        .send({
          title: longTitle,
          category: 'blood_donation',
          description: longDescription,
          location: { coordinates: [77.5946, 12.9716] }
        })
        .expect(201);

      expect(response.body.alert.title).toBe(longTitle);
      expect(response.body.alert.description).toBe(longDescription);
    });

    it('should handle special characters in title and description', async () => {
      const { cookies } = await registerAndLogin();

      const response = await request(app)
        .post('/api/alerts')
        .set('Cookie', cookies)
        .send({
          title: 'Test @#$%^&*() Alert',
          category: 'blood_donation',
          description: 'Special chars: <>&"\'',
          location: { coordinates: [77.5946, 12.9716] }
        })
        .expect(201);

      expect(response.body.alert.title).toContain('@#$%^&*()');
    });
  });
});
