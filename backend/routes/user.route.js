// routes/userRoutes.js
import express from "express";
import {
  saveLocation,
  getLocation,
  saveInterests,
  getInterests,
} from "../controllers/userController.js";

import { validateLocation, validateInterests } from "../middleware/validateRequest.js";

const router = express.Router();

// Location Routes
router.post("/location", validateLocation, saveLocation);
router.get("/location", getLocation);

// Interest Routes
router.post("/interests", validateInterests, saveInterests);
router.get("/interests", getInterests);

export default router;
