import express from "express";
import {
  createAlert,
  getAllAlerts,
  getAlertsNearMe,
  getAlertsByCategory,
  getAlertsNearbyByCategory,
  deleteAlert,
} from "../controllers/alert.controller.js";
import { verifyToken } from "../middlewares/verifyToken.js"; 

const router = express.Router();


router.post("/", verifyToken, createAlert);
router.get("/", getAllAlerts);
router.get("/near", verifyToken, getAlertsNearMe);
router.get("/category/:category", getAlertsByCategory);
router.get("/near-by-category", verifyToken, getAlertsNearbyByCategory);
router.delete("/:id", verifyToken, deleteAlert);

export default router;
