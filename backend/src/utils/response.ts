import type { Response } from "express";

export function ok(res: Response, data: unknown, message = "OK") {
  res.json({ success: true, data, message });
}

export function created(res: Response, data: unknown, message = "Created") {
  res.status(201).json({ success: true, data, message });
}

export function noContent(res: Response) {
  res.status(204).send();
}
