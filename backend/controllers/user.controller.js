import { User } from "../models/user.model.js";

// ---------------- UPDATE PROFILE ----------------
export const updateProfile = async (req, res) => {
  try {
    const userId = req.userId; // from auth middleware
    const { name, location, alertRadius, interests } = req.body;

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Validate and update name
    if (name !== undefined) {
      if (!name || name.trim().length === 0) {
        return res.status(400).json({ message: "Name cannot be empty" });
      }
      user.name = name.trim();
    }

    // Validate and update location
    if (location !== undefined) {
      if (location.coordinates && Array.isArray(location.coordinates) && location.coordinates.length === 2) {
        const [lng, lat] = location.coordinates;
        if (typeof lng === 'number' && typeof lat === 'number' && 
            lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90) {
          user.location = {
            type: "Point",
            coordinates: location.coordinates
          };
        } else {
          return res.status(400).json({ message: "Invalid location coordinates" });
        }
      } else if (location !== null) {
        return res.status(400).json({ message: "Location must have valid coordinates [longitude, latitude]" });
      }
    }

    // Validate and update alert radius
    if (alertRadius !== undefined) {
      const radius = parseInt(alertRadius);
      if (isNaN(radius) || radius < 500 || radius > 10000) {
        return res.status(400).json({ message: "Alert radius must be between 500m and 10km" });
      }
      user.alertRadius = radius;
    }

    // Validate and update interests
    if (interests !== undefined) {
      if (!Array.isArray(interests)) {
        return res.status(400).json({ message: "Interests must be an array" });
      }

      // Valid interest categories (matching alert categories)
      const validInterests = [
        "blood_donation",
        "jobs", 
        "tutoring",
        "lost_and_found",
        "urgent_help",
        "food_giveaway",
        "disaster_alert"
      ];

      // Filter only valid interests
      const filteredInterests = interests.filter(interest => 
        validInterests.includes(interest)
      );

      user.interests = filteredInterests;
    }

    // Save the updated user
    await user.save();

    // Return updated user data (excluding password)
    const updatedUser = await User.findById(userId).select("-password");

    res.status(200).json({
      message: "Profile updated successfully",
      user: updatedUser
    });

  } catch (err) {
    console.error("❌ Error in updateProfile:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
