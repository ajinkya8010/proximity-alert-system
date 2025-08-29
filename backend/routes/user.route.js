import express from "express";
import {
  saveLocation,
  getLocation,
  saveInterests,
  getInterests,
} from "../controllers/user.controller.js";

const router = express.Router();

// Location Routes
router.post("/location", saveLocation);
router.get("/location", getLocation);

// Interest Routes
router.post("/interests", saveInterests);
router.get("/interests", getInterests);

export default router;