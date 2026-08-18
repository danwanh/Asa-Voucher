import { Router } from "express";
import { authRoutes } from "./auth.routes.js";
import { categoryRoutes } from "./category.routes.js";
import { commerceRoutes } from "./commerce.routes.js";
import { healthRoutes } from "./health.routes.js";
import { partnerRoutes } from "./partner.routes.js";
import { userRoutes } from "./user.routes.js";
import { voucherRoutes } from "./voucher.routes.js";
import { issuedVoucherRoutes } from "./issued-voucher.routes.js";
import { reviewRoutes } from "./review.routes.js";
import { complaintRoutes } from "./complaint.routes.js";
import { logRoutes } from "./log.routes.js";
import { reportRoutes } from "./report.routes.js";
import {dashboardRoutes} from "./dashboard.routes.js"
import { securityRoutes } from "./security.routes.js";
import { cmsContentRoutes } from "./cms-content.routes.js";

export const apiRoutes = Router();

apiRoutes.use(healthRoutes);
apiRoutes.use(authRoutes);
apiRoutes.use(userRoutes);
apiRoutes.use(partnerRoutes);
apiRoutes.use(categoryRoutes);
apiRoutes.use(voucherRoutes);
apiRoutes.use(commerceRoutes);
apiRoutes.use(issuedVoucherRoutes);
apiRoutes.use(reviewRoutes);
apiRoutes.use(complaintRoutes);
apiRoutes.use(logRoutes);
apiRoutes.use(reportRoutes);
apiRoutes.use(dashboardRoutes);
apiRoutes.use(cmsContentRoutes);
apiRoutes.use(securityRoutes);