import type { Request, Response } from "express";
import { getHealthStatus } from "../services/health.service.js";

export async function healthCheck(_req: Request, res: Response) {
  res.json(await getHealthStatus());
}
