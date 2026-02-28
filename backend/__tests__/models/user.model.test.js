/**
 * Unit tests for User Model
 * Tests schema validation, defaults, and geospatial indexing
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '../../models/user.model.js';

let mongoServer;

// Setup: Start in-memory MongoDB before all tests
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

// Cleanup: Close connection and stop MongoDB after all tests
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Clear database between tests
afterEach(async () => {
  await User.deleteMany({});
});

describe('User Model', () => {
  describe('Valid user creation', () => {
    it('should create a user with all required fields', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'hashedpassword123',
        location: {
          type: 'Point',
          coordinates: [77.5946, 12.9716] // [lng, lat]
        }
      };

      const user = await User.create(userData);

      expect(user.name).toBe(userData.name);
      expect(user.email).toBe(userData.email);
      expect(user.password).toBe(userData.password);
      expect(user.location.type).toBe('Point');
      expect(user.location.coordinates).toEqual(userData.location.coordinates);
      expect(user._id).toBeDefined();
    });

    it('should create a user with optional fields', async () => {
      const userData = {
        name: 'Jane Smith',
        email: 'jane@example.com',
        password: 'hashedpassword456',
        interests: ['blood_donation', 'jobs'],
        location: {
          type: 'Point',
          coordinates: [72.8777, 19.0760]
        },
        alertRadius: 5000
      };

      const user = await User.create(userData);

      expect(user.interests).toEqual(userData.interests);
      expect(user.alertRadius).toBe(5000);
    });

    it('should apply default values correctly', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password',
        location: {
          type: 'Point',
          coordinates: [0, 0]
        }
      };

      const user = await User.create(userData);

      expect(user.interests).toEqual([]); // Default empty array
      expect(user.alertRadius).toBe(3000); // Default 3000 meters
      expect(user.location.type).toBe('Point'); // Default type
    });

    it('should add timestamps automatically', async () => {
      const userData = {
        name: 'Timestamp Test',
        email: 'timestamp@example.com',
        password: 'password',
        location: {
          type: 'Point',
          coordinates: [0, 0]
        }
      };

      const user = await User.create(userData);

      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Required field validation', () => {
    it('should fail without name', async () => {
      const userData = {
        email: 'noname@example.com',
        password: 'password',
        location: {
          type: 'Point',
          coordinates: [0, 0]
        }
      };

      await expect(User.create(userData)).rejects.toThrow();
    });

    it('should fail without email', async () => {
      const userData = {
        name: 'No Email',
        password: 'password',
        location: {
          type: 'Point',
          coordinates: [0, 0]
        }
      };

      await expect(User.create(userData)).rejects.toThrow();
    });

    it('should fail without password', async () => {
      const userData = {
        name: 'No Password',
        email: 'nopassword@example.com',
        location: {
          type: 'Point',
          coordinates: [0, 0]
        }
      };

      await expect(User.create(userData)).rejects.toThrow();
    });

    it('should fail without location coordinates', async () => {
      const userData = {
        name: 'No Location',
        email: 'nolocation@example.com',
        password: 'password',
        location: {
          type: 'Point'
        }
      };

      await expect(User.create(userData)).rejects.toThrow();
    });
  });

  describe('Email validation', () => {
    it('should convert email to lowercase', async () => {
      const userData = {
        name: 'Case Test',
        email: 'UPPERCASE@EXAMPLE.COM',
        password: 'password',
        location: {
          type: 'Point',
          coordinates: [0, 0]
        }
      };

      const user = await User.create(userData);

      expect(user.email).toBe('uppercase@example.com');
    });

    it('should enforce unique email constraint', async () => {
      const userData = {
        name: 'First User',
        email: 'duplicate@example.com',
        password: 'password',
        location: {
          type: 'Point',
          coordinates: [0, 0]
        }
      };

      await User.create(userData);

      const duplicateUser = {
        name: 'Second User',
        email: 'duplicate@example.com',
        password: 'password2',
        location: {
          type: 'Point',
          coordinates: [1, 1]
        }
      };

      await expect(User.create(duplicateUser)).rejects.toThrow();
    });
  });

  describe('Name validation', () => {
    it('should trim whitespace from name', async () => {
      const userData = {
        name: '  Trimmed Name  ',
        email: 'trim@example.com',
        password: 'password',
        location: {
          type: 'Point',
          coordinates: [0, 0]
        }
      };

      const user = await User.create(userData);

      expect(user.name).toBe('Trimmed Name');
    });
  });

  describe('Location validation', () => {
    it('should accept valid GeoJSON Point format', async () => {
      const userData = {
        name: 'Location Test',
        email: 'location@example.com',
        password: 'password',
        location: {
          type: 'Point',
          coordinates: [77.5946, 12.9716]
        }
      };

      const user = await User.create(userData);

      expect(user.location.type).toBe('Point');
      expect(user.location.coordinates).toHaveLength(2);
      expect(user.location.coordinates[0]).toBe(77.5946); // longitude
      expect(user.location.coordinates[1]).toBe(12.9716); // latitude
    });

    it('should accept negative coordinates', async () => {
      const userData = {
        name: 'Negative Coords',
        email: 'negative@example.com',
        password: 'password',
        location: {
          type: 'Point',
          coordinates: [-74.006, 40.7128] // NYC
        }
      };

      const user = await User.create(userData);

      expect(user.location.coordinates[0]).toBe(-74.006);
      expect(user.location.coordinates[1]).toBe(40.7128);
    });

    it('should accept coordinates at boundaries', async () => {
      const userData = {
        name: 'Boundary Test',
        email: 'boundary@example.com',
        password: 'password',
        location: {
          type: 'Point',
          coordinates: [180, 90] // Max longitude, max latitude
        }
      };

      const user = await User.create(userData);

      expect(user.location.coordinates[0]).toBe(180);
      expect(user.location.coordinates[1]).toBe(90);
    });
  });

  describe('Alert radius validation', () => {
    it('should accept alertRadius within valid range', async () => {
      const userData = {
        name: 'Radius Test',
        email: 'radius@example.com',
        password: 'password',
        location: {
          type: 'Point',
          coordinates: [0, 0]
        },
        alertRadius: 5000
      };

      const user = await User.create(userData);

      expect(user.alertRadius).toBe(5000);
    });

    it('should reject alertRadius below minimum (500)', async () => {
      const userData = {
        name: 'Low Radius',
        email: 'lowradius@example.com',
        password: 'password',
        location: {
          type: 'Point',
          coordinates: [0, 0]
        },
        alertRadius: 400
      };

      await expect(User.create(userData)).rejects.toThrow();
    });

    it('should reject alertRadius above maximum (10000)', async () => {
      const userData = {
        name: 'High Radius',
        email: 'highradius@example.com',
        password: 'password',
        location: {
          type: 'Point',
          coordinates: [0, 0]
        },
        alertRadius: 15000
      };

      await expect(User.create(userData)).rejects.toThrow();
    });

    it('should accept minimum alertRadius (500)', async () => {
      const userData = {
        name: 'Min Radius',
        email: 'minradius@example.com',
        password: 'password',
        location: {
          type: 'Point',
          coordinates: [0, 0]
        },
        alertRadius: 500
      };

      const user = await User.create(userData);

      expect(user.alertRadius).toBe(500);
    });

    it('should accept maximum alertRadius (10000)', async () => {
      const userData = {
        name: 'Max Radius',
        email: 'maxradius@example.com',
        password: 'password',
        location: {
          type: 'Point',
          coordinates: [0, 0]
        },
        alertRadius: 10000
      };

      const user = await User.create(userData);

      expect(user.alertRadius).toBe(10000);
    });
  });

  describe('Interests field', () => {
    it('should accept array of interests', async () => {
      const userData = {
        name: 'Interest Test',
        email: 'interests@example.com',
        password: 'password',
        location: {
          type: 'Point',
          coordinates: [0, 0]
        },
        interests: ['blood_donation', 'jobs', 'tutoring']
      };

      const user = await User.create(userData);

      expect(user.interests).toHaveLength(3);
      expect(user.interests).toContain('blood_donation');
      expect(user.interests).toContain('jobs');
      expect(user.interests).toContain('tutoring');
    });

    it('should accept empty interests array', async () => {
      const userData = {
        name: 'No Interests',
        email: 'nointerests@example.com',
        password: 'password',
        location: {
          type: 'Point',
          coordinates: [0, 0]
        },
        interests: []
      };

      const user = await User.create(userData);

      expect(user.interests).toEqual([]);
    });
  });

  describe('Geospatial index', () => {
    it('should have 2dsphere index on location field', async () => {
      const indexes = await User.collection.getIndexes();

      // Check if location_2dsphere index exists
      const hasLocationIndex = Object.keys(indexes).some(
        key => key.includes('location_2dsphere')
      );

      expect(hasLocationIndex).toBe(true);
    });
  });

  describe('Update operations', () => {
    it('should update user fields correctly', async () => {
      const user = await User.create({
        name: 'Original Name',
        email: 'update@example.com',
        password: 'password',
        location: {
          type: 'Point',
          coordinates: [0, 0]
        }
      });

      user.name = 'Updated Name';
      user.alertRadius = 7000;
      await user.save();

      const updatedUser = await User.findById(user._id);

      expect(updatedUser.name).toBe('Updated Name');
      expect(updatedUser.alertRadius).toBe(7000);
    });

    it('should update timestamps on modification', async () => {
      const user = await User.create({
        name: 'Timestamp Update',
        email: 'timestampupdate@example.com',
        password: 'password',
        location: {
          type: 'Point',
          coordinates: [0, 0]
        }
      });

      const originalUpdatedAt = user.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      user.name = 'Modified Name';
      await user.save();

      expect(user.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });
});
