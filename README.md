# Proximity-Based Real-Time Alert System

A MERN stack project that sends real-time location-based alerts to users based on their interests. Built using Node.js, Express, MongoDB, Socket.IO, and more.

## Folders
- `/backend`: Express API + MongoDB + Socket.IO
- `/frontend`: React frontend
- .gitignore
-  README.md

---

## 🚀 Features

- 🔐 JWT-based Authentication
- 📍 User Interest & Location Setup
- 🧠 Event Matching via MongoDB 2dsphere Geo Queries
- 🔔 Real-time Push Notifications (Socket.IO)
- ✍️ Event Posting System
- ⚙️ Scalable Architecture (Redis, BullMQ – later phase)

---

## 📦 Tech Stack

| Layer     | Tech                               |
|-----------|------------------------------------|
| Frontend  | React, Vite                        |
| Backend   | Node.js, Express.js                |
| Realtime  | Socket.IO                          |
| Database  | MongoDB Atlas + Geo Indexes        |
| Auth      | JWT + Bcrypt                       |
| Queue     | BullMQ + Redis *(optional, later)* |
| DevOps    | Render / Railway / Upstash Redis   |


## ⚙️ Getting Started

Follow these steps to set up and run the project locally on your machine:

---

### 📥 1. Clone the Repository

```bash
git clone https://github.com/ajinkya8010/proximity-alert-system.git
cd proximity-alert-system
```

### 🧠 2. Backend Setup (Node.js + Express)
```bash
cd backend
# Install backend dependencies
npm install
# Start the backend server in development mode
npm run dev
```
🛠️ Make sure to update .env with your MongoDB URI and JWT secret.


### 💻 3. Frontend Setup (React + Vite)
```bash
cd ../frontend
# Install frontend dependencies
npm install
# Start the frontend development server
npm run dev
```

💡 The frontend will run on http://localhost:5173 and will be configured to proxy API requests to the backend (http://localhost:5000).
✅ Local Development URLs

Backend API → http://localhost:5000
Frontend UI → http://localhost:5173