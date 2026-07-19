import { db, requireData, throwDbError } from "../utils/db.js";
import { HttpError } from "../utils/http-error.js";

export async function listCategories() {
  const { data, error } = await db().from("categories").select("*").order("sort_order", { ascending: true }).order("name", { ascending: true });
  if (error) throwDbError(error);
  return data ?? [];
}

export async function createCategory(input: Record<string, unknown>) {
  const { data, error } = await db().from("categories").insert(input).select("*").single();
  if (error) throwDbError(error);
  return data;
}

export async function getCategory(id: string) {
  const { data, error } = await db().from("categories").select("*").eq("id", id).single();
  return requireData<Record<string, unknown>>(data, error, "Category not found");
}

export async function updateCategory(id: string, input: Record<string, unknown>) {
  const { data, error } = await db().from("categories").update(input).eq("id", id).select("*").single();
  if (error) throwDbError(error);
  return data;
}

export async function deleteCategory(id: string) {
  const { count, error: countError } = await db().from("voucher_products").select("id", { count: "exact", head: true }).eq("category_id", id);
  if (countError) throwDbError(countError);
  if ((count ?? 0) > 0) {
    throw new HttpError(409, "Category is used by voucher products", "CATEGORY_IN_USE");
  }

  const { error } = await db().from("categories").delete().eq("id", id);
  if (error) throwDbError(error);
}
