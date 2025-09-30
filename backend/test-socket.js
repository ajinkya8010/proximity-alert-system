// test-socket.js
import { io } from "socket.io-client";

const socket = io("http://localhost:3001");

socket.on("connect", () => {
  console.log("✅ Connected with ID:", socket.id);

  // test subscribing to categories
  socket.emit("subscribe_categories", ["jobs", "tutoring"]);
});

socket.on("disconnect", () => {
  console.log("❌ Disconnected");
});

socket.on("new_alert", (alert) => {
  console.log("🚨 New Alert Received:", alert);
});