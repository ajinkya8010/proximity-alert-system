/**
 * Integration tests for Notification Controller
 * Tests notification retrieval, marking as read, and deletion endpoints
 */

import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import cookieParser from 'cookie-parser';
import { User } from '../../models/user.model.js';
import { Alert } from '../../models/alert.model.js';
import { Notification } from '../../models/notification.model.js';
import authRoute from '../../routes/auth.route.js';
import notificationRoute from '../../routes/notification.route.js';

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
  app.use('/api/notifications', notificationRoute);
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
  await Notification.deleteMany({});
});

describe('Notification Controller Integration Tests', () => {
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

  const anotherUserData = {
    name: 'Jane Smith',
    email: 'jane@example.com',
    password: 'password456',
    interests: ['tutoring'],
    location: {
      type: 'Point',
      coordinates: [77.6, 12.98]
    },
    alertRadius: 3000
  };

  // Helper function to register and login a user, returning auth cookie and user
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

  // Helper function to create an alert
  const createAlert = async (userId, overrides = {}) => {
    const alertData = {
      title: 'Test Alert',
      category: 'blood_donation',
      location: {
        type: 'Point',
        coordinates: [77.5946, 12.9716]
      },
      description: 'Test description',
      createdBy: userId,
      ...overrides
    };

    return await Alert.create(alertData);
  };

  // Helper function to create a notification
  const createNotification = async (userId, alertId, overrides = {}) => {
    const notificationData = {
      userId,
      alertId,
      type: 'new_alert',
      isRead: false,
      title: 'New Alert',
      message: 'A new alert has been posted',
      category: 'blood_donation',
      ...overrides
    };

    return await Notification.create(notificationData);
  };

  describe('GET /api/notifications', () => {
    describe('Authentication', () => {
      it('should reject request without authentication token', async () => {
        const response = await request(app)
          .get('/api/notifications')
          .expect(401);

        expect(response.body.message).toBe('Not Authenticated!');
      });

      it('should reject request with invalid token', async () => {
        const response = await request(app)
          .get('/api/notifications')
          .set('Cookie', ['token=invalid-token'])
          .expect(403);

        expect(response.body.message).toBe('Token is not Valid!');
      });

      it('should accept request with valid authentication token', async () => {
        const { cookies, user } = await registerAndLogin();

        const response = await request(app)
          .get('/api/notifications')
          .set('Cookie', cookies)
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe('Notification Retrieval', () => {
      it('should return empty array when user has no notifications', async () => {
        const { cookies } = await registerAndLogin();

        const response = await request(app)
          .get('/api/notifications')
          .set('Cookie', cookies)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.notifications).toEqual([]);
        expect(response.body.unreadCount).toBe(0);
      });

      it('should return user notifications with populated alert data', async () => {
        const { cookies, user } = await registerAndLogin();
        const alert = await createAlert(user._id);
        await createNotification(user._id, alert._id);

        const response = await request(app)
          .get('/api/notifications')
          .set('Cookie', cookies)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.notifications).toHaveLength(1);
        expect(response.body.notifications[0]).toHaveProperty('alertId');
        expect(response.body.notifications[0].alertId).toHaveProperty('title');
        expect(response.body.notifications[0].alertId).toHaveProperty('category');
        expect(response.body.notifications[0].alertId).toHaveProperty('createdBy');
      });

      it('should return notifications sorted by createdAt descending', async () => {
        const { cookies, user } = await registerAndLogin();
        const alert = await createAlert(user._id);

        // Create notifications with delays to ensure different timestamps
        const notif1 = await createNotification(user._id, alert._id, { title: 'First' });
        await new Promise(resolve => setTimeout(resolve, 10));
        const notif2 = await createNotification(user._id, alert._id, { title: 'Second' });
        await new Promise(resolve => setTimeout(resolve, 10));
        const notif3 = await createNotification(user._id, alert._id, { title: 'Third' });

        const response = await request(app)
          .get('/api/notifications')
          .set('Cookie', cookies)
          .expect(200);

        expect(response.body.notifications).toHaveLength(3);
        expect(response.body.notifications[0].title).toBe('Third');
        expect(response.body.notifications[1].title).toBe('Second');
        expect(response.body.notifications[2].title).toBe('First');
      });

      it('should only return notifications for authenticated user', async () => {
        const { cookies: cookies1, user: user1 } = await registerAndLogin();
        const { user: user2 } = await registerAndLogin(anotherUserData);

        const alert1 = await createAlert(user1._id);
        const alert2 = await createAlert(user2._id);

        await createNotification(user1._id, alert1._id, { title: 'User 1 Notification' });
        await createNotification(user2._id, alert2._id, { title: 'User 2 Notification' });

        const response = await request(app)
          .get('/api/notifications')
          .set('Cookie', cookies1)
          .expect(200);

        expect(response.body.notifications).toHaveLength(1);
        expect(response.body.notifications[0].title).toBe('User 1 Notification');
      });

      it('should filter out notifications where alert was deleted', async () => {
        const { cookies, user } = await registerAndLogin();
        const alert1 = await createAlert(user._id);
        const alert2 = await createAlert(user._id);

        await createNotification(user._id, alert1._id);
        await createNotification(user._id, alert2._id);

        // Delete one alert
        await Alert.findByIdAndDelete(alert1._id);

        const response = await request(app)
          .get('/api/notifications')
          .set('Cookie', cookies)
          .expect(200);

        expect(response.body.notifications).toHaveLength(1);
        expect(response.body.notifications[0].alertId._id.toString()).toBe(alert2._id.toString());
      });

      it('should return correct unread count', async () => {
        const { cookies, user } = await registerAndLogin();
        const alert = await createAlert(user._id);

        await createNotification(user._id, alert._id, { isRead: false });
        await createNotification(user._id, alert._id, { isRead: false });
        await createNotification(user._id, alert._id, { isRead: true });

        const response = await request(app)
          .get('/api/notifications')
          .set('Cookie', cookies)
          .expect(200);

        expect(response.body.unreadCount).toBe(2);
      });
    });

    describe('Pagination', () => {
      it('should paginate notifications with default values', async () => {
        const { cookies, user } = await registerAndLogin();
        const alert = await createAlert(user._id);

        // Create 5 notifications
        for (let i = 0; i < 5; i++) {
          await createNotification(user._id, alert._id);
        }

        const response = await request(app)
          .get('/api/notifications')
          .set('Cookie', cookies)
          .expect(200);

        expect(response.body.pagination.page).toBe(1);
        expect(response.body.pagination.limit).toBe(20);
        expect(response.body.notifications).toHaveLength(5);
      });

      it('should respect custom page and limit parameters', async () => {
        const { cookies, user } = await registerAndLogin();
        const alert = await createAlert(user._id);

        // Create 10 notifications
        for (let i = 0; i < 10; i++) {
          await createNotification(user._id, alert._id, { title: `Notification ${i}` });
          await new Promise(resolve => setTimeout(resolve, 5));
        }

        const response = await request(app)
          .get('/api/notifications?page=2&limit=3')
          .set('Cookie', cookies)
          .expect(200);

        expect(response.body.pagination.page).toBe(2);
        expect(response.body.pagination.limit).toBe(3);
        expect(response.body.notifications).toHaveLength(3);
      });

      it('should handle page beyond available data', async () => {
        const { cookies, user } = await registerAndLogin();
        const alert = await createAlert(user._id);

        await createNotification(user._id, alert._id);

        const response = await request(app)
          .get('/api/notifications?page=5&limit=10')
          .set('Cookie', cookies)
          .expect(200);

        expect(response.body.notifications).toHaveLength(0);
      });
    });
  });

  describe('GET /api/notifications/unread-count', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/notifications/unread-count')
        .expect(401);

      expect(response.body.message).toBe('Not Authenticated!');
    });

    it('should return zero when user has no notifications', async () => {
      const { cookies } = await registerAndLogin();

      const response = await request(app)
        .get('/api/notifications/unread-count')
        .set('Cookie', cookies)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.unreadCount).toBe(0);
    });

    it('should return correct unread count', async () => {
      const { cookies, user } = await registerAndLogin();
      const alert = await createAlert(user._id);

      await createNotification(user._id, alert._id, { isRead: false });
      await createNotification(user._id, alert._id, { isRead: false });
      await createNotification(user._id, alert._id, { isRead: false });
      await createNotification(user._id, alert._id, { isRead: true });

      const response = await request(app)
        .get('/api/notifications/unread-count')
        .set('Cookie', cookies)
        .expect(200);

      expect(response.body.unreadCount).toBe(3);
    });

    it('should only count unread notifications for authenticated user', async () => {
      const { cookies: cookies1, user: user1 } = await registerAndLogin();
      const { user: user2 } = await registerAndLogin(anotherUserData);

      const alert1 = await createAlert(user1._id);
      const alert2 = await createAlert(user2._id);

      await createNotification(user1._id, alert1._id, { isRead: false });
      await createNotification(user2._id, alert2._id, { isRead: false });
      await createNotification(user2._id, alert2._id, { isRead: false });

      const response = await request(app)
        .get('/api/notifications/unread-count')
        .set('Cookie', cookies1)
        .expect(200);

      expect(response.body.unreadCount).toBe(1);
    });
  });

  describe('PUT /api/notifications/:notificationId/read', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .put('/api/notifications/507f1f77bcf86cd799439011/read')
        .expect(401);

      expect(response.body.message).toBe('Not Authenticated!');
    });

    it('should mark notification as read successfully', async () => {
      const { cookies, user } = await registerAndLogin();
      const alert = await createAlert(user._id);
      const notification = await createNotification(user._id, alert._id, { isRead: false });

      const response = await request(app)
        .put(`/api/notifications/${notification._id}/read`)
        .set('Cookie', cookies)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Notification marked as read');

      // Verify in database
      const updatedNotification = await Notification.findById(notification._id);
      expect(updatedNotification.isRead).toBe(true);
    });

    it('should return 404 for non-existent notification', async () => {
      const { cookies } = await registerAndLogin();
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .put(`/api/notifications/${fakeId}/read`)
        .set('Cookie', cookies)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Notification not found');
    });

    it('should not allow marking another user notification as read', async () => {
      const { cookies: cookies1, user: user1 } = await registerAndLogin();
      const { user: user2 } = await registerAndLogin(anotherUserData);

      const alert = await createAlert(user2._id);
      const notification = await createNotification(user2._id, alert._id);

      const response = await request(app)
        .put(`/api/notifications/${notification._id}/read`)
        .set('Cookie', cookies1)
        .expect(404);

      expect(response.body.message).toBe('Notification not found');

      // Verify notification is still unread
      const unchangedNotification = await Notification.findById(notification._id);
      expect(unchangedNotification.isRead).toBe(false);
    });

    it('should handle already read notification', async () => {
      const { cookies, user } = await registerAndLogin();
      const alert = await createAlert(user._id);
      const notification = await createNotification(user._id, alert._id, { isRead: true });

      const response = await request(app)
        .put(`/api/notifications/${notification._id}/read`)
        .set('Cookie', cookies)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle invalid notification ID format', async () => {
      const { cookies } = await registerAndLogin();

      const response = await request(app)
        .put('/api/notifications/invalid-id/read')
        .set('Cookie', cookies)
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/notifications/mark-all-read', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .put('/api/notifications/mark-all-read')
        .expect(401);

      expect(response.body.message).toBe('Not Authenticated!');
    });

    it('should mark all unread notifications as read', async () => {
      const { cookies, user } = await registerAndLogin();
      const alert = await createAlert(user._id);

      await createNotification(user._id, alert._id, { isRead: false });
      await createNotification(user._id, alert._id, { isRead: false });
      await createNotification(user._id, alert._id, { isRead: false });

      const response = await request(app)
        .put('/api/notifications/mark-all-read')
        .set('Cookie', cookies)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('All notifications marked as read');

      // Verify in database
      const unreadCount = await Notification.countDocuments({ userId: user._id, isRead: false });
      expect(unreadCount).toBe(0);
    });

    it('should only mark notifications for authenticated user', async () => {
      const { cookies: cookies1, user: user1 } = await registerAndLogin();
      const { user: user2 } = await registerAndLogin(anotherUserData);

      const alert1 = await createAlert(user1._id);
      const alert2 = await createAlert(user2._id);

      await createNotification(user1._id, alert1._id, { isRead: false });
      await createNotification(user2._id, alert2._id, { isRead: false });

      await request(app)
        .put('/api/notifications/mark-all-read')
        .set('Cookie', cookies1)
        .expect(200);

      // User 1's notifications should be read
      const user1Unread = await Notification.countDocuments({ userId: user1._id, isRead: false });
      expect(user1Unread).toBe(0);

      // User 2's notifications should still be unread
      const user2Unread = await Notification.countDocuments({ userId: user2._id, isRead: false });
      expect(user2Unread).toBe(1);
    });

    it('should succeed even when user has no notifications', async () => {
      const { cookies } = await registerAndLogin();

      const response = await request(app)
        .put('/api/notifications/mark-all-read')
        .set('Cookie', cookies)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should not affect already read notifications', async () => {
      const { cookies, user } = await registerAndLogin();
      const alert = await createAlert(user._id);

      await createNotification(user._id, alert._id, { isRead: true });
      await createNotification(user._id, alert._id, { isRead: false });

      await request(app)
        .put('/api/notifications/mark-all-read')
        .set('Cookie', cookies)
        .expect(200);

      const allNotifications = await Notification.find({ userId: user._id });
      expect(allNotifications.every(n => n.isRead)).toBe(true);
    });
  });

  describe('DELETE /api/notifications/:notificationId', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .delete('/api/notifications/507f1f77bcf86cd799439011')
        .expect(401);

      expect(response.body.message).toBe('Not Authenticated!');
    });

    it('should delete notification successfully', async () => {
      const { cookies, user } = await registerAndLogin();
      const alert = await createAlert(user._id);
      const notification = await createNotification(user._id, alert._id);

      const response = await request(app)
        .delete(`/api/notifications/${notification._id}`)
        .set('Cookie', cookies)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Notification deleted');

      // Verify deletion in database
      const deletedNotification = await Notification.findById(notification._id);
      expect(deletedNotification).toBeNull();
    });

    it('should return 404 for non-existent notification', async () => {
      const { cookies } = await registerAndLogin();
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .delete(`/api/notifications/${fakeId}`)
        .set('Cookie', cookies)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Notification not found');
    });

    it('should not allow deleting another user notification', async () => {
      const { cookies: cookies1 } = await registerAndLogin();
      const { user: user2 } = await registerAndLogin(anotherUserData);

      const alert = await createAlert(user2._id);
      const notification = await createNotification(user2._id, alert._id);

      const response = await request(app)
        .delete(`/api/notifications/${notification._id}`)
        .set('Cookie', cookies1)
        .expect(404);

      expect(response.body.message).toBe('Notification not found');

      // Verify notification still exists
      const stillExists = await Notification.findById(notification._id);
      expect(stillExists).not.toBeNull();
    });

    it('should handle invalid notification ID format', async () => {
      const { cookies } = await registerAndLogin();

      const response = await request(app)
        .delete('/api/notifications/invalid-id')
        .set('Cookie', cookies)
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      const { cookies } = await registerAndLogin();

      // Close mongoose connection to simulate error
      await mongoose.connection.close();

      const response = await request(app)
        .get('/api/notifications')
        .set('Cookie', cookies);

      expect(response.body.success).toBe(false);

      // Reconnect for cleanup
      const mongoUri = mongoServer.getUri();
      await mongoose.connect(mongoUri);
    });

    it('should handle notifications with different types', async () => {
      const { cookies, user } = await registerAndLogin();
      const alert = await createAlert(user._id);

      await createNotification(user._id, alert._id, { type: 'new_alert' });
      await createNotification(user._id, alert._id, { type: 'queued_alert' });

      const response = await request(app)
        .get('/api/notifications')
        .set('Cookie', cookies)
        .expect(200);

      expect(response.body.notifications).toHaveLength(2);
    });

    it('should handle large pagination values', async () => {
      const { cookies, user } = await registerAndLogin();
      const alert = await createAlert(user._id);

      await createNotification(user._id, alert._id);

      const response = await request(app)
        .get('/api/notifications?page=1&limit=1000')
        .set('Cookie', cookies)
        .expect(200);

      expect(response.body.pagination.limit).toBe(1000);
    });
  });
});
