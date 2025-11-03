import { User } from "../models/user.model.js";
import { haversineDistance } from "../utils/distance.js";
import { redisSub, redis } from "../config/redis.js";

class AlertDistributionService {
  constructor() {
    this.io = null;
    this.onlineUsers = null;
  }

  // Initialize the service with io and onlineUsers references
  initialize(io, onlineUsers) {
    this.io = io;
    this.onlineUsers = onlineUsers;
    console.log("🔧 Alert distribution service initialized");
  }

  // Set up Redis subscriber to listen for new alerts
  async setupSubscriber() {
    try {
      await redisSub.subscribe("alerts_channel");
      console.log("📡 Subscribed to alerts_channel for distribution");

      redisSub.on("message", async (channel, message) => {
        if (channel === "alerts_channel") {
          try {
            const { alertId, alert } = JSON.parse(message);
            console.log(`📨 Received alert from Redis for distribution: ${alertId}`);
            await this.distributeAlert(alert);
          } catch (error) {
            console.error("❌ Error processing alert message:", error);
          }
        }
      });
    } catch (error) {
      console.error("❌ Error setting up Redis subscriber:", error);
    }
  }

  // Main alert distribution logic
  async distributeAlert(alert) {
    try {
      console.log(`📡 Distributing alert via Redis: ${alert._id}`);

      // 1. Find all users who have this category in interests
      const interestedUsers = await User.find({
        interests: alert.category,
        location: {
          $near: {
            $geometry: alert.location,
            $maxDistance: 10000, // hard cap at 10km for performance
          },
        },
      }).select("_id location alertRadius");

      console.log(`🔍 Found ${interestedUsers.length} users interested in ${alert.category} (via Redis)`);

      // 2. Filter them by their personal radius and send to all their connections
      for (const user of interestedUsers) {
        const distance = haversineDistance(alert.location.coordinates, user.location.coordinates);
        console.log(`📏 User ${user._id}: distance=${distance}m, alertRadius=${user.alertRadius}m (via Redis)`);

        if (distance <= user.alertRadius) {
          // Get all socket connections for this user
          const userSockets = this.onlineUsers?.get(user._id.toString());
          console.log(`🔌 User ${user._id} sockets:`, userSockets ? userSockets.size : 0, "(via Redis)");
          
          if (userSockets && userSockets.size > 0) {
            // Send alert to all user's active connections (multiple tabs)
            userSockets.forEach(socketId => {
              this.io.to(socketId).emit("new_alert", alert);
            });
            console.log(`📤 Sent alert to user ${user._id} (${userSockets.size} connections) via Redis`);
          } else {
            // User is offline - queue the alert for later delivery
            await this.queueAlertForOfflineUser(user._id, alert._id);
            console.log(`📥 Queued alert ${alert._id} for offline user ${user._id}`);
          }
        } else {
          console.log(`❌ User ${user._id} outside radius: ${distance}m > ${user.alertRadius}m (Redis)`);
        }
      }

      console.log(`✅ Alert distribution completed via Redis: ${alert._id}`);
    } catch (error) {
      console.error("❌ Error in alert distribution:", error);
    }
  }

  // Queue alert for offline user
  async queueAlertForOfflineUser(userId, alertId) {
    try {
      const queueKey = `user:${userId}:alerts`;
      
      // Add alert ID to user's queue (LPUSH adds to front of list)
      await redis.lpush(queueKey, alertId);
      
      // Set TTL for the queue (7 days = 604800 seconds)
      await redis.expire(queueKey, 7 * 24 * 60 * 60);
      
      console.log(`📥 Alert ${alertId} queued for user ${userId} (TTL: 7 days)`);
    } catch (error) {
      console.error(`❌ Error queueing alert for user ${userId}:`, error);
    }
  }

  // Get queued alerts for user (when they come online)
  async getQueuedAlertsForUser(userId) {
    try {
      const queueKey = `user:${userId}:alerts`;
      
      // Get all alert IDs from user's queue
      const alertIds = await redis.lrange(queueKey, 0, -1);
      
      if (alertIds.length === 0) {
        return [];
      }

      // Filter out invalid ObjectIds and fetch full alert details from MongoDB
      const { Alert } = await import("../models/alert.model.js");
      const mongoose = await import("mongoose");
      
      // Filter valid ObjectIds only
      const validAlertIds = alertIds.filter(id => mongoose.default.Types.ObjectId.isValid(id));
      
      if (validAlertIds.length === 0) {
        // Clear invalid queue
        await redis.del(queueKey);
        console.log(`🗑️ Cleared invalid alert queue for user ${userId}`);
        return [];
      }

      const alerts = await Alert.find({
        _id: { $in: validAlertIds }
      }).populate('createdBy', 'name').sort({ createdAt: -1 });

      // Clear the queue after fetching
      await redis.del(queueKey);
      
      console.log(`📬 Retrieved ${alerts.length} queued alerts for user ${userId}`);
      return alerts;
    } catch (error) {
      console.error(`❌ Error getting queued alerts for user ${userId}:`, error);
      return [];
    }
  }
}

// Export singleton instance
export default new AlertDistributionService();