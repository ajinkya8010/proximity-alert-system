import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true
    },
    password: {
      type: String,
      required: true
    },
    interests: {
      type: [String],
      default: []
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true
      }
    }
  },
  {
    timestamps: true
  }
);

// Create a 2dsphere index for geospatial queries
userSchema.index({ location: "2dsphere" });

export const User = mongoose.model("User", userSchema);
