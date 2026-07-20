import { prisma } from "../config/prisma.js";
import { requireData, throwDbError } from "../utils/db.js";
import { HttpError } from "../utils/http-error.js";

export async function listCategories() {
  return prisma.category.findMany({ orderBy: [{ sort_order: "asc" }, { name: "asc" }] });
}

export async function createCategory(input: Record<string, unknown>) {
  try {
    return await prisma.category.create({ data: input as never });
  } catch (error) {
    throwDbError(error);
  }
}

export async function getCategory(id: string) {
  return requireData(await prisma.category.findUnique({ where: { id } }), "Category not found");
}

export async function updateCategory(id: string, input: Record<string, unknown>) {
  try {
    return await prisma.category.update({ where: { id }, data: input as never });
  } catch (error) {
    throwDbError(error, "Category not found");
  }
}

export async function deleteCategory(id: string) {
  const count = await prisma.voucherProduct.count({ where: { category_id: id } });
  if (count > 0) {
    throw new HttpError(409, "Category is used by voucher products", "CATEGORY_IN_USE");
  }

  try {
    await prisma.category.delete({ where: { id } });
  } catch (error) {
    throwDbError(error, "Category not found");
  }
}
