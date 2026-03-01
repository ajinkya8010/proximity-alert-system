/**
 * Integration tests for User Controller
 * Tests profile update endpoint with authentication
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import cookieParser from 'cookie-parser';
import { User } from '../../models/user.model.js';
import authRoute from '../../routes/auth.route.js';
import userRoute from '../../routes/user.route.js';

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
  app.use('/api/user', userRoute);
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

describe('User Controller Integration Tests', () => {
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

  // Helper function to register and login a user, returning auth cookie
  const registerAndLogin = async (userData = validUserData) => {
    // Register
    await request(app)
      .post('/api/auth/register')
      .send(userData);

    // Login and get cookie
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: userData.email,
        password: userData.password
      });

    const cookies = loginResponse.headers['set-cookie'];
    return cookies;
  };

  describe('PATCH /api/user/update', () => {
    describe('Authentication', () => {
      it('should reject request without authentication token', async () => {
        const response = await request(app)
          .patch('/api/user/update')
          .send({ name: 'New Name' })
          .expect(401);

        expect(response.body.message).toBe('Not Authenticated!');
      });

      it('should reject request with invalid token', async () => {
        const response = await request(app)
          .patch('/api/user/update')
          .set('Cookie', ['token=invalid-token'])
          .send({ name: 'New Name' })
          .expect(403);

        expect(response.body.message).toBe('Token is not Valid!');
      });

      it('should accept request with valid authentication token', async () => {
        const cookies = await registerAndLogin();

        const response = await request(app)
          .patch('/api/user/update')
          .set('Cookie', cookies)
          .send({ name: 'Updated Name' })
          .expect(200);

        expect(response.body.message).toBe('Profile updated successfully');
      });
    });

    describe('Name Update', () => {
      it('should update user name successfully', async () => {
        const cookies = await registerAndLogin();

        const response = await request(app)
          .patch('/api/user/update')
          .set('Cookie', cookies)
          .send({ name: 'Jane Smith' })
          .expect(200);

        expect(response.body.user.name).toBe('Jane Smith');
        expect(response.body.message).toBe('Profile updated successfully');
      });

      it('should trim whitespace from name', async () => {
        const cookies = await registerAndLogin();

        const response = await request(app)
          .patch('/api/user/update')
          .set('Cookie', cookies)
          .send({ name: '  Jane Smith  ' })
          .expect(200);

        expect(response.body.user.name).toBe('Jane Smith');
      });

      it('should reject empty name', async () => {
        const cookies = await registerAndLogin();

        const response = await request(app)
          .patch('/api/user/update')
          .set('Cookie', cookies)
          .send({ name: '' })
          .expect(400);

        expect(response.body.message).toBe('Name cannot be empty');
      });

      it('should reject name with only whitespace', async () => {
        const cookies = await registerAndLogin();

        const response = await request(app)
          .patch('/api/user/update')
          .set('Cookie', cookies)
          .send({ name: '   ' })
          .expect(400);

        expect(response.body.message).toBe('Name cannot be empty');
      });
    });

    describe('Location Update', () => {
      it('should update location successfully', async () => {
        const cookies = await registerAndLogin();

        const newLocation = {
          coordinates: [80.2707, 13.0827] // Chennai
        };

        const response = await request(app)
          .patch('/api/user/update')
          .set('Cookie', cookies)
          .send({ location: newLocation })
          .expect(200);

        expect(response.body.user.location.type).toBe('Point');
        expect(response.body.user.location.coordinates).toEqual([80.2707, 13.0827]);
      });

      it('should reject location with invalid coordinates format', async () => {
        const cookies = await registerAndLogin();

        const response = await request(app)
          .patch('/api/user/update')
          .set('Cookie', cookies)
          .send({ location: { coordinates: [77.5946] } }) // Missing latitude
          .expect(400);

        expect(response.body.message).toBe('Location must have valid coordinates [longitude, latitude]');
      });

      it('should reject location with non-array coordinates', async () => {
        const cookies = await registerAndLogin();

        const response = await request(app)
          .patch('/api/user/update')
          .set('Cookie', cookies)
          .send({ location: { coordinates: 'invalid' } })
          .expect(400);

        expect(response.body.message).toBe('Location must have valid coordinates [longitude, latitude]');
      });

      it('should reject location with invalid longitude range', async () => {
        const cookies = await registerAndLogin();

        const response = await request(app)
          .patch('/api/user/update')
          .set('Cookie', cookies)
          .send({ location: { coordinates: [200, 12.9716] } }) // Longitude > 180
          .expect(400);

        expect(response.body.message).toBe('Invalid location coordinates');
      });

      it('should reject location with invalid latitude range', async () => {
        const cookies = await registerAndLogin();

        const response = await request(app)
          .patch('/api/user/update')
          .set('Cookie', cookies)
          .send({ location: { coordinates: [77.5946, 100] } }) // Latitude > 90
          .expect(400);

        expect(response.body.message).toBe('Invalid location coordinates');
      });

      it('should accept location at boundary values', async () => {
        const cookies = await registerAndLogin();

        const response = await request(app)
          .patch('/api/user/update')
          .set('Cookie', cookies)
          .send({ location: { coordinates: [180, 90] } })
          .expect(200);

        expect(response.body.user.location.coordinates).toEqual([180, 90]);
      });

      it('should accept location at negative boundary values', async () => {
        const cookies = await registerAndLogin();

        const response = await request(app)
          .patch('/api/user/update')
          .set('Cookie', cookies)
          .send({ location: { coordinates: [-180, -90] } })
          .expect(200);

        expect(response.body.user.location.coordinates).toEqual([-180, -90]);
      });
    });

    describe('Alert Radius Update', () => {
      it('should update alert radius successfully', async () => {
        const cookies = await registerAndLogin();

        const response = await request(app)
          .patch('/api/user/update')
          .set('Cookie', cookies)
          .send({ alertRadius: 7000 })
          .expect(200);

        expect(response.body.user.alertRadius).toBe(7000);
      });

      it('should accept minimum alert radius (500m)', async () => {
        const cookies = await registerAndLogin();

        const response = await request(app)
          .patch('/api/user/update')
          .set('Cookie', cookies)
          .send({ alertRadius: 500 })
          .expect(200);

        expect(response.body.user.alertRadius).toBe(500);
      });

      it('should accept maximum alert radius (10km)', async () => {
        const cookies = await registerAndLogin();

        const response = await request(app)
          .patch('/api/user/update')
          .set('Cookie', cookies)
          .send({ alertRadius: 10000 })
          .expect(200);

        expect(response.body.user.alertRadius).toBe(10000);
      });

      it('should reject alert radius below minimum', async () => {
        const cookies = await registerAndLogin();

        const response = await request(app)
          .patch('/api/user/update')
          .set('Cookie', cookies)
          .send({ alertRadius: 400 })
          .expect(400);

        expect(response.body.message).toBe('Alert radius must be between 500m and 10km');
      });

      it('should reject alert radius above maximum', async () => {
        const cookies = await registerAndLogin();

        const response = await request(app)
          .patch('/api/user/update')
          .set('Cookie', cookies)
          .send({ alertRadius: 15000 })
          .expect(400);

        expect(response.body.message).toBe('Alert radius must be between 500m and 10km');
      });

      it('should reject non-numeric alert radius', async () => {
        const cookies = await registerAndLogin();

        const response = await request(app)
          .patch('/api/user/update')
          .set('Cookie', cookies)
          .send({ alertRadius: 'invalid' })
          .expect(400);

        expect(response.body.message).toBe('Alert radius must be between 500m and 10km');
      });

      it('should parse string numbers for alert radius', async () => {
        const cookies = await registerAndLogin();

        const response = await request(app)
          .patch('/api/user/update')
          .set('Cookie', cookies)
          .send({ alertRadius: '6000' })
          .expect(200);

        expect(response.body.user.alertRadius).toBe(6000);
      });
    });

    describe('Interests Update', () => {
      it('should update interests successfully', async () => {
        const cookies = await registerAndLogin();

        const response = await request(app)
          .patch('/api/user/update')
          .set('Cookie', cookies)
          .send({ interests: ['tutoring', 'food_giveaway'] })
          .expect(200);

        expect(response.body.user.interests).toEqual(['tutoring', 'food_giveaway']);
      });

      it('should accept empty interests array', async () => {
        const cookies = await registerAndLogin();

        const response = await request(app)
          .patch('/api/user/update')
          .set('Cookie', cookies)
          .send({ interests: [] })
          .expect(200);

        expect(response.body.user.interests).toEqual([]);
      });

      it('should filter out invalid interests', async () => {
        const cookies = await registerAndLogin();

        const response = await request(app)
          .patch('/api/user/update')
          .set('Cookie', cookies)
          .send({ interests: ['blood_donation', 'invalid_category', 'jobs'] })
          .expect(200);

        expect(response.body.user.interests).toEqual(['blood_donation', 'jobs']);
      });

      it('should accept all valid interest categories', async () => {
        const cookies = await registerAndLogin();

        const allValidInterests = [
          'blood_donation',
          'jobs',
          'tutoring',
          'lost_and_found',
          'urgent_help',
          'food_giveaway',
          'disaster_alert'
        ];

        const response = await request(app)
          .patch('/api/user/update')
          .set('Cookie', cookies)
          .send({ interests: allValidInterests })
          .expect(200);

        expect(response.body.user.interests).toEqual(allValidInterests);
      });

      it('should reject non-array interests', async () => {
        const cookies = await registerAndLogin();

        const response = await request(app)
          .patch('/api/user/update')
          .set('Cookie', cookies)
          .send({ interests: 'blood_donation' })
          .expect(400);

        expect(response.body.message).toBe('Interests must be an array');
      });

      it('should handle interests with only invalid categories', async () => {
        const cookies = await registerAndLogin();

        const response = await request(app)
          .patch('/api/user/update')
          .set('Cookie', cookies)
          .send({ interests: ['invalid1', 'invalid2'] })
          .expect(200);

        expect(response.body.user.interests).toEqual([]);
      });
    });

    describe('Multiple Fields Update', () => {
      it('should update multiple fields simultaneously', async () => {
        const cookies = await registerAndLogin();

        const updates = {
          name: 'Jane Doe',
          alertRadius: 8000,
          interests: ['tutoring', 'urgent_help']
        };

        const response = await request(app)
          .patch('/api/user/update')
          .set('Cookie', cookies)
          .send(updates)
          .expect(200);

        expect(response.body.user.name).toBe('Jane Doe');
        expect(response.body.user.alertRadius).toBe(8000);
        expect(response.body.user.interests).toEqual(['tutoring', 'urgent_help']);
      });

      it('should update all fields at once', async () => {
        const cookies = await registerAndLogin();

        const updates = {
          name: 'Complete Update',
          location: { coordinates: [72.8777, 19.0760] }, // Mumbai
          alertRadius: 6000,
          interests: ['disaster_alert']
        };

        const response = await request(app)
          .patch('/api/user/update')
          .set('Cookie', cookies)
          .send(updates)
          .expect(200);

        expect(response.body.user.name).toBe('Complete Update');
        expect(response.body.user.location.coordinates).toEqual([72.8777, 19.0760]);
        expect(response.body.user.alertRadius).toBe(6000);
        expect(response.body.user.interests).toEqual(['disaster_alert']);
      });

      it('should not update fields that are not provided', async () => {
        const cookies = await registerAndLogin();

        const response = await request(app)
          .patch('/api/user/update')
          .set('Cookie', cookies)
          .send({ name: 'Only Name Changed' })
          .expect(200);

        // Other fields should remain unchanged
        expect(response.body.user.name).toBe('Only Name Changed');
        expect(response.body.user.alertRadius).toBe(validUserData.alertRadius);
        expect(response.body.user.interests).toEqual(validUserData.interests);
      });
    });

    describe('Response Format', () => {
      it('should not include password in response', async () => {
        const cookies = await registerAndLogin();

        const response = await request(app)
          .patch('/api/user/update')
          .set('Cookie', cookies)
          .send({ name: 'Test User' })
          .expect(200);

        expect(response.body.user).not.toHaveProperty('password');
      });

      it('should include all user fields except password', async () => {
        const cookies = await registerAndLogin();

        const response = await request(app)
          .patch('/api/user/update')
          .set('Cookie', cookies)
          .send({ name: 'Test User' })
          .expect(200);

        expect(response.body.user).toHaveProperty('_id');
        expect(response.body.user).toHaveProperty('name');
        expect(response.body.user).toHaveProperty('email');
        expect(response.body.user).toHaveProperty('interests');
        expect(response.body.user).toHaveProperty('location');
        expect(response.body.user).toHaveProperty('alertRadius');
        expect(response.body.user).toHaveProperty('createdAt');
        expect(response.body.user).toHaveProperty('updatedAt');
      });

      it('should return success message', async () => {
        const cookies = await registerAndLogin();

        const response = await request(app)
          .patch('/api/user/update')
          .set('Cookie', cookies)
          .send({ name: 'Test User' })
          .expect(200);

        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toBe('Profile updated successfully');
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty update request', async () => {
        const cookies = await registerAndLogin();

        const response = await request(app)
          .patch('/api/user/update')
          .set('Cookie', cookies)
          .send({})
          .expect(200);

        // Should succeed but not change anything
        expect(response.body.message).toBe('Profile updated successfully');
      });

      it('should handle update with undefined values', async () => {
        const cookies = await registerAndLogin();

        const response = await request(app)
          .patch('/api/user/update')
          .set('Cookie', cookies)
          .send({ name: undefined })
          .expect(200);

        expect(response.body.message).toBe('Profile updated successfully');
      });

      it('should handle partial validation failure', async () => {
        const cookies = await registerAndLogin();

        const response = await request(app)
          .patch('/api/user/update')
          .set('Cookie', cookies)
          .send({
            name: 'Valid Name',
            alertRadius: 100 // Invalid
          })
          .expect(400);

        expect(response.body.message).toBe('Alert radius must be between 500m and 10km');
      });
    });
  });
});
