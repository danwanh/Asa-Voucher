import { z } from "zod";

export const createCategorySchema = z.object({
  parent_id: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  description: z.string().nullable().optional(),
  sort_order: z.number().int().optional()
});

export const updateCategorySchema = createCategorySchema.partial();
