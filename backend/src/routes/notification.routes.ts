import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  getNotifications,
  readAllNotifications,
  readNotification,
} from "../controllers/notification.controller.js";

export const notificationRoutes = Router();

notificationRoutes.get("/notifications", requireAuth, asyncHandler(getNotifications));
notificationRoutes.patch("/notifications/read-all", requireAuth, asyncHandler(readAllNotifications));
notificationRoutes.patch("/notifications/:id/read", requireAuth, asyncHandler(readNotification));
