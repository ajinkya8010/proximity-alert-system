// models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  location: {
    type: String,
    required: true
  },
  interests: {
    type: [String],
    default: []
  }
});

const User = mongoose.model("User", userSchema);

export default User;
