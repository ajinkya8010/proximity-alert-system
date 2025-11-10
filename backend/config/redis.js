import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

// Create Redis clients with TLS support for Upstash
const redisOptions = {
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  tls: process.env.REDIS_URL?.includes('upstash.io') ? {} : undefined,
};

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", redisOptions);
const redisPub = new Redis(process.env.REDIS_URL || "redis://localhost:6379", redisOptions);
const redisSub = new Redis(process.env.REDIS_URL || "redis://localhost:6379", redisOptions);

// Connection event handlers
redis.on("connect", () => {
  console.log("🔴 Redis connected successfully");
});

redis.on("error", (err) => {
  console.error("❌ Redis connection error:", err.message);
});

redis.on("ready", () => {
  console.log("✅ Redis is ready to accept commands");
});

redisPub.on("connect", () => {
  console.log("🔴 Redis publisher connected");
});

redisSub.on("connect", () => {
  console.log("🔴 Redis subscriber connected");
});

export { redis, redisPub, redisSub };