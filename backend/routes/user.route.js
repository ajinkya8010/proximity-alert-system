import express from "express";
import { updateProfile } from "../controllers/user.controller.js";
import { verifyToken } from "../middlewares/verifyToken.js";

const router = express.Router();

// Profile Routes
router.patch("/update", verifyToken, updateProfile);

export default router;