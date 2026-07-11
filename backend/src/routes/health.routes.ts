import { Router } from "express";
import { healthCheck } from "../controllers/health.controller.js";

export const healthRoutes = Router();

healthRoutes.get("/health", healthCheck);
