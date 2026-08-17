import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env.js";
import { HttpError } from "./http-error.js";

export function createCloudinarySignature(folder: string) {
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    throw new HttpError(503, "Upload ảnh hiện chưa được cấu hình");
  }

  const timestamp = Math.floor(Date.now() / 1000);
  cloudinary.config({ cloud_name: env.CLOUDINARY_CLOUD_NAME, api_key: env.CLOUDINARY_API_KEY, api_secret: env.CLOUDINARY_API_SECRET });
  const signature = cloudinary.utils.api_sign_request({ folder, timestamp }, env.CLOUDINARY_API_SECRET);
  return { cloud_name: env.CLOUDINARY_CLOUD_NAME, api_key: env.CLOUDINARY_API_KEY, timestamp, folder, signature };
}