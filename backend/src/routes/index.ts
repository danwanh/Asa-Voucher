import { Router } from "express";
import { authRoutes } from "./auth.routes.js";
import { categoryRoutes } from "./category.routes.js";
import { commerceRoutes } from "./commerce.routes.js";
import { healthRoutes } from "./health.routes.js";
import { partnerRoutes } from "./partner.routes.js";
import { userRoutes } from "./user.routes.js";
import { voucherRoutes } from "./voucher.routes.js";

export const apiRoutes = Router();

apiRoutes.use(healthRoutes);
apiRoutes.use(authRoutes);
apiRoutes.use(userRoutes);
apiRoutes.use(partnerRoutes);
apiRoutes.use(categoryRoutes);
apiRoutes.use(voucherRoutes);
apiRoutes.use(commerceRoutes);
