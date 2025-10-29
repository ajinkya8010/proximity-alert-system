import { Alert } from "../models/alert.model.js";
import { User } from "../models/user.model.js";
import { haversineDistance } from "../utils/distance.js";

// ---------------- CREATE ALERT ----------------
export const createAlert = async (req, res) => {
  try {
    const { title, category, description, location } = req.body;
    const userId = req.userId;

    // ---------------- VALIDATION ----------------
    if (!title) return res.status(400).json({ message: "Title is required" });
    if (!category) return res.status(400).json({ message: "Category is required" });
    if (!description) return res.status(400).json({ message: "Description is required" });
    if (!location || !location.coordinates || location.coordinates.length !== 2) {
      return res.status(400).json({ message: "Valid location (longitude, latitude) is required" });
    }

    // ---------------- DB SAVE ----------------
    const newAlert = await Alert.create({
      title,
      category,
      description,
      location,
      createdBy: userId,
    });

    // ---------------- SOCKET EMISSION ----------------
    const io = req.app.get("io");

    // 1. Find all users who have this category in interests
    const interestedUsers = await User.find({
      interests: category,
      location: {
        $near: {
          $geometry: location,
          $maxDistance: 10000, // hard cap at 10km for performance
        },
      },
    }).select("_id location alertRadius");

    // 2. Filter them by their personal radius
    for (const user of interestedUsers) {
      const distance = haversineDistance(location.coordinates, user.location.coordinates);

      if (distance <= user.alertRadius) {
        // You need to map users -> socket IDs somewhere (like onlineUsers Map)
        const socketId = req.app.get("onlineUsers")?.get(user._id.toString());
        if (socketId) {
          io.to(socketId).emit("new_alert", newAlert);
        }
      }
    }

    console.log("📢 Emitted alert:", newAlert._id);

    res.status(201).json({
      message: "Alert created successfully",
      alert: newAlert,
    });

  } catch (err) {
    console.error("❌ Error in createAlert:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ---------------- GET ALL ALERTS ----------------
export const getAllAlerts = async (req, res) => {
  try {
    // ✅ TODO 1: Fetch all alerts from DB
    // ✅ TODO 2: Sort by createdAt (latest first)
    const alerts = await Alert.find().sort({ createdAt: -1 });

    // ✅ TODO 3: Return list of alerts
    res.status(200).json({ alerts });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ---------------- GET ALERTS NEAR ME ----------------
export const getAlertsNearMe = async (req, res) => {
  try {
    // ✅ 1. Get userId from auth middleware
    const userId = req.userId;

    // ✅ 2. Fetch user's location + radius
    const user = await User.findById(userId).select("location alertRadius");
    if (!user || !user.location) {
      return res.status(404).json({ message: "User location not found" });
    }

    // ✅ 3. Use user's preferred alertRadius (fallback to default if not set)
    const radius = user.alertRadius || 3000; // default = 3km

    // ✅ 4. Run geospatial query on alerts
    const alerts = await Alert.find({
      location: {
        $near: {
          $geometry: user.location,
          $maxDistance: radius, // <-- user-defined
        },
      },
    }).sort({ createdAt: -1 });

    // ✅ 5. Return nearby alerts
    res.status(200).json({ alerts, radius });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


// ---------------- GET ALERTS BY CATEGORY ----------------
export const getAlertsByCategory = async (req, res) => {
  try {
    // ✅ TODO 1: Extract { category } from req.params
    const { category } = req.params;

    // ✅ TODO 2: Validate category
    if (!category) {
      return res.status(400).json({ message: "Category is required" });
    }

    // ✅ TODO 3: Find alerts matching category
    const alerts = await Alert.find({ category }).sort({ createdAt: -1 });

    // ✅ TODO 4: Return alerts
    res.status(200).json({ alerts });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ---------------- GET ALERTS NEARBY BY CATEGORY ----------------
export const getAlertsNearbyByCategory = async (req, res) => {
  try {
    const userId = req.userId;
    const { categories } = req.body; // expecting an array, e.g. ["jobs", "tutoring"]

    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Validate limit (max 50 per page)
    const validLimit = Math.min(limit, 50);

    // ✅ Check categories format
    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({ message: "Categories must be a non-empty array." });
    }

    // ✅ Fixed set of valid categories
    const validCategories = [
      "blood_donation",
      "jobs",
      "tutoring",
      "lost_and_found",
      "urgent_help",
      "food_giveaway",
      "disaster_alert"
    ];

    // ✅ Filter only valid categories
    const filteredCategories = categories.filter((c) =>
      validCategories.includes(c)
    );
    if (filteredCategories.length === 0) {
      return res.status(400).json({ message: "No valid categories provided." });
    }

    // ✅ Get user location + radius
    const user = await User.findById(userId).select("location alertRadius");
    if (!user || !user.location) {
      return res.status(404).json({ message: "User location not found" });
    }

    // Build query using $geoWithin instead of $near for pagination compatibility
    const radiusInRadians = (user.alertRadius || 5000) / 6378100; // Convert meters to radians (Earth radius = 6378100m)
    
    const query = {
      category: { $in: filteredCategories },
      location: {
        $geoWithin: {
          $centerSphere: [user.location.coordinates, radiusInRadians]
        }
      }
    };

    // ✅ Query alerts nearby that match any of the categories with pagination
    const alerts = await Alert.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(validLimit)
      .populate('createdBy', 'name');

    // Get total count for pagination info
    const total = await Alert.countDocuments(query);
    const totalPages = Math.ceil(total / validLimit);

    res.status(200).json({ 
      alerts,
      pagination: {
        page,
        limit: validLimit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (err) {
    console.error("❌ Error in getAlertsNearbyByCategory:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


// ---------------- GET MY ALERTS ----------------
export const getMyAlerts = async (req, res) => {
  try {
    const userId = req.userId;

    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Validate limit (max 50 per page)
    const validLimit = Math.min(limit, 50);

    // Build query for user's alerts
    const query = { createdBy: userId };

    // Get user's alerts with pagination
    const alerts = await Alert.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(validLimit)
      .populate('createdBy', 'name');

    // Get total count for pagination info
    const total = await Alert.countDocuments(query);
    const totalPages = Math.ceil(total / validLimit);

    res.status(200).json({
      alerts,
      pagination: {
        page,
        limit: validLimit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (err) {
    console.error("❌ Error in getMyAlerts:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ---------------- DELETE ALERT ----------------
export const deleteAlert = async (req, res) => {
  try {
    // ✅ TODO 1: Extract { id } from req.params
    const { id } = req.params;

    // ✅ TODO 2: Find alert by ID
    const alert = await Alert.findById(id);

    // ✅ TODO 3: Check if alert exists
    if (!alert) {
      return res.status(404).json({ message: "Alert not found" });
    }

    // ✅ TODO 4: Check if logged-in user is owner
    if (alert.createdBy.toString() !== req.userId) {
      return res.status(403).json({ message: "Unauthorized to delete this alert" });
    }

    // ✅ TODO 5: Delete alert
    await Alert.findByIdAndDelete(id);

    // ✅ TODO 6: Return success message
    res.status(200).json({ message: "Alert deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
