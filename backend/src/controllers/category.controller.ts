import type { Request, Response } from "express";
import * as categoryService from "../services/category.service.js";
import { created, noContent, ok } from "../utils/response.js";

export async function listCategories(_req: Request, res: Response) {
  ok(res, await categoryService.listCategories());
}

export async function createCategory(req: Request, res: Response) {
  created(res, await categoryService.createCategory(req.body), "Category created");
}

export async function getCategory(req: Request, res: Response) {
  ok(res, await categoryService.getCategory(req.params.id));
}

export async function updateCategory(req: Request, res: Response) {
  ok(res, await categoryService.updateCategory(req.params.id, req.body), "Category updated");
}

export async function deleteCategory(req: Request, res: Response) {
  await categoryService.deleteCategory(req.params.id);
  noContent(res);
}
