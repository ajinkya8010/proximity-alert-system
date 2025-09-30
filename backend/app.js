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


dotenv.config({ path: "./.env" });


const app = express();
const server = http.createServer(app); 
const PORT = process.env.PORT || 3001;


// ---------------- SOCKET.IO SETUP ----------------
const io = new Server(server, {
  cors: {
    origin: "*", // in production replace with frontend URL
    methods: ["GET", "POST"],
  },
});


// Attach io to app so controllers can use it
app.set("io", io);


// ---------------- MIDDLEWARE ----------------
app.use(
  cors({
    origin: "*",
    credentials: false,
  })
);
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
connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.log("❌ MongoDB connection failed:", err);
  });
