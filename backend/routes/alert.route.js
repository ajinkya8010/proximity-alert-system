import express from "express";
import {
  createAlert,
  getAllAlerts,
  getAlertsNearMe,
  getAlertsByCategory,
  getAlertsNearbyByCategory,
  getMyAlerts,
  deleteAlert,
} from "../controllers/alert.controller.js";
import { verifyToken } from "../middlewares/verifyToken.js"; 

const router = express.Router();


router.post("/", verifyToken, createAlert);
router.get("/", getAllAlerts);
router.get("/near", verifyToken, getAlertsNearMe);
router.get("/category/:category", getAlertsByCategory);
router.post("/near-by-category", verifyToken, getAlertsNearbyByCategory);
router.get("/my-alerts", verifyToken, getMyAlerts);
router.delete("/:id", verifyToken, deleteAlert);

export default router;
