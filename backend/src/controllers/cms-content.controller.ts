import type { Request, Response } from "express";
import { sendSuccess, sendCreated, noContent } from "../utils/response.js";
import { HttpError } from "../utils/http-error.js";
import * as cmsContentService from "../services/cms-content.service.js";
import { idParamSchema } from "../validations/common.validation.js";
import {
  createCmsContentSchema,
  updateCmsContentSchema,
  listCmsContentQuerySchema,
  publicCmsContentQuerySchema,
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

export async function listPublicCmsContents(req: Request, res: Response) {
  const { type } = publicCmsContentQuerySchema.parse(req.query);
  const result = await cmsContentService.listPublicCmsContents(type);
  sendSuccess(res, result);
}

export async function getCmsContent(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  const result = await cmsContentService.getPublicCmsContentById(id);
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

export async function deleteCmsContent(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  await cmsContentService.deleteCmsContent(requireUser(req), id);
  noContent(res);
}

export async function createMediaSignature(_req: Request, res: Response) {
  const signature = await cmsContentService.createMediaSignature();
  sendSuccess(res, signature);
}