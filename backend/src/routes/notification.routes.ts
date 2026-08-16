import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { asyncHandler } from "../utils/async-handler.js";
import {
  getNotifications,
  readAllNotifications,
  readNotification,
} from "../controllers/notification.controller.js";

export const notificationRoutes = Router();

notificationRoutes.use(requireAuth);

notificationRoutes.get("/notifications", asyncHandler(getNotifications));
notificationRoutes.patch("/notifications/read-all", asyncHandler(readAllNotifications));
notificationRoutes.patch("/notifications/:id/read", asyncHandler(readNotification));
