import { z } from "zod";

export const contentDashboardQuerySchema = z.object({
    from_date: z.string().optional(),
    to_date: z.string().optional(),
    all_time: z.enum(["true", "false"]).optional().transform((value) => value === "true"),
});

export type contentDashboardQuery = z.infer<typeof contentDashboardQuerySchema>;
