import { Router } from "express";
import { requireAuth } from "../middlewares/auth.js";
import { optionalAuth } from "../middlewares/optional-auth.js";
import { asyncHandler } from "../utils/async-handler.js";
import * as reviewController from "../controllers/review.controller.js";

export const reviewRoutes = Router();

reviewRoutes.get(
  "/voucher-products/:id/reviews",
  asyncHandler(reviewController.listPublicReviews),
);
reviewRoutes.post("/reviews/media/signature", requireAuth, asyncHandler(reviewController.createMediaSignature));

reviewRoutes.post("/reviews", requireAuth, asyncHandler(reviewController.createReview));
reviewRoutes.get("/reviews/:id", optionalAuth, asyncHandler(reviewController.getReview));
reviewRoutes.patch("/reviews/:id", requireAuth, asyncHandler(reviewController.updateReview));
reviewRoutes.delete("/reviews/:id", requireAuth, asyncHandler(reviewController.hideReview));

reviewRoutes.get("/reviews/:id/responses", asyncHandler(reviewController.listReviewResponses));
reviewRoutes.post(
  "/reviews/:id/responses",
  requireAuth,
  asyncHandler(reviewController.createReviewResponse),
);
