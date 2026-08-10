import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { HttpError } from "../utils/http-error.js";

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  const errorRecord = error instanceof Error ? error : new Error("UnknownError");
  const statusCode = error instanceof HttpError ? error.statusCode : error instanceof ZodError ? 400 : 500;
  console.error(JSON.stringify({
    event: "http.error",
    method: req.method,
    path: req.originalUrl,
    statusCode,
    error: {
      name: errorRecord.name,
      message: errorRecord.message,
      stack: errorRecord.stack,
      code: error instanceof HttpError ? error.code : undefined,
      details: error instanceof HttpError ? error.details : error instanceof ZodError ? error.flatten() : undefined,
    },
  }));
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
