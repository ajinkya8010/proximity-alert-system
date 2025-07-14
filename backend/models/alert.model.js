import mongoose from "mongoose";

const alertSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      required: true,
      enum: [
        "blood_donation",
        "jobs",
        "tutoring",
        "lost_and_found",
        "urgent_help",
        "food_giveaway",
        "disaster_alert"
      ]
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
    },
    description: {
      type: String,
      default: ""
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  {
    timestamps: true
  }
);

alertSchema.index({ location: "2dsphere" });

export const Alert = mongoose.model("Alert", alertSchema);
