import { z } from "zod";

export const contentDashboardQuerySchema = z.object({
    from_date: z.string().optional(),
    to_date: z.string().optional(),
});

export type contentDashboardQuery = z.infer<typeof contentDashboardQuerySchema>;