/**
 * Unit tests for Notification Model
 * Tests schema validation, TTL expiration, and indexing
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Notification } from '../../models/notification.model.js';

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
  await Notification.deleteMany({});
});

describe('Notification Model', () => {
  const validUserId = new mongoose.Types.ObjectId();
  const validAlertId = new mongoose.Types.ObjectId();

  describe('Valid notification creation', () => {
    it('should create a notification with all required fields', async () => {
      const notificationData = {
        userId: validUserId,
        alertId: validAlertId,
        title: 'New Alert',
        message: 'Blood donation needed nearby',
        category: 'blood_donation'
      };

      const notification = await Notification.create(notificationData);

      expect(notification.userId.toString()).toBe(validUserId.toString());
      expect(notification.alertId.toString()).toBe(validAlertId.toString());
      expect(notification.title).toBe(notificationData.title);
      expect(notification.message).toBe(notificationData.message);
      expect(notification.category).toBe(notificationData.category);
      expect(notification._id).toBeDefined();
    });

    it('should create a notification with optional type', async () => {
      const notificationData = {
        userId: validUserId,
        alertId: validAlertId,
        type: 'queued_alert',
        title: 'Queued Alert',
        message: 'Alert received while offline',
        category: 'jobs'
      };

      const notification = await Notification.create(notificationData);

      expect(notification.type).toBe('queued_alert');
    });

    it('should apply default values correctly', async () => {
      const notificationData = {
        userId: validUserId,
        alertId: validAlertId,
        title: 'Test Notification',
        message: 'Test message',
        category: 'jobs'
      };

      const notification = await Notification.create(notificationData);

      expect(notification.type).toBe('new_alert'); // Default type
      expect(notification.isRead).toBe(false); // Default isRead
      expect(notification.expiresAt).toBeDefined(); // Default expiresAt
      expect(notification.expiresAt).toBeInstanceOf(Date);
    });

    it('should add timestamps automatically', async () => {
      const notificationData = {
        userId: validUserId,
        alertId: validAlertId,
        title: 'Timestamp Test',
        message: 'Test message',
        category: 'jobs'
      };

      const notification = await Notification.create(notificationData);

      expect(notification.createdAt).toBeDefined();
      expect(notification.updatedAt).toBeDefined();
      expect(notification.createdAt).toBeInstanceOf(Date);
      expect(notification.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Required field validation', () => {
    it('should fail without userId', async () => {
      const notificationData = {
        alertId: validAlertId,
        title: 'No User',
        message: 'Test message',
        category: 'jobs'
      };

      await expect(Notification.create(notificationData)).rejects.toThrow();
    });

    it('should fail without alertId', async () => {
      const notificationData = {
        userId: validUserId,
        title: 'No Alert',
        message: 'Test message',
        category: 'jobs'
      };

      await expect(Notification.create(notificationData)).rejects.toThrow();
    });

    it('should fail without title', async () => {
      const notificationData = {
        userId: validUserId,
        alertId: validAlertId,
        message: 'Test message',
        category: 'jobs'
      };

      await expect(Notification.create(notificationData)).rejects.toThrow();
    });

    it('should fail without message', async () => {
      const notificationData = {
        userId: validUserId,
        alertId: validAlertId,
        title: 'No Message',
        category: 'jobs'
      };

      await expect(Notification.create(notificationData)).rejects.toThrow();
    });

    it('should fail without category', async () => {
      const notificationData = {
        userId: validUserId,
        alertId: validAlertId,
        title: 'No Category',
        message: 'Test message'
      };

      await expect(Notification.create(notificationData)).rejects.toThrow();
    });
  });

  describe('Type enum validation', () => {
    it('should accept "new_alert" type', async () => {
      const notificationData = {
        userId: validUserId,
        alertId: validAlertId,
        type: 'new_alert',
        title: 'New Alert Type',
        message: 'Test message',
        category: 'jobs'
      };

      const notification = await Notification.create(notificationData);

      expect(notification.type).toBe('new_alert');
    });

    it('should accept "queued_alert" type', async () => {
      const notificationData = {
        userId: validUserId,
        alertId: validAlertId,
        type: 'queued_alert',
        title: 'Queued Alert Type',
        message: 'Test message',
        category: 'jobs'
      };

      const notification = await Notification.create(notificationData);

      expect(notification.type).toBe('queued_alert');
    });

    it('should reject invalid type', async () => {
      const notificationData = {
        userId: validUserId,
        alertId: validAlertId,
        type: 'invalid_type',
        title: 'Invalid Type',
        message: 'Test message',
        category: 'jobs'
      };

      await expect(Notification.create(notificationData)).rejects.toThrow();
    });

    it('should default to "new_alert" when type not provided', async () => {
      const notificationData = {
        userId: validUserId,
        alertId: validAlertId,
        title: 'Default Type',
        message: 'Test message',
        category: 'jobs'
      };

      const notification = await Notification.create(notificationData);

      expect(notification.type).toBe('new_alert');
    });
  });

  describe('IsRead field', () => {
    it('should default isRead to false', async () => {
      const notificationData = {
        userId: validUserId,
        alertId: validAlertId,
        title: 'Unread Test',
        message: 'Test message',
        category: 'jobs'
      };

      const notification = await Notification.create(notificationData);

      expect(notification.isRead).toBe(false);
    });

    it('should accept isRead as true', async () => {
      const notificationData = {
        userId: validUserId,
        alertId: validAlertId,
        title: 'Read Test',
        message: 'Test message',
        category: 'jobs',
        isRead: true
      };

      const notification = await Notification.create(notificationData);

      expect(notification.isRead).toBe(true);
    });

    it('should update isRead status', async () => {
      const notification = await Notification.create({
        userId: validUserId,
        alertId: validAlertId,
        title: 'Update Read',
        message: 'Test message',
        category: 'jobs'
      });

      expect(notification.isRead).toBe(false);

      notification.isRead = true;
      await notification.save();

      const updated = await Notification.findById(notification._id);
      expect(updated.isRead).toBe(true);
    });
  });

  describe('ObjectId references', () => {
    it('should store userId as ObjectId', async () => {
      const notificationData = {
        userId: validUserId,
        alertId: validAlertId,
        title: 'UserId Test',
        message: 'Test message',
        category: 'jobs'
      };

      const notification = await Notification.create(notificationData);

      expect(notification.userId).toBeInstanceOf(mongoose.Types.ObjectId);
      expect(notification.userId.toString()).toBe(validUserId.toString());
    });

    it('should store alertId as ObjectId', async () => {
      const notificationData = {
        userId: validUserId,
        alertId: validAlertId,
        title: 'AlertId Test',
        message: 'Test message',
        category: 'jobs'
      };

      const notification = await Notification.create(notificationData);

      expect(notification.alertId).toBeInstanceOf(mongoose.Types.ObjectId);
      expect(notification.alertId.toString()).toBe(validAlertId.toString());
    });
  });

  describe('TTL (Time To Live) expiration', () => {
    it('should set expiresAt field with default value', async () => {
      const notificationData = {
        userId: validUserId,
        alertId: validAlertId,
        title: 'TTL Test',
        message: 'Test message',
        category: 'jobs'
      };

      const notification = await Notification.create(notificationData);

      expect(notification.expiresAt).toBeDefined();
      expect(notification.expiresAt).toBeInstanceOf(Date);
    });

    it('should accept custom expiresAt date', async () => {
      const customExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      const notificationData = {
        userId: validUserId,
        alertId: validAlertId,
        title: 'Custom TTL',
        message: 'Test message',
        category: 'jobs',
        expiresAt: customExpiry
      };

      const notification = await Notification.create(notificationData);

      expect(notification.expiresAt.getTime()).toBeCloseTo(customExpiry.getTime(), -2);
    });

    it('should have TTL index configured', async () => {
      const indexes = await Notification.collection.getIndexes();

      // Check if expiresAt field has TTL index
      const hasTTLIndex = Object.keys(indexes).some(
        key => key.includes('expiresAt')
      );

      expect(hasTTLIndex).toBe(true);
    });
  });

  describe('Indexes', () => {
    it('should have index on userId field', async () => {
      const indexes = await Notification.collection.getIndexes();

      const hasUserIdIndex = Object.keys(indexes).some(
        key => key.includes('userId')
      );

      expect(hasUserIdIndex).toBe(true);
    });

    it('should have index on isRead field', async () => {
      const indexes = await Notification.collection.getIndexes();

      const hasIsReadIndex = Object.keys(indexes).some(
        key => key.includes('isRead')
      );

      expect(hasIsReadIndex).toBe(true);
    });

    it('should have compound index on userId and createdAt', async () => {
      const indexes = await Notification.collection.getIndexes();

      const hasCompoundIndex = Object.keys(indexes).some(
        key => key.includes('userId') && key.includes('createdAt')
      );

      expect(hasCompoundIndex).toBe(true);
    });

    it('should have compound index on userId and isRead', async () => {
      const indexes = await Notification.collection.getIndexes();

      const hasCompoundIndex = Object.keys(indexes).some(
        key => key.includes('userId') && key.includes('isRead')
      );

      expect(hasCompoundIndex).toBe(true);
    });
  });

  describe('Real-world notification scenarios', () => {
    it('should create new_alert notification', async () => {
      const notificationData = {
        userId: validUserId,
        alertId: validAlertId,
        type: 'new_alert',
        title: 'Blood Donation Alert',
        message: 'O+ blood needed urgently at City Hospital',
        category: 'blood_donation'
      };

      const notification = await Notification.create(notificationData);

      expect(notification.type).toBe('new_alert');
      expect(notification.isRead).toBe(false);
    });

    it('should create queued_alert notification', async () => {
      const notificationData = {
        userId: validUserId,
        alertId: validAlertId,
        type: 'queued_alert',
        title: 'Job Alert (Queued)',
        message: 'Software Engineer position - received while offline',
        category: 'jobs'
      };

      const notification = await Notification.create(notificationData);

      expect(notification.type).toBe('queued_alert');
    });

    it('should handle multiple notifications for same user', async () => {
      await Notification.create({
        userId: validUserId,
        alertId: new mongoose.Types.ObjectId(),
        title: 'Alert 1',
        message: 'Message 1',
        category: 'jobs'
      });

      await Notification.create({
        userId: validUserId,
        alertId: new mongoose.Types.ObjectId(),
        title: 'Alert 2',
        message: 'Message 2',
        category: 'blood_donation'
      });

      const userNotifications = await Notification.find({ userId: validUserId });

      expect(userNotifications).toHaveLength(2);
    });
  });

  describe('Query operations', () => {
    beforeEach(async () => {
      // Create test notifications
      await Notification.create({
        userId: validUserId,
        alertId: validAlertId,
        title: 'Unread 1',
        message: 'Message 1',
        category: 'jobs',
        isRead: false
      });

      await Notification.create({
        userId: validUserId,
        alertId: new mongoose.Types.ObjectId(),
        title: 'Read 1',
        message: 'Message 2',
        category: 'jobs',
        isRead: true
      });

      await Notification.create({
        userId: new mongoose.Types.ObjectId(),
        alertId: validAlertId,
        title: 'Other User',
        message: 'Message 3',
        category: 'jobs'
      });
    });

    it('should find notifications by userId', async () => {
      const notifications = await Notification.find({ userId: validUserId });

      expect(notifications).toHaveLength(2);
    });

    it('should find unread notifications', async () => {
      const unreadNotifications = await Notification.find({
        userId: validUserId,
        isRead: false
      });

      expect(unreadNotifications).toHaveLength(1);
      expect(unreadNotifications[0].title).toBe('Unread 1');
    });

    it('should count unread notifications', async () => {
      const unreadCount = await Notification.countDocuments({
        userId: validUserId,
        isRead: false
      });

      expect(unreadCount).toBe(1);
    });

    it('should sort notifications by createdAt descending', async () => {
      const notifications = await Notification.find({ userId: validUserId })
        .sort({ createdAt: -1 });

      expect(notifications).toHaveLength(2);
      // Most recent first
      expect(notifications[0].createdAt.getTime())
        .toBeGreaterThanOrEqual(notifications[1].createdAt.getTime());
    });
  });

  describe('Update operations', () => {
    it('should mark notification as read', async () => {
      const notification = await Notification.create({
        userId: validUserId,
        alertId: validAlertId,
        title: 'Mark Read Test',
        message: 'Test message',
        category: 'jobs'
      });

      notification.isRead = true;
      await notification.save();

      const updated = await Notification.findById(notification._id);

      expect(updated.isRead).toBe(true);
    });

    it('should mark all user notifications as read', async () => {
      await Notification.create({
        userId: validUserId,
        alertId: validAlertId,
        title: 'Notification 1',
        message: 'Message 1',
        category: 'jobs'
      });

      await Notification.create({
        userId: validUserId,
        alertId: new mongoose.Types.ObjectId(),
        title: 'Notification 2',
        message: 'Message 2',
        category: 'jobs'
      });

      await Notification.updateMany(
        { userId: validUserId },
        { isRead: true }
      );

      const unreadCount = await Notification.countDocuments({
        userId: validUserId,
        isRead: false
      });

      expect(unreadCount).toBe(0);
    });

    it('should update timestamps on modification', async () => {
      const notification = await Notification.create({
        userId: validUserId,
        alertId: validAlertId,
        title: 'Timestamp Update',
        message: 'Test message',
        category: 'jobs'
      });

      const originalUpdatedAt = notification.updatedAt;

      await new Promise(resolve => setTimeout(resolve, 10));

      notification.isRead = true;
      await notification.save();

      expect(notification.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });
});
