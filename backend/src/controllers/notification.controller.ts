import type { Request, Response } from "express";
import { sendSuccess } from "../utils/response.js";
import { HttpError } from "../utils/http-error.js";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../services/notification.service.js";
import { listNotificationsQuerySchema } from "../validations/notification.validation.js";

function requireUser(req: Request) {
  if (!req.user) throw new HttpError(401, "Authentication required");
  return req.user;
}

export async function getNotifications(req: Request, res: Response) {
  const query = listNotificationsQuerySchema.parse(req.query);
  const user = requireUser(req);
  const result = await listNotifications(user.id, query);
  sendSuccess(res, result);
}

export async function readAllNotifications(req: Request, res: Response) {
  const user = requireUser(req);
  await markAllNotificationsRead(user.id);
  sendSuccess(res, null, "Đã đánh dấu tất cả thông báo là đã đọc");
}

export async function readNotification(req: Request, res: Response) {
  const user = requireUser(req);
  const updated = await markNotificationRead(user.id, req.params.id);
  if (updated.count === 0) throw new HttpError(404, "Không tìm thấy thông báo");
  sendSuccess(res, null, "Đã đánh dấu thông báo là đã đọc");
}
