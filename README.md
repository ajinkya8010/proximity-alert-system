# 🚨 Proximity Alert System

A real-time location-aware alerting platform that delivers instant notifications about nearby events, emergencies, and services based on user interests and geographic proximity.

## 🎯 Key Features

- **Real-time Notifications** - WebSocket-powered instant alerts
- **Geospatial Querying** - MongoDB 2dsphere indexing for location-based searches
- **Offline Alert Queuing** - Redis-based message queuing with 7-day TTL
- **Scalable Architecture** - Redis pub/sub for horizontal scaling
- **JWT Authentication** - Secure user sessions with httpOnly cookies
- **Interest-based Filtering** - Personalized alerts by category preferences
- **Multi-device Support** - Cross-platform real-time synchronization

## 🏗️ Architecture

```
Frontend (React + Vite) ←→ Backend (Node.js + Express) ←→ MongoDB
                ↓                        ↓
        Socket.IO Client ←→ Socket.IO Server ←→ Redis Pub/Sub
                                        ↓
                              Alert Distribution Service
```

## �️ Tech Stack

### Frontend

- **React 18** - Component-based UI
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first styling
- **Socket.IO Client** - Real-time communication
- **React Router** - Client-side routing
- **Context API** - State management

### Backend

- **Node.js + Express** - Server framework
- **MongoDB + Mongoose** - Database with geospatial support
- **Redis + ioredis** - Caching and message queuing
- **Socket.IO** - WebSocket server
- **JWT** - Authentication tokens
- **bcrypt** - Password hashing

### Infrastructure

- **MongoDB Atlas** - Cloud database
- **Redis Cloud/Upstash** - Managed Redis
- **Render/Railway** - Deployment platform

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Redis (local or cloud)

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/proximity-alert-system.git
cd proximity-alert-system

# Backend setup
cd backend
npm install
cp .env.example .env
# Configure environment variables
npm start

# Frontend setup (new terminal)
cd frontend
npm install
cp .env.example .env
# Configure API URL
npm run dev
```

### Environment Variables

**Backend (.env):**

```bash
MONGODB_URI=mongodb://localhost:27017/proximity-alerts
REDIS_URL=redis://localhost:6379
JWT_SECRET_KEY=your-secret-key
FRONTEND_URL=http://localhost:5173
PORT=3001
```

**Frontend (.env):**

```bash
VITE_API_BASE_URL=http://localhost:3001/api
```

## 📡 Core Features

### 1. Real-time Alert Distribution

- **Pub/Sub Architecture**: Redis channels for scalable message distribution
- **Online Detection**: Socket connection tracking for immediate delivery
- **Offline Queuing**: Automatic alert queuing for disconnected users

### 2. Geospatial Intelligence

- **Location-based Filtering**: Haversine distance calculations
- **Custom Radius**: User-defined alert proximity (1-10km)
- **MongoDB Geospatial**: Optimized $near queries with 2dsphere indexing

### 3. Smart Notification System

- **Interest Categories**: Emergency, Traffic, Jobs, Community, etc.
- **Multi-connection Support**: Multiple browser tabs/devices per user
- **Delivery Guarantees**: No alerts lost due to connectivity issues

## 🔧 API Endpoints

### Authentication

```
POST /api/auth/register    # User registration
POST /api/auth/login       # User login
POST /api/auth/logout      # User logout
```

### Alerts

```
GET    /api/alerts                    # Get all alerts
POST   /api/alerts                    # Create new alert
GET    /api/alerts/near-me            # Get nearby alerts
POST   /api/alerts/near-by-category   # Get filtered nearby alerts
GET    /api/alerts/my-alerts          # Get user's alerts
DELETE /api/alerts/:id                # Delete alert
```

### Notifications

```
GET /api/notifications              # Get user notifications
GET /api/notifications/unread-count # Get unread count
PUT /api/notifications/:id/read     # Mark as read
PUT /api/notifications/mark-all-read # Mark all as read
```

## 🔄 Real-time Flow

### Alert Creation & Distribution

1. User creates alert → Saved to MongoDB
2. Alert published to Redis `alerts_channel`
3. Distribution service receives alert
4. Find interested users within radius
5. **Online users**: Instant Socket.IO delivery
6. **Offline users**: Queue in Redis with TTL

### User Reconnection

1. User connects → Socket registration
2. Check Redis queue for user
3. Deliver all queued alerts
4. Send summary notification
5. Clear user's queue

## 📊 Database Schema

### User Model

```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  interests: [String],           // Alert categories
  location: {
    type: "Point",
    coordinates: [lng, lat]      // GeoJSON format
  },
  alertRadius: Number            // Meters (default: 3000)
}
```

### Alert Model

```javascript
{
  title: String,
  category: String,              // emergency, traffic, jobs, etc.
  description: String,
  location: {
    type: "Point",
    coordinates: [lng, lat]
  },
  createdBy: ObjectId,
  createdAt: Date
}
```

## 🔴 Redis Architecture

### Three Client Pattern

- **General Client**: Queue operations (LPUSH, LRANGE, DEL)
- **Publisher**: Alert distribution (PUBLISH)
- **Subscriber**: Alert reception (SUBSCRIBE)

### Queue Structure

```
Key: user:{userId}:alerts
Value: [alertId1, alertId2, alertId3]
TTL: 7 days (604800 seconds)
```

## 🚀 Deployment

### Production Environment Variables

```bash
# Backend
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
REDIS_URL=rediss://...
JWT_SECRET_KEY=production-secret
FRONTEND_URL=https://your-app.com

# Frontend
VITE_API_BASE_URL=https://api.your-app.com/api
```
https://proximity-alert-system-1.onrender.com/


## 📈 Performance Features

- **Connection Pooling**: Optimized database connections
- **Redis Caching**: Fast data retrieval
- **Geospatial Indexing**: Efficient location queries
- **Lazy Loading**: On-demand data fetching
- **WebSocket Optimization**: Minimal payload sizes

## 🔒 Security

- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: bcrypt with salt rounds
- **CORS Protection**: Cross-origin request filtering
- **Input Validation**: Mongoose schema validation
- **Rate Limiting**: API request throttling
- **HTTPS Enforcement**: TLS encryption in production

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request


## 🎯 Use Cases

- **Emergency Alerts**: Natural disasters, safety warnings
- **Traffic Updates**: Road closures, accidents, construction
- **Community Events**: Local gatherings, announcements
- **Job Opportunities**: Location-based employment alerts
- **Blood Donation**: Urgent medical requests
- **Lost & Found**: Missing persons, pets, items

---

**Built with ❤️ using the MERN stack + Redis + Socket.IO**
