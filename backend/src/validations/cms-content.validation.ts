import { z } from "zod";

const contentTypeEnum = z.enum(["category", "banner", "article", "popup", "policy"]);
const statusEnum = z.enum(["active", "hidden"]);

export const createCmsContentSchema = z.object({
  content_type: contentTypeEnum,
  title: z.string().trim().min(1, "Tiêu đề không được để trống").max(255),
  content: z.string().nullable().optional(),
  image_url: z.string().url("Định dạng URL không hợp lệ").nullable().optional(),
  display_time: z.string().datetime().nullable().optional(),
  status: statusEnum.default("active"),
  sort_order: z.number().int().min(0).default(0),
});

export const updateCmsContentSchema = createCmsContentSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "Cần ít nhất 1 trường để cập nhật" }
);

export const listCmsContentQuerySchema = z.object({
  content_type: contentTypeEnum.optional(),
  status: statusEnum.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateCmsContentInput = z.infer<typeof createCmsContentSchema>;
export type UpdateCmsContentInput = z.infer<typeof updateCmsContentSchema>;
export type ListCmsContentQuery = z.infer<typeof listCmsContentQuerySchema>;