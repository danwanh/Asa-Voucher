import type { Request, Response } from "express";
import { sendCreated, sendSuccess } from "../utils/response.js";
import { HttpError } from "../utils/http-error.js";
import * as reviewService from "../services/review.service.js";
import {
  createReviewResponseSchema,
  createReviewSchema,
  listReviewsQuerySchema,
  updateReviewSchema,
} from "../validations/review.validation.js";

function requireUser(req: Request) {
  if (!req.user) throw new HttpError(401, "Authentication required");
  return req.user;
}

export async function listPublicReviews(req: Request, res: Response) {
  const query = listReviewsQuerySchema.parse(req.query);
  const result = await reviewService.listPublicReviews(req.params.id, query);
  sendSuccess(res, result);
}

export async function getReview(req: Request, res: Response) {
  const review = await reviewService.getReviewById(req.user, req.params.id);
  sendSuccess(res, review);
}

export async function createReview(req: Request, res: Response) {
  const input = createReviewSchema.parse(req.body);
  const review = await reviewService.createReview(requireUser(req), input);
  sendCreated(res, review, "Tạo đánh giá thành công");
}

export async function updateReview(req: Request, res: Response) {
  const input = updateReviewSchema.parse(req.body);
  const review = await reviewService.updateReview(requireUser(req), req.params.id, input);
  sendSuccess(res, review, "Cập nhật đánh giá thành công");
}

export async function hideReview(req: Request, res: Response) {
  const review = await reviewService.hideReview(requireUser(req), req.params.id);
  sendSuccess(res, review, "Đã ẩn đánh giá");
}

export async function listReviewResponses(req: Request, res: Response) {
  const responses = await reviewService.listReviewResponses(req.params.id);
  sendSuccess(res, responses);
}

export async function createReviewResponse(req: Request, res: Response) {
  const input = createReviewResponseSchema.parse(req.body);
  const response = await reviewService.createReviewResponse(requireUser(req), req.params.id, input);
  sendCreated(res, response, "Đã gửi phản hồi");
}
