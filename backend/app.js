import express from "express";
import http from "http"; 
import { Server } from "socket.io";
import connectDB from "./mongoose/connection.js";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";

import authRoute from "./routes/auth.route.js";
import userRoute from "./routes/user.route.js";
import alertRoute from "./routes/alert.route.js"; 
import alertSocketHandler from "./sockets/alert.socket.js";
import { redis } from "./config/redis.js"; 


dotenv.config({ path: "./.env" });


const app = express();
const server = http.createServer(app); 
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";


// ---------------- SOCKET.IO SETUP ----------------
const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
});


// Attach io and redis to app so controllers can use them
app.set("io", io);
app.set("redis", redis);


// ---------------- MIDDLEWARE ----------------
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());


// ---------------- ROUTES ----------------
app.use("/api/auth", authRoute);
app.use("/api/user", userRoute);
app.use("/api/alerts", alertRoute);


// ---------------- SOCKET HANDLERS ----------------
const onlineUsers = new Map();
app.set("onlineUsers", onlineUsers);

io.on("connection", (socket) => {
  console.log("⚡ User connected:", socket.id);

  // pass onlineUsers into handler
  alertSocketHandler(io, socket, onlineUsers);
});


// ---------------- START SERVER ----------------
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    console.log("✅ MongoDB connected");

    // Connect to Redis
    await redis.connect();
    console.log("✅ Redis connected");

    // Start HTTP server
    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Server startup failed:", err);
    process.exit(1);
  }
};

startServer();
