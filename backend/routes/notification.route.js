import express from "express";
import { verifyToken } from "../middlewares/verifyToken.js";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification
} from "../controllers/notification.controller.js";

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// GET /notifications - Get user's notifications with pagination
router.get("/", getNotifications);

// GET /notifications/unread-count - Get unread count only
router.get("/unread-count", getUnreadCount);

// PUT /notifications/:notificationId/read - Mark specific notification as read
router.put("/:notificationId/read", markAsRead);

// PUT /notifications/mark-all-read - Mark all notifications as read
router.put("/mark-all-read", markAllAsRead);

// DELETE /notifications/:notificationId - Delete specific notification
router.delete("/:notificationId", deleteNotification);

export default router;