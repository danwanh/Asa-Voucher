import type { Response } from "express";

export function sendSuccess<T>(res: Response, data: T, message = "OK", statusCode = 200) {
  res.status(statusCode).json({ success: true, data, message });
}

export function sendCreated<T>(res: Response, data: T, message = "Created") {
  sendSuccess(res, data, message, 201);
}

export function sendNoContent(res: Response) {
  res.status(204).send();
}

export const ok = sendSuccess;
export const created = sendCreated;
export const noContent = sendNoContent;
