import { Router } from "express";
import { healthRoutes } from "./health.routes.js";
import { voucherRoutes } from "./voucher.routes.js";

export const apiRoutes = Router();

apiRoutes.use(healthRoutes);
apiRoutes.use(voucherRoutes);
