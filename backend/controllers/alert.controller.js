import { Alert } from "../models/alert.model.js";
import { User } from "../models/user.model.js";

// ---------------- CREATE ALERT ----------------
export const createAlert = async (req, res) => {
  try {
    // ✅ TODO 1: Extract { title, category, description, location } from req.body
    // ✅ TODO 2: Get userId from req.userId (set by auth middleware)
    // ✅ TODO 3: Validate required fields
    // ✅ TODO 4: Create new alert in DB
    // ✅ TODO 5: Return created alert in response
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
    // ✅ TODO 3: Return list of alerts
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ---------------- GET ALERTS NEAR ME ----------------
export const getAlertsNearMe = async (req, res) => {
  try {
    // ✅ TODO 1: Get userId from req.userId
    // ✅ TODO 2: Fetch user's location from DB
    // ✅ TODO 3: Run geospatial query on alerts using user’s location
    // ✅ TODO 4: Return nearby alerts
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ---------------- GET ALERTS BY CATEGORY ----------------
export const getAlertsByCategory = async (req, res) => {
  try {
    // ✅ TODO 1: Extract { category } from req.params
    // ✅ TODO 2: Validate category
    // ✅ TODO 3: Find alerts matching category
    // ✅ TODO 4: Return alerts
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ---------------- GET ALERTS NEARBY BY CATEGORY ----------------
export const getAlertsNearbyByCategory = async (req, res) => {
  try {
    // ✅ TODO 1: Extract { category } from req.params
    // ✅ TODO 2: Get userId from req.userId
    // ✅ TODO 3: Fetch user's location from DB
    // ✅ TODO 4: Validate category
    // ✅ TODO 5: Run geospatial query on alerts matching category + nearby location
    // ✅ TODO 6: Return filtered alerts
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ---------------- DELETE ALERT ----------------
export const deleteAlert = async (req, res) => {
  try {
    // ✅ TODO 1: Extract { id } from req.params
    // ✅ TODO 2: Find alert by ID
    // ✅ TODO 3: Check if alert exists
    // ✅ TODO 4: Check if logged-in user is owner
    // ✅ TODO 5: Delete alert
    // ✅ TODO 6: Return success message
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
