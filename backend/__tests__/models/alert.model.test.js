/**
 * Unit tests for Alert Model
 * Tests schema validation, category enum, and geospatial indexing
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Alert } from '../../models/alert.model.js';

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
  await Alert.deleteMany({});
});

describe('Alert Model', () => {
  const validUserId = new mongoose.Types.ObjectId();

  describe('Valid alert creation', () => {
    it('should create an alert with all required fields', async () => {
      const alertData = {
        title: 'Blood Donation Needed',
        category: 'blood_donation',
        location: {
          type: 'Point',
          coordinates: [77.5946, 12.9716]
        },
        createdBy: validUserId
      };

      const alert = await Alert.create(alertData);

      expect(alert.title).toBe(alertData.title);
      expect(alert.category).toBe(alertData.category);
      expect(alert.location.type).toBe('Point');
      expect(alert.location.coordinates).toEqual(alertData.location.coordinates);
      expect(alert.createdBy.toString()).toBe(validUserId.toString());
      expect(alert._id).toBeDefined();
    });

    it('should create an alert with optional description', async () => {
      const alertData = {
        title: 'Job Opening',
        category: 'jobs',
        description: 'Software Engineer position available',
        location: {
          type: 'Point',
          coordinates: [72.8777, 19.0760]
        },
        createdBy: validUserId
      };

      const alert = await Alert.create(alertData);

      expect(alert.description).toBe(alertData.description);
    });

    it('should apply default empty description', async () => {
      const alertData = {
        title: 'Urgent Help',
        category: 'urgent_help',
        location: {
          type: 'Point',
          coordinates: [0, 0]
        },
        createdBy: validUserId
      };

      const alert = await Alert.create(alertData);

      expect(alert.description).toBe('');
    });

    it('should add timestamps automatically', async () => {
      const alertData = {
        title: 'Test Alert',
        category: 'jobs',
        location: {
          type: 'Point',
          coordinates: [0, 0]
        },
        createdBy: validUserId
      };

      const alert = await Alert.create(alertData);

      expect(alert.createdAt).toBeDefined();
      expect(alert.updatedAt).toBeDefined();
      expect(alert.createdAt).toBeInstanceOf(Date);
      expect(alert.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Required field validation', () => {
    it('should fail without title', async () => {
      const alertData = {
        category: 'jobs',
        location: {
          type: 'Point',
          coordinates: [0, 0]
        },
        createdBy: validUserId
      };

      await expect(Alert.create(alertData)).rejects.toThrow();
    });

    it('should fail without category', async () => {
      const alertData = {
        title: 'No Category',
        location: {
          type: 'Point',
          coordinates: [0, 0]
        },
        createdBy: validUserId
      };

      await expect(Alert.create(alertData)).rejects.toThrow();
    });

    it('should fail without location coordinates', async () => {
      const alertData = {
        title: 'No Location',
        category: 'jobs',
        location: {
          type: 'Point'
        },
        createdBy: validUserId
      };

      await expect(Alert.create(alertData)).rejects.toThrow();
    });

    it('should fail without createdBy', async () => {
      const alertData = {
        title: 'No Creator',
        category: 'jobs',
        location: {
          type: 'Point',
          coordinates: [0, 0]
        }
      };

      await expect(Alert.create(alertData)).rejects.toThrow();
    });
  });

  describe('Category enum validation', () => {
    const categories = [
      'blood_donation',
      'jobs',
      'tutoring',
      'lost_and_found',
      'urgent_help',
      'food_giveaway',
      'disaster_alert'
    ];

    categories.forEach(category => {
      it(`should accept valid category: ${category}`, async () => {
        const alertData = {
          title: `Test ${category}`,
          category: category,
          location: {
            type: 'Point',
            coordinates: [0, 0]
          },
          createdBy: validUserId
        };

        const alert = await Alert.create(alertData);

        expect(alert.category).toBe(category);
      });
    });

    it('should reject invalid category', async () => {
      const alertData = {
        title: 'Invalid Category',
        category: 'invalid_category',
        location: {
          type: 'Point',
          coordinates: [0, 0]
        },
        createdBy: validUserId
      };

      await expect(Alert.create(alertData)).rejects.toThrow();
    });

    it('should reject empty category', async () => {
      const alertData = {
        title: 'Empty Category',
        category: '',
        location: {
          type: 'Point',
          coordinates: [0, 0]
        },
        createdBy: validUserId
      };

      await expect(Alert.create(alertData)).rejects.toThrow();
    });
  });

  describe('Title validation', () => {
    it('should trim whitespace from title', async () => {
      const alertData = {
        title: '  Trimmed Title  ',
        category: 'jobs',
        location: {
          type: 'Point',
          coordinates: [0, 0]
        },
        createdBy: validUserId
      };

      const alert = await Alert.create(alertData);

      expect(alert.title).toBe('Trimmed Title');
    });

    it('should accept long titles', async () => {
      const longTitle = 'A'.repeat(200);
      const alertData = {
        title: longTitle,
        category: 'jobs',
        location: {
          type: 'Point',
          coordinates: [0, 0]
        },
        createdBy: validUserId
      };

      const alert = await Alert.create(alertData);

      expect(alert.title).toBe(longTitle);
    });
  });

  describe('Location validation', () => {
    it('should accept valid GeoJSON Point format', async () => {
      const alertData = {
        title: 'Location Test',
        category: 'jobs',
        location: {
          type: 'Point',
          coordinates: [77.5946, 12.9716]
        },
        createdBy: validUserId
      };

      const alert = await Alert.create(alertData);

      expect(alert.location.type).toBe('Point');
      expect(alert.location.coordinates).toHaveLength(2);
      expect(alert.location.coordinates[0]).toBe(77.5946);
      expect(alert.location.coordinates[1]).toBe(12.9716);
    });

    it('should accept negative coordinates', async () => {
      const alertData = {
        title: 'Negative Coords',
        category: 'jobs',
        location: {
          type: 'Point',
          coordinates: [-74.006, 40.7128]
        },
        createdBy: validUserId
      };

      const alert = await Alert.create(alertData);

      expect(alert.location.coordinates[0]).toBe(-74.006);
      expect(alert.location.coordinates[1]).toBe(40.7128);
    });

    it('should accept coordinates at boundaries', async () => {
      const alertData = {
        title: 'Boundary Test',
        category: 'jobs',
        location: {
          type: 'Point',
          coordinates: [180, 90]
        },
        createdBy: validUserId
      };

      const alert = await Alert.create(alertData);

      expect(alert.location.coordinates[0]).toBe(180);
      expect(alert.location.coordinates[1]).toBe(90);
    });

    it('should default location type to Point', async () => {
      const alertData = {
        title: 'Default Type',
        category: 'jobs',
        location: {
          coordinates: [0, 0]
        },
        createdBy: validUserId
      };

      const alert = await Alert.create(alertData);

      expect(alert.location.type).toBe('Point');
    });
  });

  describe('Description field', () => {
    it('should accept description text', async () => {
      const description = 'This is a detailed description of the alert.';
      const alertData = {
        title: 'Description Test',
        category: 'jobs',
        description: description,
        location: {
          type: 'Point',
          coordinates: [0, 0]
        },
        createdBy: validUserId
      };

      const alert = await Alert.create(alertData);

      expect(alert.description).toBe(description);
    });

    it('should accept long descriptions', async () => {
      const longDescription = 'A'.repeat(1000);
      const alertData = {
        title: 'Long Description',
        category: 'jobs',
        description: longDescription,
        location: {
          type: 'Point',
          coordinates: [0, 0]
        },
        createdBy: validUserId
      };

      const alert = await Alert.create(alertData);

      expect(alert.description).toBe(longDescription);
    });

    it('should accept empty string description', async () => {
      const alertData = {
        title: 'Empty Description',
        category: 'jobs',
        description: '',
        location: {
          type: 'Point',
          coordinates: [0, 0]
        },
        createdBy: validUserId
      };

      const alert = await Alert.create(alertData);

      expect(alert.description).toBe('');
    });
  });

  describe('CreatedBy field', () => {
    it('should accept valid ObjectId', async () => {
      const userId = new mongoose.Types.ObjectId();
      const alertData = {
        title: 'Valid User',
        category: 'jobs',
        location: {
          type: 'Point',
          coordinates: [0, 0]
        },
        createdBy: userId
      };

      const alert = await Alert.create(alertData);

      expect(alert.createdBy.toString()).toBe(userId.toString());
    });

    it('should store ObjectId reference correctly', async () => {
      const alertData = {
        title: 'ObjectId Test',
        category: 'jobs',
        location: {
          type: 'Point',
          coordinates: [0, 0]
        },
        createdBy: validUserId
      };

      const alert = await Alert.create(alertData);

      expect(alert.createdBy).toBeInstanceOf(mongoose.Types.ObjectId);
    });
  });

  describe('Geospatial index', () => {
    it('should have 2dsphere index on location field', async () => {
      const indexes = await Alert.collection.getIndexes();

      const hasLocationIndex = Object.keys(indexes).some(
        key => key.includes('location_2dsphere')
      );

      expect(hasLocationIndex).toBe(true);
    });
  });

  describe('Real-world alert scenarios', () => {
    it('should create blood donation alert', async () => {
      const alertData = {
        title: 'Urgent: O+ Blood Needed',
        category: 'blood_donation',
        description: 'Patient needs O+ blood urgently at City Hospital',
        location: {
          type: 'Point',
          coordinates: [77.5946, 12.9716]
        },
        createdBy: validUserId
      };

      const alert = await Alert.create(alertData);

      expect(alert.category).toBe('blood_donation');
      expect(alert.title).toContain('Blood');
    });

    it('should create job alert', async () => {
      const alertData = {
        title: 'Software Engineer Opening',
        category: 'jobs',
        description: 'Looking for experienced React developer',
        location: {
          type: 'Point',
          coordinates: [72.8777, 19.0760]
        },
        createdBy: validUserId
      };

      const alert = await Alert.create(alertData);

      expect(alert.category).toBe('jobs');
    });

    it('should create disaster alert', async () => {
      const alertData = {
        title: 'Flood Warning',
        category: 'disaster_alert',
        description: 'Heavy rainfall expected, stay indoors',
        location: {
          type: 'Point',
          coordinates: [85.3240, 27.7172]
        },
        createdBy: validUserId
      };

      const alert = await Alert.create(alertData);

      expect(alert.category).toBe('disaster_alert');
    });

    it('should create lost and found alert', async () => {
      const alertData = {
        title: 'Lost Dog - Golden Retriever',
        category: 'lost_and_found',
        description: 'Last seen near Central Park',
        location: {
          type: 'Point',
          coordinates: [-73.9654, 40.7829]
        },
        createdBy: validUserId
      };

      const alert = await Alert.create(alertData);

      expect(alert.category).toBe('lost_and_found');
    });
  });

  describe('Update operations', () => {
    it('should update alert fields correctly', async () => {
      const alert = await Alert.create({
        title: 'Original Title',
        category: 'jobs',
        location: {
          type: 'Point',
          coordinates: [0, 0]
        },
        createdBy: validUserId
      });

      alert.title = 'Updated Title';
      alert.description = 'Added description';
      await alert.save();

      const updatedAlert = await Alert.findById(alert._id);

      expect(updatedAlert.title).toBe('Updated Title');
      expect(updatedAlert.description).toBe('Added description');
    });

    it('should update timestamps on modification', async () => {
      const alert = await Alert.create({
        title: 'Timestamp Test',
        category: 'jobs',
        location: {
          type: 'Point',
          coordinates: [0, 0]
        },
        createdBy: validUserId
      });

      const originalUpdatedAt = alert.updatedAt;

      await new Promise(resolve => setTimeout(resolve, 10));

      alert.title = 'Modified Title';
      await alert.save();

      expect(alert.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('Query operations', () => {
    it('should find alerts by category', async () => {
      await Alert.create({
        title: 'Job 1',
        category: 'jobs',
        location: { type: 'Point', coordinates: [0, 0] },
        createdBy: validUserId
      });

      await Alert.create({
        title: 'Blood 1',
        category: 'blood_donation',
        location: { type: 'Point', coordinates: [1, 1] },
        createdBy: validUserId
      });

      const jobAlerts = await Alert.find({ category: 'jobs' });

      expect(jobAlerts).toHaveLength(1);
      expect(jobAlerts[0].category).toBe('jobs');
    });

    it('should find alerts by creator', async () => {
      const user1 = new mongoose.Types.ObjectId();
      const user2 = new mongoose.Types.ObjectId();

      await Alert.create({
        title: 'User 1 Alert',
        category: 'jobs',
        location: { type: 'Point', coordinates: [0, 0] },
        createdBy: user1
      });

      await Alert.create({
        title: 'User 2 Alert',
        category: 'jobs',
        location: { type: 'Point', coordinates: [1, 1] },
        createdBy: user2
      });

      const user1Alerts = await Alert.find({ createdBy: user1 });

      expect(user1Alerts).toHaveLength(1);
      expect(user1Alerts[0].createdBy.toString()).toBe(user1.toString());
    });
  });
});
