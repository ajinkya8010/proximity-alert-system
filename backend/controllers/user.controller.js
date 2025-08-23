// controllers/userController.js
import User from "../models/User.js";

// POST: Save location
export const saveLocation = async (req, res) => {
  try {
    const { location } = req.body;
    if (!location) {
      return res.status(400).json({ message: "Location is required." });
    }

    let user = await User.findOne();
    if (!user) {
      user = new User({ location });
    } else {
      user.location = location;
    }

    await user.save();
    res.status(200).json({ message: "Location saved successfully.", location });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET: Get location
export const getLocation = async (req, res) => {
  try {
    const user = await User.findOne();
    res.status(200).json({ location: user?.location || "" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// POST: Save interests
export const saveInterests = async (req, res) => {
  try {
    const { interests } = req.body;
    if (!interests || !Array.isArray(interests)) {
      return res.status(400).json({ message: "Interests must be an array." });
    }

    let user = await User.findOne();
    if (!user) {
      user = new User({ interests });
    } else {
      user.interests = interests;
    }

    await user.save();
    res.status(200).json({ message: "Interests saved successfully.", interests });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// GET: Get interests
export const getInterests = async (req, res) => {
  try {
    const user = await User.findOne();
    res.status(200).json({ interests: user?.interests || [] });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
