import type { Request, Response } from "express";
import { sendSuccess, sendCreated } from "../utils/response.js";
import { HttpError } from "../utils/http-error.js";
import * as cmsContentService from "../services/cms-content.service.js";
import {
  createCmsContentSchema,
  updateCmsContentSchema,
  listCmsContentQuerySchema,
} from "../validations/cms-content.validation.js";

function requireUser(req: Request) {
  if (!req.user) throw new HttpError(401, "Authentication required");
  return req.user;
}

export async function listCmsContents(req: Request, res: Response) {
  const query = listCmsContentQuerySchema.parse(req.query);
  const result = await cmsContentService.listCmsContents(query);
  sendSuccess(res, result);
}

export async function createCmsContent(req: Request, res: Response) {
  const input = createCmsContentSchema.parse(req.body);
  const result = await cmsContentService.createCmsContent(requireUser(req), input);
  sendCreated(res, result, "Tạo nội dung thành công");
}

export async function updateCmsContent(req: Request, res: Response) {
  const input = updateCmsContentSchema.parse(req.body);
  const result = await cmsContentService.updateCmsContent(requireUser(req), req.params.id, input);
  sendSuccess(res, result, "Cập nhật nội dung thành công");
}

export async function toggleCmsContentStatus(req: Request, res: Response) {
  const result = await cmsContentService.toggleCmsContentStatus(requireUser(req), req.params.id);
  sendSuccess(res, result, "Đổi trạng thái nội dung thành công");
}