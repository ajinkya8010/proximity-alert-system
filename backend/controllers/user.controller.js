import { User } from "../models/user.model.js";

// ---------------- SAVE LOCATION ----------------
export const saveLocation = async (req, res) => {
  try {
    const userId = req.userId; // from auth middleware
    const { coordinates } = req.body; // expecting [longitude, latitude]

    if (
      !coordinates ||
      !Array.isArray(coordinates) ||
      coordinates.length !== 2
    ) {
      return res
        .status(400)
        .json({ message: "Location must be [longitude, latitude]." });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    user.location = {
      type: "Point",
      coordinates,
    };

    await user.save();

    res.status(200).json({
      message: "Location saved successfully.",
      location: user.location,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ---------------- GET LOCATION ----------------
export const getLocation = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId).select("location");
    if (!user) return res.status(404).json({ message: "User not found." });

    res.status(200).json({ location: user.location });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


// ---------------- ADD OR UPDATE INTERESTS ----------------
export const saveInterests = async (req, res) => {
  try {
    const userId = req.userId;
    const { interests } = req.body;

    if (!interests || !Array.isArray(interests)) {
      return res.status(400).json({ message: "Interests must be an array." });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    // Merge old + new interests and remove duplicates
    const updatedInterests = Array.from(
      new Set([...user.interests, ...interests])
    );

    user.interests = updatedInterests;

    await user.save();

    res.status(200).json({
      message: "Interests updated successfully.",
      interests: user.interests,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


// ---------------- GET INTERESTS ----------------
export const getInterests = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId).select("interests");
    if (!user) return res.status(404).json({ message: "User not found." });

    res.status(200).json({ interests: user.interests });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
