import { User } from "../models/user.model.js";
import { haversineDistance } from "../utils/distance.js";
import { redisSub } from "../config/redis.js";

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
            console.log(`⚠️ User ${user._id} is offline - will queue for later (Redis)`);
            // TODO: Queue for offline users in Step 5
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
}

// Export singleton instance
export default new AlertDistributionService();