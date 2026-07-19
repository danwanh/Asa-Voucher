import { z } from "zod";

export const idParamSchema = z.object({ id: z.string().uuid() });
export const partnerIdParamSchema = z.object({ partnerId: z.string().uuid() });
export const orderIdParamSchema = z.object({ orderId: z.string().uuid() });
export const imageIdParamSchema = z.object({ imageId: z.string().uuid() });
export const branchMappingParamSchema = z.object({ id: z.string().uuid(), branchId: z.string().uuid() });

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  sort: z.string().trim().optional()
});

export function rangeFromPagination(page: number, limit: number) {
  const from = (page - 1) * limit;
  return { from, to: from + limit - 1 };
}
