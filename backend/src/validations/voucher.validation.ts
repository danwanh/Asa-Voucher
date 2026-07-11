import { z } from "zod";

export const validateVoucherCodeSchema = z.object({
  code: z.string().trim().min(3),
  branchId: z.string().uuid()
});
