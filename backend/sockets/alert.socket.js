const alertSocketHandler = (io, socket, onlineUsers) => {
  console.log(`⚡ User connected: ${socket.id}`);

  socket.on("register_user", (userId) => {
    console.log(`✅ Registered user ${userId} with socket ${socket.id}`);
    onlineUsers.set(userId, socket.id);
  });

  socket.on("disconnect", () => {
    console.log(`❌ User disconnected: ${socket.id}`);
    for (let [userId, sId] of onlineUsers.entries()) {
      if (sId === socket.id) {
        onlineUsers.delete(userId);
        break;
      }
    }
  });
};

export default alertSocketHandler;
