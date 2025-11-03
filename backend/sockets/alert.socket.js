const alertSocketHandler = (io, socket, onlineUsers) => {
  console.log(`⚡ User connected: ${socket.id}`);

  socket.on("register_user", async (userId) => {
    console.log(`✅ Registered user ${userId} with socket ${socket.id}`);
    
    // Initialize user's socket set if it doesn't exist
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    
    // Add this socket to the user's socket set
    onlineUsers.get(userId).add(socket.id);
    
    console.log(`👥 User ${userId} now has ${onlineUsers.get(userId).size} active connections`);

    // Check for queued alerts (offline notifications)
    try {
      const { default: alertDistributionService } = await import("../services/alertDistributionService.js");
      const queuedAlerts = await alertDistributionService.getQueuedAlertsForUser(userId);
      
      if (queuedAlerts.length > 0) {
        console.log(`� Sending $ {queuedAlerts.length} queued alerts to user ${userId}`);
        
        // Send each queued alert to the user
        queuedAlerts.forEach(alert => {
          socket.emit("new_alert", alert);
        });
        
        // Send a summary notification
        socket.emit("queued_alerts_delivered", {
          count: queuedAlerts.length,
          message: `You received ${queuedAlerts.length} alerts while you were away`
        });
      }
    } catch (error) {
      console.error("❌ Error delivering queued alerts:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log(`❌ User disconnected: ${socket.id}`);
    
    // Find and remove this socket from all users
    for (let [userId, socketSet] of onlineUsers.entries()) {
      if (socketSet.has(socket.id)) {
        socketSet.delete(socket.id);
        console.log(`👥 User ${userId} now has ${socketSet.size} active connections`);
        
        // If user has no more connections, remove them entirely
        if (socketSet.size === 0) {
          onlineUsers.delete(userId);
          console.log(`🚪 User ${userId} completely disconnected`);
        }
        break;
      }
    }
  });
};

export default alertSocketHandler;
