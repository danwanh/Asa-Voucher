import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { HttpError } from "../utils/http-error.js";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (!(error instanceof HttpError) && !(error instanceof ZodError)) {
    console.error("Unhandled request error", error instanceof Error ? error.name : "UnknownError");
  }
  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Thông tin gửi lên chưa hợp lệ. Vui lòng kiểm tra lại.", details: error.flatten() }
    });
    return;
  }

  if (typeof error === "object" && error !== null && "type" in error && error.type === "entity.parse.failed") {
    res.status(400).json({
      success: false,
      error: { code: "INVALID_JSON", message: "Dữ liệu gửi lên không hợp lệ", details: [] }
    });
    return;
  }

  if (error instanceof HttpError) {
    res.status(error.statusCode).json({
      success: false,
      error: { code: error.code, message: error.message, details: error.details ?? [] }
    });
    return;
  }

  res.status(500).json({
    success: false,
    error: { code: "INTERNAL_SERVER_ERROR", message: "Đã xảy ra lỗi máy chủ. Vui lòng thử lại sau.", details: [] }
  });
};
