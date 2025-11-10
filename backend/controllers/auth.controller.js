import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

// Duration for JWT cookie (7 days)
const maxAge = 1000 * 60 * 60 * 24 * 7;

// ---------------- REGISTER ----------------
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, interests, location, alertRadius  } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User with this email already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      interests,
      location,
      alertRadius
    });

    const savedUser = await newUser.save();

    // Exclude password from response
    const { password: _, ...userInfo } = savedUser._doc;

    res.status(201).json(userInfo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error registering user" });
  }
};

// ---------------- LOGIN ----------------
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found. Please register." });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Create token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET_KEY,
      { expiresIn: maxAge }
    );

    const { password: _, ...userInfo } = user._doc;

    res
      .cookie("token", token, {
        httpOnly: true,
        maxAge: maxAge,
        sameSite: process.env.COOKIE_SAME_SITE || "Lax",
        secure: process.env.NODE_ENV === "production",
      })
      .status(200)
      .json(userInfo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error logging in" });
  }
};

// ---------------- LOGOUT ----------------
export const logoutUser = (req, res) => {
  res.clearCookie("token").status(200).json({ message: "Logout successful" });
};
