import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const DB_NAME = "proximity";
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}/${DB_NAME}`,
      {
        serverSelectionTimeoutMS: 5000
      }
    );

    console.log("✅ MongoDB connected");
  } catch (error) {
    console.log("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

export default connectDB;
