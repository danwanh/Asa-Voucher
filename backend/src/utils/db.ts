import { Prisma } from "@prisma/client";
import { HttpError } from "./http-error.js";

export function throwDbError(error: unknown, fallback = "Lỗi hệ thống"): never {
  if (!error) {
    throw new HttpError(500, fallback, "DATABASE_ERROR");
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    const target = (error.meta?.target as string[]) || [];
    if (target.includes("email")) {
      throw new HttpError(409, "Email đã tồn tại trong hệ thống", "CONFLICT");
    }
    if (target.includes("phone")) {
      throw new HttpError(409, "Số điện thoại đã tồn tại trong hệ thống", "CONFLICT");
    }
    if (target.includes("tax_number")) {
      throw new HttpError(409, "Mã số thuế đã tồn tại trong hệ thống", "DUPLICATE_TAX_NUMBER");
    }
    throw new HttpError(409, `Dữ liệu trùng lặp: ${target.join(", ") || "không xác định"}`, "CONFLICT");
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
    throw new HttpError(404, fallback, "NOT_FOUND");
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    throw new HttpError(503, "Hệ thống dữ liệu tạm thời không khả dụng. Vui lòng thử lại sau.", "DATABASE_UNAVAILABLE");
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    throw new HttpError(500, "Dữ liệu gửi lên không phù hợp với hệ thống.", "DATABASE_VALIDATION_ERROR");
  }

  throw new HttpError(500, fallback, "DATABASE_ERROR");
}

export function requireData<T>(data: T | null | undefined, message = "Not found") {
  if (!data) {
    throw new HttpError(404, message, "NOT_FOUND");
  }

  return data;
}

export function sanitizeUser<T extends Record<string, unknown>>(user: T) {
  const safeUser = { ...user };
  delete safeUser.password_hash;
  return safeUser;
}
