import { Alert } from "../models/alert.model.js";
import { User } from "../models/user.model.js";

// ---------------- CREATE ALERT ----------------
export const createAlert = async (req, res) => {
  try {
    // ✅ TODO 1: Extract { title, category, description, location } from req.body
    const { title, category, description, location } = req.body;

    // ✅ TODO 2: Get userId from req.userId (set by auth middleware)
    const userId = req.userId;

    // ✅ TODO 3: Validate required fields
    if (!title || !category || !description || !location) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // ✅ TODO 4: Create new alert in DB
    const newAlert = await Alert.create({
      title,
      category,
      description,
      location,
      user: userId,
    });

    // ✅ TODO 5: Return created alert in response
    res.status(201).json({ message: "Alert created successfully", alert: newAlert });
  } catch (err) {
    console.error(err);
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
    // ✅ TODO 1: Get userId from req.userId
    const userId = req.userId;

    // ✅ TODO 2: Fetch user's location from DB
    const user = await User.findById(userId);
    if (!user || !user.location) {
      return res.status(404).json({ message: "User location not found" });
    }

    // ✅ TODO 3: Run geospatial query on alerts using user’s location
    const alerts = await Alert.find({
      location: {
        $near: {
          $geometry: user.location,
          $maxDistance: 5000, // 5 km radius (adjustable)
        },
      },
    });

    // ✅ TODO 4: Return nearby alerts
    res.status(200).json({ alerts });
  } catch (err) {
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
    // ✅ TODO 1: Extract { category } from req.params
    const { category } = req.params;

    // ✅ TODO 2: Get userId from req.userId
    const userId = req.userId;

    // ✅ TODO 3: Fetch user's location from DB
    const user = await User.findById(userId);
    if (!user || !user.location) {
      return res.status(404).json({ message: "User location not found" });
    }

    // ✅ TODO 4: Validate category
    if (!category) {
      return res.status(400).json({ message: "Category is required" });
    }

    // ✅ TODO 5: Run geospatial query on alerts matching category + nearby location
    const alerts = await Alert.find({
      category,
      location: {
        $near: {
          $geometry: user.location,
          $maxDistance: 5000, // 5 km radius
        },
      },
    });

    // ✅ TODO 6: Return filtered alerts
    res.status(200).json({ alerts });
  } catch (err) {
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
    if (alert.user.toString() !== req.userId) {
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
